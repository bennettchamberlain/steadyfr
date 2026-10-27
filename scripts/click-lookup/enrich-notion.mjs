#!/usr/bin/env node
// Enrich Notion leads that have a gclid with the keyword / campaign / ad group /
// geography of the ad click that produced them — automating the gclid -> keyword
// lookup across the whole leads database.
//
// Every website-form lead and anonymous tap row already stores its gclid (the
// "Gclid" column). This script finds rows that have a gclid but haven't been
// enriched yet, looks each one up via the Google Ads `click_view` resource, and
// writes the result back onto the row. It targets the click_view query at the
// row's own date (then scans a few days back) so it stays within the ~90-day
// window cheaply — a couple of API ops per row.
//
// Writes into these columns if they exist, else folds the value into Notes (so
// you don't have to pre-create columns, but adding them gives structured data):
//   Keyword, Match type, Campaign, Ad group, Ad network, Click location
// Notes always gets a one-line "Ad click → ..." summary, which also marks the
// row as enriched so re-runs skip it.
//
// Safe by default: DRY RUN unless you pass --send. No npm dependencies.
// Needs NOTION_TOKEN + the GOOGLE_ADS_* credentials in scripts/meta-capi/.env.local.
//
// Usage:
//   node scripts/click-lookup/enrich-notion.mjs                 # dry run, 25 rows
//   node scripts/click-lookup/enrich-notion.mjs --send          # actually write
//   node scripts/click-lookup/enrich-notion.mjs --limit 100 --send
//   node scripts/click-lookup/enrich-notion.mjs --days 30 --send # wider date scan
//   node scripts/click-lookup/enrich-notion.mjs --database <id>

import {
  loadSharedEnv,
  getAdsCredentials,
  makeContext,
  findClick,
  resolveGeoNames,
  flattenClick,
  dateWindow,
} from './googleAds.mjs'

loadSharedEnv()

const NOTION_VERSION = '2022-06-28'
const DEFAULT_DATABASE_ID = process.env.NOTION_DATABASE_ID?.trim() || '3f101274-8342-804a-b00a-d041a2867b1b'
const ENRICH_MARKER = 'Ad click →' // presence in Notes means already enriched

// Columns we try to set; each drops to a Notes line if the column is missing.
const OPTIONAL_COLUMNS = ['Keyword', 'Match type', 'Campaign', 'Ad group', 'Ad network', 'Click location']

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) args[key] = true
    else args[key] = argv[++i]
  }
  return args
}

function fail(msg) {
  console.error(`\nError: ${msg}\n`)
  process.exit(1)
}

const richText = (s) => ({rich_text: [{text: {content: String(s).slice(0, 1900)}}]})

function plainText(prop) {
  const arr = prop?.rich_text || prop?.title
  if (!Array.isArray(arr)) return ''
  return arr.map((r) => r.plain_text || '').join('').trim()
}

// Pull a usable raw gclid from the row. The Gclid column holds either a raw
// gclid or a "gbraid=… wbraid=…" fallback; only a raw gclid works with
// click_view. Also look inside Notes for a "gclid=…" token as a backstop.
function extractGclid(gclidProp, notes) {
  const g = plainText(gclidProp)
  if (g && !g.includes('=') && !/\s/.test(g)) return g
  for (const src of [g, notes]) {
    const m = /gclid=([^\s]+)/i.exec(src || '')
    if (m) return m[1]
  }
  return '' // gbraid/wbraid-only or none — click_view can't resolve it
}

async function notionFetch(path, token, init = {}) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  return {ok: res.ok, status: res.status, data}
}

// Page the database for rows whose Gclid column is not empty.
async function* iterateGclidRows(databaseId, token) {
  let cursor
  do {
    const body = {
      filter: {property: 'Gclid', rich_text: {is_not_empty: true}},
      page_size: 100,
      ...(cursor ? {start_cursor: cursor} : {}),
    }
    const {ok, status, data} = await notionFetch(`/databases/${databaseId}/query`, token, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    if (!ok) {
      if (/Could not find property/i.test(data?.message || '')) {
        fail(`the database has no "Gclid" column — nothing to enrich. (${data.message})`)
      }
      fail(`Notion query failed (${status}): ${data?.message || JSON.stringify(data).slice(0, 300)}`)
    }
    for (const page of data.results || []) yield page
    cursor = data.has_more ? data.next_cursor : undefined
  } while (cursor)
}

// PATCH a page, retrying when a column doesn't exist: drop it and retry (the
// value is already in the Notes summary, so nothing is lost).
async function patchPage(pageId, token, properties) {
  let props = {...properties}
  let guard = 0
  while (true) {
    const {ok, status, data} = await notionFetch(`/pages/${pageId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({properties: props}),
    })
    if (ok) return {ok: true}
    const missing = /^(.+?) is not a property that exists/i.exec(data?.message || '')?.[1]?.trim()
    if (status === 400 && missing && missing in props && guard++ < OPTIONAL_COLUMNS.length) {
      delete props[missing]
      continue
    }
    return {ok: false, error: data?.message || `Notion PATCH failed (${status})`}
  }
}

function summaryLine(flat, date) {
  const bits = [
    `keyword "${flat.keyword || 'n/a'}"${flat.matchType ? ` [${flat.matchType}]` : ''}`,
    flat.campaign + (flat.adGroup ? ` / ${flat.adGroup}` : ''),
    flat.network,
    flat.device,
    flat.location,
  ].filter(Boolean)
  return `${ENRICH_MARKER} ${bits.join(' · ')} (click_view ${date})`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const send = Boolean(args.send)
  const limit = Math.max(1, Number(args.limit) || 25)
  const days = Math.max(1, Number(args.days) || 14)
  const databaseId = (typeof args.database === 'string' ? args.database : DEFAULT_DATABASE_ID).trim()

  const token = process.env.NOTION_TOKEN?.trim()
  if (!token) fail('NOTION_TOKEN is not set (scripts/meta-capi/.env.local).')

  const cred = getAdsCredentials()
  if (!cred.ok) {
    fail(
      `missing Google Ads credentials: ${cred.missing.join(', ')}\n` +
        'See scripts/click-lookup/README.md.',
    )
  }
  const ctx = await makeContext(cred.creds)

  console.log(`\n${send ? 'ENRICHING' : 'DRY RUN'} — database ${databaseId}, up to ${limit} row(s), ${days}-day scan.\n`)

  let scanned = 0
  let enriched = 0
  let skippedDone = 0
  let skippedNoGclid = 0
  let notFound = 0

  for await (const page of iterateGclidRows(databaseId, token)) {
    if (enriched >= limit) break
    scanned++
    const props = page.properties || {}
    const name = plainText(props.Name) || page.id
    const notes = plainText(props.Notes)

    // Already enriched?
    if (plainText(props.Keyword) || notes.includes(ENRICH_MARKER)) {
      skippedDone++
      continue
    }

    const gclid = extractGclid(props.Gclid, notes)
    if (!gclid) {
      skippedNoGclid++
      continue
    }

    // Scan from the row's own date (best guess at the click date) backwards.
    const start = props.Date?.date?.start ? new Date(props.Date.date.start) : new Date()
    const found = await findClick(ctx, gclid, dateWindow(days, start))
    if (!found) {
      notFound++
      console.log(`  · ${name}: no click found (older than ~90d, or different account)`)
      continue
    }

    const geo = await resolveGeoNames(ctx, [
      found.row.clickView?.locationOfPresence?.mostSpecific,
      found.row.clickView?.areaOfInterest?.mostSpecific,
    ])
    const flat = flattenClick(found.row, geo)
    const line = summaryLine(flat, found.date)

    const properties = {
      Notes: richText(notes ? `${notes}\n${line}` : line),
      Keyword: richText(flat.keyword),
      'Match type': richText(flat.matchType),
      Campaign: richText(flat.campaign),
      'Ad group': richText(flat.adGroup),
      'Ad network': richText(flat.network),
      'Click location': richText(flat.location),
    }

    if (!send) {
      console.log(`  [dry] ${name}: ${line}`)
      enriched++
      continue
    }

    const result = await patchPage(page.id, token, properties)
    if (result.ok) {
      console.log(`  ✓ ${name}: ${line}`)
      enriched++
    } else {
      console.log(`  ✗ ${name}: ${result.error}`)
    }
  }

  console.log(
    `\nDone. ${enriched} ${send ? 'enriched' : 'to enrich'}, ${skippedDone} already done, ` +
      `${skippedNoGclid} no usable gclid, ${notFound} not found (scanned ${scanned}).`,
  )
  if (!send && enriched > 0) console.log('Re-run with --send to write these to Notion.\n')
}

main().catch((e) => fail(e?.message || String(e)))
