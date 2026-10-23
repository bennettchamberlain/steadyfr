#!/usr/bin/env node
// Send closed-job conversions from Notion to Meta via the Conversions API (CAPI).
//
// For each lead whose "Lead Stage" is the won value (default "Finished"), this
// sends Meta a `Purchase` event with value = "Sold at", matched on hashed
// email/phone plus the Meta click id (fbclid), IP, and user agent. It's the
// Meta counterpart to scripts/offline-conversions (which feeds Google Ads).
//
// Safe by default: it only PRINTS what it would send. Add --send to actually
// send, and --test-event-code CODE to route a send to Events Manager → Test
// Events (so you can validate the payload without affecting real reporting).
//
// Env (you run this locally; Claude never handles the tokens):
//   NOTION_TOKEN        required — same token the website uses (in Vercel env)
//   META_CAPI_TOKEN     required for --send — Events Manager → dataset → Settings
//                       → Conversions API → Generate access token
//   NOTION_DATABASE_ID  optional — defaults to the leads database
//   META_DATASET_ID     optional — defaults to the site's pixel/dataset id
//
// Usage:
//   node send-conversions.mjs                      # dry run (prints events)
//   node send-conversions.mjs --test-event-code TESTxxbnd --send   # test events
//   node send-conversions.mjs --send               # real send

import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'

// Load scripts/meta-capi/.env.local (KEY=VALUE lines) into process.env without
// overriding anything already set on the command line. The file is git-ignored,
// so secrets stay on your machine and are never committed or deployed.
function loadLocalEnv() {
  try {
    const envPath = join(dirname(fileURLToPath(import.meta.url)), '.env.local')
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (key && process.env[key] === undefined) process.env[key] = val
    }
  } catch {
    // No .env.local — fine; tokens can come from the shell/inline instead.
  }
}
loadLocalEnv()

const NOTION_VERSION = '2022-06-28'
const DEFAULT_DATABASE_ID = '3f101274-8342-804a-b00a-d041a2867b1b'
const DEFAULT_DATASET_ID = '767536079342741' // Steady's Meta pixel / dataset
const GRAPH_VERSION = 'v21.0'

const DEFAULTS = {
  wonStage: 'Finished',
  stageProp: 'Lead Stage',
  valueProp: 'Sold at',
  dateProp: 'Sold on',
  fbclidProp: 'Meta click ID',
  ipProp: 'IP address',
  uaProp: 'User agent',
  currency: 'USD',
  eventName: 'Purchase',
  // Offline/CRM sale that happened away from the website. Override with
  // --action-source if your sales flow fits another value better.
  actionSource: 'physical_store',
}

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    if (key === 'send') args[key] = true
    else args[key] = argv[++i]
  }
  return args
}

// --- Meta normalization + hashing (must match Meta's spec, or matches fail) ---
const sha256 = (value) => createHash('sha256').update(value).digest('hex')

function hashEmail(email) {
  const normalized = (email || '').trim().toLowerCase()
  return normalized ? sha256(normalized) : null
}

function hashPhone(phone) {
  // Digits only, with country code. Assume US (1) when a 10-digit number has none.
  let digits = (phone || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) digits = `1${digits}`
  return sha256(digits)
}

// --- Notion ---
function plainText(property) {
  const rich = property?.rich_text || property?.title
  if (!Array.isArray(rich)) return ''
  return rich.map((r) => r.plain_text || '').join('').trim()
}
function stageName(property) {
  return property?.status?.name ?? property?.select?.name ?? ''
}
function extractFbclid(text) {
  if (!text) return ''
  const tagged = /fbclid=([^\s]+)/i.exec(text)
  if (tagged) return tagged[1]
  return !text.includes('=') ? text.trim() : ''
}

async function fetchNotionLeads() {
  const token = process.env.NOTION_TOKEN?.trim()
  if (!token) throw new Error('NOTION_TOKEN is not set in the environment.')
  const dbId = process.env.NOTION_DATABASE_ID?.trim() || DEFAULT_DATABASE_ID
  const headers = {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  }
  const pages = []
  let cursor
  do {
    const body = {page_size: 100}
    if (cursor) body.start_cursor = cursor
    const resp = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(err.message || `Notion query failed (${resp.status})`)
    }
    const data = await resp.json()
    pages.push(...(data.results || []))
    cursor = data.has_more ? data.next_cursor : undefined
  } while (cursor)
  return pages
}

function eventTimeUnix(page, dateProp) {
  const sold = page.properties?.[dateProp]?.date?.start
  const iso = sold || page.last_edited_time
  const secs = Math.floor(new Date(iso).getTime() / 1000)
  return Number.isFinite(secs) ? secs : Math.floor(Date.now() / 1000)
}

// Meta's `fbc` format: fb.1.<click-time-ms>.<fbclid>. We don't store the exact
// click time, so we approximate with the lead's creation time.
function buildFbc(fbclid, page) {
  if (!fbclid) return undefined
  const ms = new Date(page.created_time || Date.now()).getTime()
  return `fb.1.${ms}.${fbclid}`
}

function buildEvents(pages, opts) {
  const events = []
  const skipped = []
  for (const page of pages) {
    const props = page.properties || {}
    const name = plainText(props.Name) || page.id
    if (stageName(props[opts.stageProp]).trim().toLowerCase() !== opts.wonStage.trim().toLowerCase()) {
      continue
    }

    const email = props.Email?.email || ''
    const phone = props.Phone?.phone_number || ''
    const fbclid = extractFbclid(plainText(props[opts.fbclidProp]))
    const em = hashEmail(email)
    const ph = hashPhone(phone)
    const fbc = buildFbc(fbclid, page)

    // Meta needs at least one strong matcher.
    if (!em && !ph && !fbc) {
      skipped.push(`"${name}": no email / phone / fbclid to match on`)
      continue
    }
    const value = Number(props[opts.valueProp]?.number)
    if (!Number.isFinite(value)) {
      skipped.push(`"${name}": invalid or missing value ("${opts.valueProp}")`)
      continue
    }

    const userData = {}
    if (em) userData.em = [em]
    if (ph) userData.ph = [ph]
    if (fbc) userData.fbc = fbc
    const ip = plainText(props[opts.ipProp])
    const ua = plainText(props[opts.uaProp])
    if (ip) userData.client_ip_address = ip
    if (ua) userData.client_user_agent = ua

    events.push({
      event_name: opts.eventName,
      event_time: eventTimeUnix(page, opts.dateProp),
      action_source: opts.actionSource,
      event_id: page.id, // dedupe key
      user_data: userData,
      custom_data: {value: Math.round(value * 100) / 100, currency: opts.currency},
      _name: name,
    })
  }
  return {events, skipped}
}

function previewEvent(e) {
  const u = e.user_data
  const matchers = [u.em && 'email', u.ph && 'phone', u.fbc && 'fbclid', u.client_ip_address && 'ip', u.client_user_agent && 'ua']
    .filter(Boolean)
    .join(', ')
  return `  - ${e._name}: ${e.event_name} $${e.custom_data.value} ${e.custom_data.currency} · matched on [${matchers}] · ${new Date(e.event_time * 1000).toISOString().slice(0, 10)}`
}

async function sendToMeta(events, {testEventCode}) {
  const token = process.env.META_CAPI_TOKEN?.trim()
  if (!token) throw new Error('META_CAPI_TOKEN is not set (needed for --send).')
  const datasetId = process.env.META_DATASET_ID?.trim() || DEFAULT_DATASET_ID
  const payload = {data: events.map(({_name, ...e}) => e), access_token: token}
  if (testEventCode) payload.test_event_code = testEventCode
  const resp = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${datasetId}/events`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    throw new Error(data?.error?.message || `Meta CAPI request failed (${resp.status})`)
  }
  return data
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const opts = {
    wonStage: args['won-stage'] || DEFAULTS.wonStage,
    stageProp: args['stage-prop'] || DEFAULTS.stageProp,
    valueProp: args['value-prop'] || DEFAULTS.valueProp,
    dateProp: args['date-prop'] || DEFAULTS.dateProp,
    fbclidProp: args['fbclid-prop'] || DEFAULTS.fbclidProp,
    ipProp: args['ip-prop'] || DEFAULTS.ipProp,
    uaProp: args['ua-prop'] || DEFAULTS.uaProp,
    currency: args.currency || DEFAULTS.currency,
    eventName: args['event-name'] || DEFAULTS.eventName,
    actionSource: args['action-source'] || DEFAULTS.actionSource,
  }

  let pages
  try {
    pages = await fetchNotionLeads()
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }

  const {events, skipped} = buildEvents(pages, opts)

  console.log(`${events.length} event${events.length === 1 ? '' : 's'} to send:`)
  for (const e of events) console.log(previewEvent(e))
  if (skipped.length) {
    console.log(`\nSkipped ${skipped.length}:`)
    for (const s of skipped) console.log(`  - ${s}`)
  }

  if (!args.send) {
    console.log('\nDry run — nothing sent. Re-run with --send (and optionally --test-event-code CODE) to send.')
    return
  }
  if (events.length === 0) {
    console.log('\nNothing to send.')
    return
  }

  try {
    const result = await sendToMeta(events, {testEventCode: args['test-event-code']})
    console.log(`\nSent. Meta received ${result.events_received ?? '?'} events. fbtrace_id: ${result.fbtrace_id || 'n/a'}`)
    if (args['test-event-code']) {
      console.log('Open Events Manager → Test Events to confirm they arrived.')
    }
  } catch (err) {
    console.error(`\nSend failed: ${err.message}`)
    process.exit(1)
  }
}

main()
