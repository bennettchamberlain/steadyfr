#!/usr/bin/env node
// Build a Google Ads "offline click conversions" CSV from closed leads.
//
// Input: a JSON file — an array of closed jobs, each with the gclid captured
// when the lead came in, the date/time it closed, and the sale value:
//
//   [
//     { "gclid": "EAIaIQ...", "closedAt": "2026-01-15T14:30:00-08:00", "value": 5200 },
//     { "gclid": "Cj0KCQ...", "closedAt": "2026-01-18", "value": 3800, "currency": "USD" }
//   ]
//
// Output: a CSV in the exact shape Google Ads expects for a manual upload
// (Tools → Conversions → Uploads → Upload a file). See README.md for the
// one-time setup of the conversion action this file imports into.
//
// No dependencies — plain Node (>=18). Usage:
//   node build-conversions-csv.mjs <input.json> [--out file.csv] \
//        [--name "Website Lead (offline)"] [--currency USD] [--tz America/Los_Angeles]

import {readFileSync, writeFileSync} from 'node:fs'

const DEFAULTS = {
  name: 'Website Lead (offline)', // must match the Google Ads conversion action name
  currency: 'USD',
  tz: 'America/Los_Angeles',
  out: 'google-ads-offline-conversions.csv',
}

function parseArgs(argv) {
  const args = {_: []}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      args[key] = argv[++i]
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
  // A bare date ("2026-01-15") is treated as noon local-ish; give it a time so
  // it lands on the right calendar day in any timezone.
  const value = /^\d{4}-\d{2}-\d{2}$/.test(input.trim()) ? `${input.trim()}T12:00:00` : input.trim()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function csvField(value) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const inputPath = args._[0]
  if (!inputPath) {
    console.error('Usage: node build-conversions-csv.mjs <input.json> [--out file.csv] [--name "..."] [--currency USD] [--tz America/Los_Angeles]')
    process.exit(1)
  }

  const name = args.name || DEFAULTS.name
  const defaultCurrency = args.currency || DEFAULTS.currency
  const tz = args.tz || DEFAULTS.tz
  const outPath = args.out || DEFAULTS.out

  let rows
  try {
    rows = JSON.parse(readFileSync(inputPath, 'utf8'))
  } catch (err) {
    console.error(`Could not read/parse ${inputPath}: ${err.message}`)
    process.exit(1)
  }
  if (!Array.isArray(rows)) {
    console.error('Input must be a JSON array of { gclid, closedAt, value, currency? }.')
    process.exit(1)
  }

  const out = []
  const skipped = []
  rows.forEach((row, i) => {
    const gclid = (row.gclid || '').toString().trim()
    if (!gclid) {
      skipped.push(`row ${i + 1}: missing gclid (gbraid/wbraid need the Google Ads API, not this CSV)`)
      return
    }
    const time = formatConversionTime(row.closedAt, tz)
    if (!time) {
      skipped.push(`row ${i + 1} (${gclid.slice(0, 12)}…): invalid or missing closedAt`)
      return
    }
    const value = Number(row.value)
    if (!Number.isFinite(value)) {
      skipped.push(`row ${i + 1} (${gclid.slice(0, 12)}…): invalid or missing value`)
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
