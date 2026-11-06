#!/usr/bin/env node
// Sync Meta + Google ad performance into two Notion databases:
//
//   "Steady - Ads"       one row per ad (lifetime totals + the Notion leads it produced)
//   "Steady - Ad Weeks"  one row per week per platform (Meta / Google / All)
//
// Spend, clicks and platform-reported leads come from the ad platforms
// (read-only). "Real leads", jobs won and revenue come from the
// "Steady - Offline Conversions" DB, matched to ads via the Source / Campaign
// column the website stamps on every lead (utm_content = ad name for Meta,
// ad id for Google). Both tables are built from the same daily pull, so the
// weekly totals always add up to the per-ad totals.
//
// Script-owned columns are overwritten every run. Columns you edit by hand
// (Creative, Verdict, Notes) are never touched after a row is created.
//
// Safe by default: DRY RUN unless you pass --send. No npm dependencies.
// Needs NOTION_TOKEN, META_ADS_READ_TOKEN, META_AD_ACCOUNT_ID and the
// GOOGLE_ADS_* credentials in scripts/meta-capi/.env.local.
//
// Usage:
//   node scripts/ads-report/sync-notion.mjs            # dry run: print what would be written
//   node scripts/ads-report/sync-notion.mjs --setup    # create/extend the Notion columns + Ad Weeks DB
//   node scripts/ads-report/sync-notion.mjs --send     # write rows (also runs --setup)

import {loadSharedEnv, getAdsCredentials, makeContext, gaqlSearch} from '../click-lookup/googleAds.mjs'
import {getMetaCredentials, listAds, dailyAdInsights} from './metaAds.mjs'

loadSharedEnv()

const NOTION_VERSION = '2022-06-28'
const ADS_DB_ID = process.env.NOTION_ADS_DB_ID?.trim() || '0e854587-4b1c-4df6-ae01-821521fb4ab9'
const LEADS_DB_ID = process.env.NOTION_DATABASE_ID?.trim() || '3f101274-8342-804a-b00a-d041a2867b1b'
const WEEKS_DB_TITLE = 'Steady - Ad Weeks'
const TIMEZONE = 'America/Los_Angeles'

// Earliest dates to pull. Meta's first ads ran Feb 24 2026; Google's first
// campaign (PMax "Campaign #1") launched Jun 22 2026.
const META_SINCE = process.env.ADS_META_SINCE?.trim() || '2026-02-23'
const GOOGLE_SINCE = process.env.ADS_GOOGLE_SINCE?.trim() || '2026-06-22'

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const round2 = (n) => Math.round(n * 100) / 100

// ---------- dates ----------

// YYYY-MM-DD for "now" (or a timestamp) in Pacific time.
function pacificDate(when = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit'}).format(
    new Date(when),
  )
}

function addDays(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Monday of the week containing ymd.
function weekStart(ymd) {
  const dow = new Date(`${ymd}T00:00:00Z`).getUTCDay() // 0 = Sun
  return addDays(ymd, dow === 0 ? -6 : 1 - dow)
}

// ---------- Notion ----------

async function notion(method, path, body) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`https://api.notion.com/v1/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 429) {
      await sleep(1000 * (attempt + 1))
      continue
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`Notion ${method} ${path} failed (${res.status}): ${data.message || ''}`)
    return data
  }
  throw new Error(`Notion ${method} ${path}: rate limited`)
}

async function queryAll(databaseId) {
  const out = []
  let cursor
  do {
    const page = await notion('POST', `databases/${databaseId}/query`, {page_size: 100, start_cursor: cursor})
    out.push(...page.results)
    cursor = page.has_more ? page.next_cursor : undefined
  } while (cursor)
  return out
}

function plainText(prop) {
  const arr = prop?.rich_text || prop?.title
  if (!Array.isArray(arr)) return ''
  return arr.map((r) => r.plain_text || '').join('').trim()
}

const text = (s) => ({rich_text: s ? [{text: {content: String(s).slice(0, 1900)}}] : []})
const title = (s) => ({title: [{text: {content: String(s).slice(0, 1900)}}]})
const num = (n) => ({number: n === null || n === undefined || Number.isNaN(n) ? null : round2(n)})
const select = (name) => ({select: name ? {name} : null})
const date = (start, end) => ({date: start ? {start, end: end || null} : null})
const relation = (ids) => ({relation: ids.map((id) => ({id}))})

const money = {number: {format: 'dollar'}}
const count = {number: {format: 'number'}}
const options = (...names) => ({options: names.map((name) => ({name}))})

const AD_COLUMNS = {
  'Ad ID': {rich_text: {}},
  Platform: {select: options('Meta', 'Google')},
  Campaign: {rich_text: {}},
  'Ad set / group': {rich_text: {}},
  Status: {select: options('Active', 'Paused', 'In review', 'Disapproved', 'Issues', 'Removed')},
  'Launch date': {date: {}},
  'Last active': {date: {}},
  Spend: money,
  Impressions: count,
  Clicks: count,
  'Quote starts': count,
  'Platform leads': count,
  'Real leads': count,
  'Spam taps': count,
  'Cost per real lead': money,
  'Jobs won': count,
  Revenue: money,
  'Leads (Notion)': {relation: {database_id: LEADS_DB_ID, type: 'single_property', single_property: {}}},
  Creative: {rich_text: {}},
  Verdict: {select: options('Testing', 'Keep', 'Iterate', 'Kill')},
  Notes: {rich_text: {}},
  'Last synced': {date: {}},
}

const weekColumns = () => ({
  Name: {title: {}},
  Week: {date: {}},
  Platform: {select: options('All', 'Meta', 'Google')},
  Spend: money,
  Impressions: count,
  Clicks: count,
  'Quote starts': count,
  'Platform leads': count,
  'Real leads': count,
  'Spam taps': count,
  'Cost per real lead': money,
  'Jobs won': count,
  Revenue: money,
  'Best ad': {relation: {database_id: ADS_DB_ID, type: 'single_property', single_property: {}}},
  Notes: {rich_text: {}},
  'Last synced': {date: {}},
})

// Add any missing columns to Steady - Ads and find (or create) Steady - Ad Weeks
// next to it. Returns the Ad Weeks database id.
async function setupNotion() {
  const adsDb = await notion('GET', `databases/${ADS_DB_ID}`)
  const missing = Object.fromEntries(Object.entries(AD_COLUMNS).filter(([k]) => !adsDb.properties[k]))
  if (Object.keys(missing).length) {
    await notion('PATCH', `databases/${ADS_DB_ID}`, {properties: missing})
    console.log(`Steady - Ads: added ${Object.keys(missing).length} columns`)
  }

  const found = await notion('POST', 'search', {query: WEEKS_DB_TITLE, filter: {property: 'object', value: 'database'}})
  const existing = found.results.find((d) => d.title?.map((t) => t.plain_text).join('') === WEEKS_DB_TITLE)
  if (existing) return existing.id

  if (adsDb.parent?.type !== 'page_id') fail('Steady - Ads is not inside a page; create "Steady - Ad Weeks" by hand.')
  const created = await notion('POST', 'databases', {
    parent: {type: 'page_id', page_id: adsDb.parent.page_id},
    title: [{text: {content: WEEKS_DB_TITLE}}],
    properties: weekColumns(),
  })
  console.log(`Created ${WEEKS_DB_TITLE} (${created.id})`)
  return created.id
}

// ---------- ad platforms ----------

const META_STATUS = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  ADSET_PAUSED: 'Paused',
  CAMPAIGN_PAUSED: 'Paused',
  PENDING_REVIEW: 'In review',
  IN_PROCESS: 'In review',
  DISAPPROVED: 'Disapproved',
  WITH_ISSUES: 'Issues',
  DELETED: 'Removed',
  ARCHIVED: 'Removed',
}

async function loadMeta(creds, until) {
  const [ads, daily] = await Promise.all([listAds(creds), dailyAdInsights(creds, META_SINCE, until)])
  return {
    ads: ads.map((a) => ({
      key: `meta:${a.id}`,
      platform: 'Meta',
      adId: a.id,
      name: a.name,
      campaign: a.campaign?.name || '',
      adGroup: a.adset?.name || '',
      status: META_STATUS[a.effective_status] || 'Paused',
      launch: a.created_time ? pacificDate(a.created_time) : '',
    })),
    daily: daily.map((d) => ({...d, key: `meta:${d.adId}`})),
  }
}

// Effective status: active only if the ad (or asset group), its ad group and
// its campaign are all enabled.
function googleStatus(...statuses) {
  if (statuses.includes('REMOVED')) return 'Removed'
  return statuses.every((s) => s === 'ENABLED') ? 'Active' : 'Paused'
}

async function loadGoogle(creds, until) {
  const ctx = await makeContext(creds)
  const range = `segments.date BETWEEN '${GOOGLE_SINCE}' AND '${until}'`

  const searchAds = await gaqlSearch(
    ctx,
    `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type, ad_group_ad.status,
            ad_group.name, ad_group.status, campaign.id, campaign.name, campaign.status
     FROM ad_group_ad`,
  )
  const assetGroups = await gaqlSearch(
    ctx,
    `SELECT asset_group.id, asset_group.name, asset_group.status, campaign.id, campaign.name, campaign.status
     FROM asset_group`,
  )
  const adDaily = await gaqlSearch(
    ctx,
    `SELECT ad_group_ad.ad.id, segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
     FROM ad_group_ad WHERE ${range}`,
  )
  const agDaily = await gaqlSearch(
    ctx,
    `SELECT asset_group.id, segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
     FROM asset_group WHERE ${range}`,
  )

  const ads = [
    ...searchAds.map((r) => {
      const ad = r.adGroupAd.ad
      const type = ad.type === 'RESPONSIVE_SEARCH_AD' ? 'RSA' : ad.type
      return {
        key: `google:${ad.id}`,
        platform: 'Google',
        adId: ad.id,
        name: ad.name || `Search · ${r.adGroup.name} · ${type} ${ad.id}`,
        campaign: r.campaign.name,
        campaignId: r.campaign.id,
        adGroup: r.adGroup.name,
        status: googleStatus(r.adGroupAd.status, r.adGroup.status, r.campaign.status),
      }
    }),
    ...assetGroups.map((r) => ({
      key: `google:ag:${r.assetGroup.id}`,
      platform: 'Google',
      adId: `asset group ${r.assetGroup.id}`,
      name: `PMax · ${r.assetGroup.name}`,
      campaign: r.campaign.name,
      campaignId: r.campaign.id,
      adGroup: r.assetGroup.name,
      status: googleStatus(r.assetGroup.status, r.campaign.status),
    })),
  ]
  const toDaily = (key, r) => ({
    key,
    date: r.segments.date,
    spend: Number(r.metrics.costMicros || 0) / 1e6,
    impressions: Number(r.metrics.impressions || 0),
    clicks: Number(r.metrics.clicks || 0),
    quoteStarts: 0, // Google has no quote-start event; Meta only
    platformLeads: Number(r.metrics.conversions || 0),
  })
  const daily = [
    ...adDaily.map((r) => toDaily(`google:${r.adGroupAd.ad.id}`, r)),
    ...agDaily.map((r) => toDaily(`google:ag:${r.assetGroup.id}`, r)),
  ]
  return {ads, daily}
}

// ---------- leads → ads ----------

const UNRESOLVED_TAP = /^(Email|Phone) tap ·/

// Read the Offline Conversions DB and work out which ad (if any) each lead
// came from, using the "Source / Campaign" stamp:
//   google / cpc · <campaign id> · term: <keyword> · ad: <ad id>
//   ig / paid_social · <campaign> · term: <ad set> · ad: <ad name>
function attributeLeads(pages, ads, daily) {
  const metaByName = new Map()
  for (const ad of ads.filter((a) => a.platform === 'Meta')) {
    if (!metaByName.has(ad.name)) metaByName.set(ad.name, [])
    metaByName.get(ad.name).push(ad)
  }
  const spendByKeyWeek = new Map()
  const spendByKey = new Map()
  for (const d of daily) {
    const wk = `${d.key}|${weekStart(d.date)}`
    spendByKeyWeek.set(wk, (spendByKeyWeek.get(wk) || 0) + d.spend)
    spendByKey.set(d.key, (spendByKey.get(d.key) || 0) + d.spend)
  }
  const pmaxByCampaign = new Map(
    ads.filter((a) => a.key.startsWith('google:ag:')).map((a) => [String(a.campaignId), a.key]),
  )

  return pages.map((p) => {
    const props = p.properties
    const src = plainText(props['Source / Campaign'])
    const name = plainText(props.Name)
    const stage = props['Lead Stage']?.status?.name || props['Lead Stage']?.select?.name || ''
    const leadDate = props.Date?.date?.start ? pacificDate(props.Date.date.start) : pacificDate(p.created_time)
    const lead = {
      pageId: p.id,
      name,
      date: leadDate,
      week: weekStart(leadDate),
      spam: stage === 'Spam / Invalid',
      real: stage !== 'Spam / Invalid' && !UNRESOLVED_TAP.test(name),
      won: stage === 'Finished',
      revenue: props['Sold at']?.number || 0,
      platform: null,
      key: null,
    }

    const parts = src.split('·').map((s) => s.trim())
    const adPart = src.match(/ad:\s*(.+)$/)?.[1]?.trim()
    const termPart = src.match(/term:\s*(.+?)\s*(·|$)/)?.[1]?.trim()

    if (/^google\s*\/\s*cpc/i.test(src) || (!src && plainText(props.Gclid))) {
      lead.platform = 'Google'
      if (adPart && /^\d+$/.test(adPart) && ads.some((a) => a.key === `google:${adPart}`)) lead.key = `google:${adPart}`
      else if (parts[1] && pmaxByCampaign.has(parts[1])) lead.key = pmaxByCampaign.get(parts[1])
    } else if (/^(ig|fb|facebook|instagram|an|msg|th)\s*\/\s*paid/i.test(src) || (!src && plainText(props['Meta click ID']))) {
      lead.platform = 'Meta'
      const candidates = (adPart && metaByName.get(adPart)) || []
      // Several ads can share a name (duplicated ad sets): prefer the one in the
      // stamped ad set, then whichever spent most that week, then lifetime.
      const inAdSet = candidates.filter((a) => a.adGroup === termPart)
      const pool = inAdSet.length ? inAdSet : candidates
      const best = [...pool].sort(
        (a, b) =>
          (spendByKeyWeek.get(`${b.key}|${lead.week}`) || 0) - (spendByKeyWeek.get(`${a.key}|${lead.week}`) || 0) ||
          (spendByKey.get(b.key) || 0) - (spendByKey.get(a.key) || 0),
      )[0]
      if (best) lead.key = best.key
    }
    return lead
  })
}

// ---------- aggregation ----------

const emptyTotals = () => ({spend: 0, impressions: 0, clicks: 0, quoteStarts: 0, platformLeads: 0, real: 0, spam: 0, won: 0, revenue: 0})

function addDaily(t, d) {
  t.spend += d.spend
  t.impressions += d.impressions
  t.clicks += d.clicks
  t.quoteStarts += d.quoteStarts
  t.platformLeads += d.platformLeads
}

function addLead(t, l) {
  if (l.real) t.real += 1
  if (l.spam) t.spam += 1
  if (l.won) {
    t.won += 1
    t.revenue += l.revenue
  }
}

const costPerReal = (t) => (t.real ? t.spend / t.real : null)

function totalsColumns(t) {
  return {
    Spend: num(t.spend),
    Impressions: num(t.impressions),
    Clicks: num(t.clicks),
    'Quote starts': num(t.quoteStarts),
    'Platform leads': num(t.platformLeads),
    'Real leads': num(t.real),
    'Spam taps': num(t.spam),
    'Cost per real lead': num(costPerReal(t)),
    'Jobs won': num(t.won),
    Revenue: num(t.revenue),
  }
}

// Best ad of a week: most real leads, then most platform leads, then most
// clicks. Only ads that spent that week; none if nothing produced a lead.
function bestAd(perAd) {
  const ranked = perAd
    .filter((x) => x.t.spend > 0 && (x.t.real > 0 || x.t.platformLeads > 0))
    .sort((a, b) => b.t.real - a.t.real || b.t.platformLeads - a.t.platformLeads || b.t.clicks - a.t.clicks)
  return ranked[0]?.key || null
}

// ---------- main ----------

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const send = Boolean(args.send)

  if (!process.env.NOTION_TOKEN?.trim()) fail('NOTION_TOKEN is not set (scripts/meta-capi/.env.local).')
  const meta = getMetaCredentials()
  if (!meta.ok) fail(`Missing ${meta.missing.join(', ')} (scripts/meta-capi/.env.local).`)
  const google = getAdsCredentials()
  if (!google.ok) fail(`Missing ${google.missing.join(', ')} (scripts/meta-capi/.env.local).`)

  if (args.setup && !send) {
    const weeksId = await setupNotion()
    console.log(`Setup done. Ad Weeks DB: ${weeksId}`)
    return
  }

  const today = pacificDate()
  console.log(`Pulling Meta (${META_SINCE} → ${today}) and Google (${GOOGLE_SINCE} → ${today})…`)
  const [m, g, leadPages] = await Promise.all([
    loadMeta(meta.creds, today),
    loadGoogle(google.creds, today),
    queryAll(LEADS_DB_ID),
  ])
  const daily = [...m.daily, ...g.daily]
  const spendKeys = new Set(daily.filter((d) => d.spend > 0 || d.impressions > 0).map((d) => d.key))
  // Keep ads that ever ran, plus anything currently live (e.g. just launched).
  const ads = [...m.ads, ...g.ads].filter((a) => spendKeys.has(a.key) || a.status === 'Active' || a.status === 'In review')
  const leads = attributeLeads(leadPages, ads, daily)

  // Per-ad lifetime totals.
  const byAd = new Map(ads.map((a) => [a.key, {ad: a, t: emptyTotals(), leadIds: [], first: '', last: ''}]))
  for (const d of daily) {
    const row = byAd.get(d.key)
    if (!row) continue
    addDaily(row.t, d)
    if (d.impressions > 0 && (!row.first || d.date < row.first)) row.first = d.date
    if (d.spend > 0 && d.date > row.last) row.last = d.date
  }
  for (const l of leads) {
    const row = l.key && byAd.get(l.key)
    if (!row) continue
    addLead(row.t, l)
    row.leadIds.push(l.pageId)
  }

  // Per-week totals by platform (+ All), and per-ad per-week for "Best ad".
  const weeks = new Map() // week -> {Meta, Google, All, perAd: Map(key -> totals)}
  const weekOf = (wk) => {
    if (!weeks.has(wk)) weeks.set(wk, {Meta: emptyTotals(), Google: emptyTotals(), All: emptyTotals(), perAd: new Map()})
    return weeks.get(wk)
  }
  const adTotalsInWeek = (w, key) => {
    if (!w.perAd.has(key)) w.perAd.set(key, emptyTotals())
    return w.perAd.get(key)
  }
  const platformOf = (key) => (key.startsWith('meta:') ? 'Meta' : 'Google')
  for (const d of daily) {
    if (!byAd.has(d.key)) continue
    const w = weekOf(weekStart(d.date))
    addDaily(w[platformOf(d.key)], d)
    addDaily(w.All, d)
    addDaily(adTotalsInWeek(w, d.key), d)
  }
  for (const l of leads) {
    if (!l.platform) continue // organic / affiliate / unknown: not an ad lead
    const w = weekOf(l.week)
    addLead(w[l.platform], l)
    addLead(w.All, l)
    if (l.key && byAd.has(l.key)) addLead(adTotalsInWeek(w, l.key), l)
  }

  // ---- report ----
  const adRows = [...byAd.values()].sort((a, b) => b.t.spend - a.t.spend)
  console.log(`\n${adRows.length} ads (${leads.filter((l) => l.platform).length} ad-attributed Notion leads)`)
  for (const r of adRows) {
    const t = r.t
    console.log(
      `  ${r.ad.platform.padEnd(6)} ${r.ad.status.padEnd(9)} $${t.spend.toFixed(2).padStart(8)}  clicks ${String(t.clicks).padStart(4)}  ` +
        `quote starts ${String(t.quoteStarts).padStart(3)}  platform leads ${String(round2(t.platformLeads)).padStart(4)}  ` +
        `real ${t.real}  spam ${t.spam}  won ${t.won}  ${r.ad.name}`,
    )
  }
  const unmatched = leads.filter((l) => l.platform && !l.key)
  if (unmatched.length) {
    console.log(`\n${unmatched.length} ad lead(s) whose ad couldn't be identified (counted in weekly platform totals only):`)
    for (const l of unmatched) console.log(`  ${l.date} ${l.platform}  ${l.name}`)
  }
  const weekKeys = [...weeks.keys()].sort()
  console.log(`\n${weekKeys.length} weeks (${weekKeys[0]} → ${weekKeys.at(-1)}); last 4:`)
  for (const wk of weekKeys.slice(-4)) {
    for (const p of ['Meta', 'Google', 'All']) {
      const t = weeks.get(wk)[p]
      console.log(
        `  ${wk} ${p.padEnd(6)} $${t.spend.toFixed(2).padStart(8)}  clicks ${String(t.clicks).padStart(4)}  ` +
          `platform leads ${String(round2(t.platformLeads)).padStart(4)}  real ${t.real}  spam ${t.spam}`,
      )
    }
  }

  if (!send) {
    console.log('\nDry run — nothing written. Re-run with --send to update Notion.')
    return
  }

  // ---- write ----
  const weeksDbId = await setupNotion()
  const syncedOn = date(today)

  const existingAds = new Map()
  for (const p of await queryAll(ADS_DB_ID)) {
    const id = plainText(p.properties['Ad ID'])
    if (id) existingAds.set(id, p.id)
  }
  const pageIdByKey = new Map()
  let created = 0
  let updated = 0
  for (const r of adRows) {
    const a = r.ad
    const properties = {
      Name: title(a.name),
      'Ad ID': text(a.adId),
      Platform: select(a.platform),
      Campaign: text(a.campaign),
      'Ad set / group': text(a.adGroup),
      Status: select(a.status),
      'Launch date': date(a.launch || r.first),
      'Last active': date(r.last),
      ...totalsColumns(r.t),
      'Leads (Notion)': relation(r.leadIds.slice(0, 100)),
      'Last synced': syncedOn,
    }
    const existingId = existingAds.get(a.adId)
    if (existingId) {
      await notion('PATCH', `pages/${existingId}`, {properties})
      pageIdByKey.set(a.key, existingId)
      updated++
    } else {
      const page = await notion('POST', 'pages', {
        parent: {database_id: ADS_DB_ID},
        properties: {...properties, Verdict: select('Testing')},
      })
      pageIdByKey.set(a.key, page.id)
      created++
    }
    await sleep(350)
  }
  console.log(`\nSteady - Ads: ${created} created, ${updated} updated`)

  const existingWeeks = new Map()
  for (const p of await queryAll(weeksDbId)) existingWeeks.set(plainText(p.properties.Name), p.id)
  created = 0
  updated = 0
  for (const wk of weekKeys) {
    const w = weeks.get(wk)
    for (const p of ['Meta', 'Google', 'All']) {
      const t = w[p]
      if (!t.spend && !t.real && !t.spam && !t.platformLeads) continue
      const inPlatform = [...w.perAd.entries()]
        .filter(([key]) => p === 'All' || platformOf(key) === p)
        .map(([key, totals]) => ({key, t: totals}))
      const best = bestAd(inPlatform)
      const name = `${wk} · ${p}`
      const properties = {
        Name: title(name),
        Week: date(wk, addDays(wk, 6)),
        Platform: select(p),
        ...totalsColumns(t),
        'Best ad': relation(best && pageIdByKey.has(best) ? [pageIdByKey.get(best)] : []),
        'Last synced': syncedOn,
      }
      const existingId = existingWeeks.get(name)
      if (existingId) {
        await notion('PATCH', `pages/${existingId}`, {properties})
        updated++
      } else {
        await notion('POST', 'pages', {parent: {database_id: weeksDbId}, properties})
        created++
      }
      await sleep(350)
    }
  }
  console.log(`${WEEKS_DB_TITLE}: ${created} created, ${updated} updated`)
}

main().catch((err) => fail(err.message))
