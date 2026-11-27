#!/usr/bin/env node
// Which Meta ad most likely sent an Instagram bio-link visitor?
//
// Instagram tags bio-link clicks utm_source=ig&utm_medium=social&utm_content=link_in_bio,
// so GA4 sees them, but not the ad (if any) that sent the person to the profile.
// For each day in the range this prints:
//   1. GA4 bio-link sessions (time, city, device) and, when the visitor's FIRST
//      visit was an ad click on the same device, that ad: an EXACT link.
//   2. Meta's Instagram profile visits per ad that day. The top ad is the
//      LIKELY source for bio-link visitors with no exact link. (Meta reports
//      profile visits per day only, so this is a best guess, not a match.)
//
// The lead sweep uses this to fill the "Assisted by ad" column on bio-link leads:
//   "Steady Ad 1a v1 (exact: GA4 first visit was this ad)"
//   "Steady Ad 1a v1 (likely: most IG profile visits that day)"
// and the ads sync credits those as "Assisted leads / revenue".
//
// Read-only. Needs META_ADS_READ_TOKEN, META_AD_ACCOUNT_ID, GA4_PROPERTY_ID,
// GA4_REFRESH_TOKEN and GOOGLE_ADS_CLIENT_ID/SECRET in scripts/meta-capi/.env.local.
//
// Usage:
//   node scripts/ads-report/bio-assist.mjs                       # yesterday + today
//   node scripts/ads-report/bio-assist.mjs --date 2026-11-24
//   node scripts/ads-report/bio-assist.mjs --since 2026-11-01 --until 2026-11-27

import {loadSharedEnv} from '../click-lookup/googleAds.mjs'
import {getMetaCredentials, listAds, dailyAdInsights} from './metaAds.mjs'

loadSharedEnv()

const TIMEZONE = 'America/Los_Angeles'

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue
    const next = argv[i + 1]
    args[argv[i].slice(2)] = next === undefined || next.startsWith('--') ? true : argv[++i]
  }
  return args
}

function fail(msg) {
  console.error(`\nError: ${msg}\n`)
  process.exit(1)
}

const pacificDate = (when = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(when))

const addDays = (ymd, n) => {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Loose match between a utm_content value ("1av1", "Steady Ad 1a v1") and an ad name.
const squash = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

async function ga4Report(body) {
  const env = process.env
  const missing = ['GA4_PROPERTY_ID', 'GA4_REFRESH_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET'].filter((k) => !env[k]?.trim())
  if (missing.length) fail(`Missing ${missing.join(', ')} (scripts/meta-capi/.env.local).`)
  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      client_id: env.GOOGLE_ADS_CLIENT_ID.trim(),
      client_secret: env.GOOGLE_ADS_CLIENT_SECRET.trim(),
      refresh_token: env.GA4_REFRESH_TOKEN.trim(),
      grant_type: 'refresh_token',
    }),
  }).then((r) => r.json())
  if (!tok.access_token) fail(`GA4 auth failed: ${tok.error_description || tok.error || 'no access token'}`)
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${env.GA4_PROPERTY_ID.trim()}:runReport`, {
    method: 'POST',
    headers: {Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  }).then((r) => r.json())
  if (res.error) fail(`GA4 report failed: ${res.error.message}`)
  return (res.rows || []).map((r) => [...r.dimensionValues.map((v) => v.value), ...r.metricValues.map((v) => v.value)])
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const today = pacificDate()
  const since = args.date || args.since || addDays(today, -1)
  const until = args.date || args.until || today

  const meta = getMetaCredentials()
  if (!meta.ok) fail(`Missing ${meta.missing.join(', ')} (scripts/meta-capi/.env.local).`)

  const [ads, daily, sessions] = await Promise.all([
    listAds(meta.creds),
    dailyAdInsights(meta.creds, since, until),
    ga4Report({
      dateRanges: [{startDate: since, endDate: until}],
      dimensions: [
        {name: 'dateHour'},
        {name: 'city'},
        {name: 'deviceCategory'},
        {name: 'firstUserSourceMedium'},
        {name: 'firstUserManualAdContent'},
      ],
      metrics: [{name: 'sessions'}],
      dimensionFilter: {filter: {fieldName: 'sessionManualAdContent', stringFilter: {value: 'link_in_bio'}}},
      orderBys: [{dimension: {dimensionName: 'dateHour'}}],
      limit: 1000,
    }),
  ])

  const adName = new Map(ads.map((a) => [a.id, a.name]))
  const spendById = new Map()
  for (const d of daily) spendById.set(d.adId, (spendById.get(d.adId) || 0) + d.spend)
  // utm_content → ad name; on ties prefer the ad that spent most in the range.
  const resolveAd = (content) => {
    const key = squash(content)
    if (!key) return ''
    const hits = ads.filter((a) => squash(a.name) === key || squash(a.name).endsWith(key))
    hits.sort((a, b) => (spendById.get(b.id) || 0) - (spendById.get(a.id) || 0))
    return hits[0]?.name || content
  }

  const visitsByDay = new Map() // date -> [{name, visits}]
  for (const d of daily) {
    if (!d.profileVisits) continue
    if (!visitsByDay.has(d.date)) visitsByDay.set(d.date, new Map())
    const m = visitsByDay.get(d.date)
    const name = adName.get(d.adId) || d.adId
    m.set(name, (m.get(name) || 0) + d.profileVisits)
  }

  const bioByDay = new Map()
  for (const [dhm, city, device, firstSrc, firstContent, n] of sessions) {
    const day = `${dhm.slice(0, 4)}-${dhm.slice(4, 6)}-${dhm.slice(6, 8)}`
    if (!bioByDay.has(day)) bioByDay.set(day, [])
    bioByDay.get(day).push({time: `${dhm.slice(8, 10)}:00`, city, device, firstSrc, firstContent, n: Number(n)})
  }

  console.log(`Instagram bio-link visits and IG profile visits by ad, ${since} → ${until} (Pacific)\n`)
  for (let day = since; day <= until; day = addDays(day, 1)) {
    const ranked = [...(visitsByDay.get(day) || new Map()).entries()].sort((a, b) => b[1] - a[1])
    const bio = bioByDay.get(day) || []
    if (!ranked.length && !bio.length) continue
    const total = ranked.reduce((s, [, v]) => s + v, 0)
    console.log(`${day}  IG profile visits from ads: ${total}${ranked.length ? '  (' + ranked.map(([n, v]) => `${n} ${v}`).join(', ') + ')' : ''}`)
    const likely = ranked[0]?.[0]
    if (!bio.length) console.log('  no bio-link visits')
    for (const s of bio) {
      const exact = /paid/i.test(s.firstSrc) ? resolveAd(s.firstContent) : ''
      const verdict = exact
        ? `EXACT: ${exact} (exact: GA4 first visit was this ad)`
        : likely
          ? `likely: ${likely} (likely: most IG profile visits that day)`
          : 'no ad link (no ad profile visits that day; organic)'
      console.log(`  ${s.time}  ${s.city || '?'} · ${s.device}${s.n > 1 ? ` ×${s.n}` : ''}  →  ${verdict}`)
    }
  }
}

main().catch((err) => fail(err.message))
