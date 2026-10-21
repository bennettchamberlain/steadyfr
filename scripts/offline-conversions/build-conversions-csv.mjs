#!/usr/bin/env node
// Build a Google Ads "offline click conversions" CSV from closed leads.
//
// Two sources:
//
//  1. A JSON file (default) — an array of closed jobs:
//       [{ "gclid": "EAIa...", "closedAt": "2026-01-15", "value": 5200 }]
//     Usage: node build-conversions-csv.mjs my-closed-leads.json
//
//  2. Notion (--from-notion) — reads the leads database directly, picks the rows
//     whose "Lead Stage" equals the won value you pass, and uses their "Gclid"
//     and "Sold at" columns. Needs NOTION_TOKEN (and optionally NOTION_DATABASE_ID)
//     in the environment — the same values the website uses.
//       node build-conversions-csv.mjs --from-notion --won-stage "Won" \
//            --name "Converted lead (offline)"
//
// Output: a CSV in the exact shape Google Ads expects for a manual upload
// (Tools → Conversions → Uploads → Upload a file). See README.md for the
// one-time setup of the conversion action this file imports into.
//
// No dependencies — plain Node (>=18). Common options:
//   --out file.csv  --name "Conversion action name"  --currency USD  --tz America/Los_Angeles
// Notion-only options:
//   --won-stage "<Lead Stage value that means sold/won>"   (required)
//   --stage-prop "Lead Stage"   --value-prop "Sold at"   --gclid-prop "Gclid"
//   --date-prop "<date column>" (optional; defaults to the row's last-edited time)
//   --notes-prop "Notes"        (fallback place to find a gclid=... on older rows)

import {readFileSync, writeFileSync} from 'node:fs'

const DEFAULTS = {
  name: 'Converted lead (offline)', // must match the Google Ads conversion action name
  currency: 'USD',
  tz: 'America/Los_Angeles',
  out: 'google-ads-offline-conversions.csv',
  stageProp: 'Lead Stage',
  wonStage: 'Finished', // the Lead Stage value that means the job sold/closed
  valueProp: 'Sold at',
  gclidProp: 'Gclid',
  notesProp: 'Notes',
  dateProp: 'Sold on', // date column used as the conversion time
}

const NOTION_VERSION = '2022-06-28'
const DEFAULT_DATABASE_ID = '3f101274-8342-804a-b00a-d041a2867b1b'

function parseArgs(argv) {
  const args = {_: []}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      // Boolean flags take no value.
      if (key === 'from-notion') args[key] = true
      else args[key] = argv[++i]
    } else {
      args._.push(a)
    }
  }
  return args
}

// Format an instant as "yyyy-MM-dd HH:mm:ss" wall-clock in the given timezone.
// Google Ads reads this against the TimeZone declared in the Parameters line.
function formatConversionTime(input, tz) {
  const date = parseDate(input)
  if (!date) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '00'
  const hour = get('hour') === '24' ? '00' : get('hour')
  return `${get('year')}-${get('month')}-${get('day')} ${hour}:${get('minute')}:${get('second')}`
}

function parseDate(input) {
  if (typeof input !== 'string' || !input.trim()) return null
  // A bare date ("2026-01-15") is treated as midday so it lands on the right
  // calendar day in any timezone.
  const value = /^\d{4}-\d{2}-\d{2}$/.test(input.trim()) ? `${input.trim()}T12:00:00` : input.trim()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function csvField(value) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// --- Notion helpers ---------------------------------------------------------

function plainText(property) {
  const rich = property?.rich_text || property?.title
  if (!Array.isArray(rich)) return ''
  return rich.map((r) => r.plain_text || '').join('').trim()
}

// Pull a raw gclid out of a stored value like "EAIa...", "gclid=EAIa..." or a
// Notes blob. gbraid/wbraid can't go through this CSV, so they're ignored.
function extractGclid(text) {
  if (!text) return ''
  const tagged = /gclid=([^\s]+)/i.exec(text)
  if (tagged) return tagged[1]
  // A lone value with no "key=" and no other ad-id prefixes — treat as the gclid.
  if (!text.includes('=') && !/^(gbraid|wbraid|fbclid)/i.test(text)) return text.trim()
  return ''
}

function stageName(property) {
  // "Lead Stage" may be a Status or a Select property; both expose .name.
  return property?.status?.name ?? property?.select?.name ?? ''
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

async function rowsFromNotion(args) {
  const wonStage = args['won-stage'] || DEFAULTS.wonStage
  const stageProp = args['stage-prop'] || DEFAULTS.stageProp
  const valueProp = args['value-prop'] || DEFAULTS.valueProp
  const gclidProp = args['gclid-prop'] || DEFAULTS.gclidProp
  const notesProp = args['notes-prop'] || DEFAULTS.notesProp
  const dateProp = args['date-prop'] || DEFAULTS.dateProp

  const pages = await fetchNotionLeads()
  const rows = []
  for (const page of pages) {
    const props = page.properties || {}
    const stage = stageName(props[stageProp])
    if (stage.trim().toLowerCase() !== wonStage.trim().toLowerCase()) continue

    const gclid = extractGclid(plainText(props[gclidProp])) || extractGclid(plainText(props[notesProp]))
    const value = props[valueProp]?.number
    const closedAt =
      (dateProp && props[dateProp]?.date?.start) || page.last_edited_time // ISO instant fallback

    rows.push({gclid, value, closedAt, _name: plainText(props.Name) || page.id})
  }
  return rows
}

function readRowsFromFile(path) {
  let rows
  try {
    rows = JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    throw new Error(`Could not read/parse ${path}: ${err.message}`)
  }
  if (!Array.isArray(rows)) {
    throw new Error('Input must be a JSON array of { gclid, closedAt, value, currency? }.')
  }
  return rows
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const name = args.name || DEFAULTS.name
  const defaultCurrency = args.currency || DEFAULTS.currency
  const tz = args.tz || DEFAULTS.tz
  const outPath = args.out || DEFAULTS.out

  let rows
  try {
    if (args['from-notion']) {
      rows = await rowsFromNotion(args)
    } else {
      const inputPath = args._[0]
      if (!inputPath) {
        console.error('Usage: node build-conversions-csv.mjs <input.json>   (or --from-notion --won-stage "...")')
        process.exit(1)
      }
      rows = readRowsFromFile(inputPath)
    }
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }

  const out = []
  const skipped = []
  rows.forEach((row, i) => {
    const label = row._name ? `"${row._name}"` : `row ${i + 1}`
    const gclid = (row.gclid || '').toString().trim()
    if (!gclid) {
      skipped.push(`${label}: no gclid (older lead, or came from gbraid/wbraid which need the API)`)
      return
    }
    const time = formatConversionTime(row.closedAt, tz)
    if (!time) {
      skipped.push(`${label} (${gclid.slice(0, 12)}…): invalid or missing close date`)
      return
    }
    const value = Number(row.value)
    if (!Number.isFinite(value)) {
      skipped.push(`${label} (${gclid.slice(0, 12)}…): invalid or missing value ("Sold at")`)
      return
    }
    out.push([gclid, name, time, value, row.currency || defaultCurrency])
  })

  const header = ['Google Click ID', 'Conversion Name', 'Conversion Time', 'Conversion Value', 'Conversion Currency']
  const lines = [
    `Parameters:TimeZone=${tz}`,
    header.map(csvField).join(','),
    ...out.map((r) => r.map(csvField).join(',')),
  ]
  writeFileSync(outPath, lines.join('\n') + '\n')

  console.log(`Wrote ${out.length} conversion${out.length === 1 ? '' : 's'} → ${outPath}`)
  if (skipped.length) {
    console.log(`\nSkipped ${skipped.length} row${skipped.length === 1 ? '' : 's'}:`)
    for (const s of skipped) console.log(`  - ${s}`)
  }
}

main()
