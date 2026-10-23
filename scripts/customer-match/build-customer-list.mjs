#!/usr/bin/env node
// Build a Google Ads Customer Match CSV from the Notion leads database.
//
// Exports each lead's contact info in Google's Customer Match format so you can
// upload a list to Audience Manager — for retargeting people who inquired but
// didn't book, seeding Google's audience expansion (people similar to your
// inquirers), or excluding existing customers. Google hashes the data on upload.
//
// By default it exports ALL leads that have an email or phone. Use --stage to
// limit to one Lead Stage value (e.g. --stage Finished for just customers).
//
// No dependencies — plain Node (>=18). The Notion token is read from the
// environment, or from scripts/meta-capi/.env.local if you set it up there.
//
// Usage:
//   NOTION_TOKEN=... node scripts/customer-match/build-customer-list.mjs
//   node scripts/customer-match/build-customer-list.mjs --stage Finished --out customers.csv

import {readFileSync, writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'

// Reuse the NOTION_TOKEN from scripts/meta-capi/.env.local if it's set up there,
// so you don't have to paste it again. Inline/shell env still wins.
function loadSharedEnv() {
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    for (const line of readFileSync(join(here, '..', 'meta-capi', '.env.local'), 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const key = t.slice(0, eq).trim()
      let val = t.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
      if (key && process.env[key] === undefined) process.env[key] = val
    }
  } catch {
    // none — fine
  }
}
loadSharedEnv()

const NOTION_VERSION = '2022-06-28'
const DEFAULT_DATABASE_ID = '3f101274-8342-804a-b00a-d041a2867b1b'

const DEFAULTS = {out: 'customer-match.csv', stageProp: 'Lead Stage', country: 'US'}

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) args[a.slice(2)] = argv[++i]
  }
  return args
}

function plainText(property) {
  const rich = property?.rich_text || property?.title
  if (!Array.isArray(rich)) return ''
  return rich.map((r) => r.plain_text || '').join('').trim()
}
function stageName(property) {
  return property?.status?.name ?? property?.select?.name ?? ''
}

// Google Customer Match normalization (Google also normalizes server-side, but
// clean data matches better): email lowercased; phone in E.164 (+1XXXXXXXXXX).
function normEmail(email) {
  return (email || '').trim().toLowerCase()
}
function normPhone(phone) {
  let digits = (phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) digits = `1${digits}`
  return `+${digits}`
}
function splitName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return {first: '', last: ''}
  if (parts.length === 1) return {first: parts[0], last: ''}
  return {first: parts[0], last: parts.slice(1).join(' ')}
}

function csvField(value) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

async function fetchNotionLeads() {
  const token = process.env.NOTION_TOKEN?.trim()
  if (!token) throw new Error('NOTION_TOKEN is not set (env or scripts/meta-capi/.env.local).')
  const dbId = process.env.NOTION_DATABASE_ID?.trim() || DEFAULT_DATABASE_ID
  const headers = {Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json'}
  const pages = []
  let cursor
  do {
    const body = {page_size: 100}
    if (cursor) body.start_cursor = cursor
    const resp = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {method: 'POST', headers, body: JSON.stringify(body)})
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

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const outPath = args.out || DEFAULTS.out
  const stageFilter = args.stage // optional
  const stageProp = args['stage-prop'] || DEFAULTS.stageProp
  const country = args.country || DEFAULTS.country

  let pages
  try {
    pages = await fetchNotionLeads()
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }

  const seen = new Set()
  const rows = []
  let skippedNoContact = 0
  for (const page of pages) {
    const props = page.properties || {}
    if (stageFilter && stageName(props[stageProp]).trim().toLowerCase() !== stageFilter.trim().toLowerCase()) continue

    const email = normEmail(props.Email?.email || '')
    const phone = normPhone(props.Phone?.phone_number || '')
    if (!email && !phone) {
      skippedNoContact++
      continue
    }
    const dedupeKey = email || phone
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    const {first, last} = splitName(plainText(props.Name))
    const zip = plainText(props.Zip)
    rows.push([email, phone, first, last, country, zip])
  }

  const header = ['Email', 'Phone Number', 'First Name', 'Last Name', 'Country', 'Zip']
  const lines = [header.map(csvField).join(','), ...rows.map((r) => r.map(csvField).join(','))]
  writeFileSync(outPath, lines.join('\n') + '\n')

  console.log(`Wrote ${rows.length} member${rows.length === 1 ? '' : 's'} → ${outPath}`)
  if (skippedNoContact) console.log(`(Skipped ${skippedNoContact} lead(s) with no email or phone.)`)
  if (rows.length < 100) {
    console.log(`\nNote: Google Customer Match needs ~100 matched members before a list is usable in campaigns. You have ${rows.length}; keep adding as leads come in and re-upload.`)
  }
}

main()
