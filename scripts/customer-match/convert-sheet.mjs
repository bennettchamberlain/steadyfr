#!/usr/bin/env node
// Convert a customer spreadsheet (CSV) into Google Customer Match format,
// without going through Notion. Point it at a CSV exported from your sheet
// (e.g. the "FinishedProjects" tab → File → Download → CSV).
//
// It finds the Name / Email / Phone (and Zip, if present) columns by their
// header, so column order doesn't matter and extra columns are ignored.
//
// Usage:
//   node scripts/customer-match/convert-sheet.mjs past-customers.csv
//   node scripts/customer-match/convert-sheet.mjs input.csv --out customers.csv

import {readFileSync, writeFileSync} from 'node:fs'

function parseArgs(argv) {
  const args = {_: []}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) args[a.slice(2)] = argv[++i]
    else args._.push(a)
  }
  return args
}

// Minimal RFC-4180-ish CSV parser: handles quoted fields, embedded commas,
// escaped quotes ("") and \r\n line endings.
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

const normEmail = (e) => (e || '').trim().toLowerCase()
function normPhone(p) {
  let digits = (p || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) digits = `1${digits}`
  return `+${digits}`
}
function splitName(name) {
  // Drop parentheticals like "(Contractor)" for a clean first/last.
  const cleaned = (name || '').replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return {first: '', last: ''}
  if (parts.length === 1) return {first: parts[0], last: ''}
  return {first: parts[0], last: parts.slice(1).join(' ')}
}
function csvField(value) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const inputPath = args._[0]
  if (!inputPath) {
    console.error('Usage: node convert-sheet.mjs <input.csv> [--out customer-match-from-sheet.csv]')
    process.exit(1)
  }
  const outPath = args.out || 'customer-match-from-sheet.csv'
  const country = args.country || 'US'

  let text
  try {
    text = readFileSync(inputPath, 'utf8')
  } catch (err) {
    console.error(`Could not read ${inputPath}: ${err.message}`)
    process.exit(1)
  }

  const rows = parseCsv(text)
  if (rows.length < 2) {
    console.error('That file has no data rows under the header.')
    process.exit(1)
  }
  const headers = rows[0].map((h) => h.trim().toLowerCase())
  const nameIdx = headers.findIndex((h) => h === 'name' || h === 'full name')
  const emailIdx = headers.findIndex((h) => h.includes('email'))
  const phoneIdx = headers.findIndex((h) => h.includes('phone'))
  const zipIdx = headers.findIndex((h) => h.includes('zip') || h.includes('postal'))
  if (emailIdx === -1 && phoneIdx === -1) {
    console.error(`Couldn't find an Email or Phone column. Headers found: ${rows[0].join(', ')}`)
    process.exit(1)
  }

  const seen = new Set()
  const out = []
  let skippedNoContact = 0
  let skippedDupe = 0
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    if (cells.every((c) => (c || '').trim() === '')) continue // blank line
    const email = emailIdx === -1 ? '' : normEmail(cells[emailIdx])
    const phone = phoneIdx === -1 ? '' : normPhone(cells[phoneIdx])
    if (!email && !phone) {
      skippedNoContact++
      continue
    }
    const key = email || phone
    if (seen.has(key)) {
      skippedDupe++
      continue
    }
    seen.add(key)
    const {first, last} = splitName(nameIdx === -1 ? '' : cells[nameIdx])
    const zip = zipIdx === -1 ? '' : (cells[zipIdx] || '').trim()
    out.push([email, phone, first, last, country, zip])
  }

  const header = ['Email', 'Phone Number', 'First Name', 'Last Name', 'Country', 'Zip']
  const lines = [header.map(csvField).join(','), ...out.map((r) => r.map(csvField).join(','))]
  writeFileSync(outPath, lines.join('\n') + '\n')

  console.log(`Wrote ${out.length} member${out.length === 1 ? '' : 's'} → ${outPath}`)
  const notes = []
  if (skippedNoContact) notes.push(`${skippedNoContact} with no email/phone`)
  if (skippedDupe) notes.push(`${skippedDupe} duplicate(s)`)
  if (notes.length) console.log(`(Skipped ${notes.join(', ')}.)`)
}

main()
