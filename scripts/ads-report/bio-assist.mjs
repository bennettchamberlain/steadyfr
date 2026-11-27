#!/usr/bin/env node
// Which Meta ad (if any) sent an Instagram bio-link visitor?
//
// Instagram tags bio-link clicks utm_source=ig&utm_medium=social&utm_content=link_in_bio,
// so GA4 sees them, but not the ad (if any) that sent the person to the profile.
// Each bio-link visit gets one verdict, strongest first:
//
//   EXACT     GA4's first visit for that device was a click on this ad.
//   LIKELY    someone in the same city clicked this Meta ad in the 24 hours up to
//             the bio-link visit (any device: people often see the ad on one
//             device and come back on another), AND that city had only a few
//             Meta ad visits in that window (at most MAX_CITY_AD_SESSIONS), so
//             it's unlikely to be a coincidence. Busy cities (San Francisco,
//             Oakland) rarely qualify: someone there clicks an ad most days.
//   POSSIBLE  no qualifying same-city ad visit, but ads drove Instagram profile
//             visits that day; the top ad is named for reference only. Organic profile
//             visitors also tap the bio link, so this is NOT credited.
//   none      no ad link at all (organic).
//
// The lead sweep copies the verdict for a bio-link lead into the lead's
// "Assisted by ad" column, ad name first:
//   "Steady Ad 1a v1 (exact: …)" / "Steady Ad 1a v1 (likely: …)" / "Steady Ad 1a v1 (possible: …)"
// The ads sync credits only exact and likely as "Assisted leads / revenue".
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
import {ga4Report, ga4Day, BIO_LINK_FILTER, isMetaPaid, resolveMetaAd} from './ga4.mjs'

loadSharedEnv()

const TIMEZONE = 'America/Los_Angeles'
const LOOKBACK_DAYS = 1 // 24 h before the bio-link visit
const MAX_CITY_AD_SESSIONS = 2

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

const shortDate = (ymd) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'})

const knownCity = (c) => c && c !== '(not set)'

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const today = pacificDate()
  const since = args.date || args.since || addDays(today, -1)
  const until = args.date || args.until || today

  const meta = getMetaCredentials()
  if (!meta.ok) fail(`Missing ${meta.missing.join(', ')} (scripts/meta-capi/.env.local).`)

  const [ads, daily, bioRows, adRows] = await Promise.all([
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
      dimensionFilter: BIO_LINK_FILTER,
      orderBys: [{dimension: {dimensionName: 'dateHour'}}],
    }),
    // Meta ad sessions by city, including the lookback window before `since`.
    ga4Report({
      dateRanges: [{startDate: addDays(since, -LOOKBACK_DAYS), endDate: until}],
      dimensions: [{name: 'dateHour'}, {name: 'city'}, {name: 'sessionSourceMedium'}, {name: 'sessionManualAdContent'}],
      metrics: [{name: 'sessions'}],
      dimensionFilter: {filter: {fieldName: 'sessionMedium', stringFilter: {matchType: 'CONTAINS', value: 'paid'}}},
    }),
  ])

  const adName = new Map(ads.map((a) => [a.id, a.name]))
  const spendById = new Map()
  for (const d of daily) spendById.set(d.adId, (spendById.get(d.adId) || 0) + d.spend)
  const resolveName = (content) => resolveMetaAd(content, ads, (a) => spendById.get(a.id) || 0)?.name || ''

  // Meta-paid sessions per city: [{dateHour, name, n}]
  const adVisitsByCity = new Map()
  for (const [dh, city, sm, content, n] of adRows) {
    if (!knownCity(city) || !isMetaPaid(sm)) continue
    const name = resolveName(content)
    if (!name) continue
    if (!adVisitsByCity.has(city)) adVisitsByCity.set(city, [])
    adVisitsByCity.get(city).push({dateHour: dh, name, n: Number(n)})
  }

  // Ad-driven Instagram profile visits per day: Map(date -> Map(name -> visits))
  const visitsByDay = new Map()
  for (const d of daily) {
    if (!d.profileVisits) continue
    if (!visitsByDay.has(d.date)) visitsByDay.set(d.date, new Map())
    const m = visitsByDay.get(d.date)
    const name = adName.get(d.adId) || d.adId
    m.set(name, (m.get(name) || 0) + d.profileVisits)
  }

  const verdictFor = (dh, city, firstSrc, firstContent) => {
    const day = ga4Day(dh)
    if (isMetaPaid(firstSrc)) {
      const name = resolveName(firstContent)
      if (name) return {kind: 'EXACT', text: `${name} (exact: GA4 first visit on this device was this ad)`}
    }
    if (knownCity(city)) {
      const from = addDays(day, -LOOKBACK_DAYS).replace(/-/g, '') + dh.slice(8, 10)
      const hits = (adVisitsByCity.get(city) || []).filter((v) => v.dateHour >= from && v.dateHour <= dh)
      const cityTotal = hits.reduce((s, v) => s + v.n, 0)
      if (hits.length && cityTotal <= MAX_CITY_AD_SESSIONS) {
        const byAd = new Map()
        for (const v of hits) {
          const cur = byAd.get(v.name) || {n: 0, last: ''}
          byAd.set(v.name, {n: cur.n + v.n, last: v.dateHour > cur.last ? v.dateHour : cur.last})
        }
        const [name, {n, last}] = [...byAd.entries()].sort((a, b) => b[1].n - a[1].n || b[1].last.localeCompare(a[1].last))[0]
        return {
          kind: 'likely',
          text: `${name} (likely: ${city} visit from this ad ${shortDate(ga4Day(last))} ${last.slice(8, 10)}:00, within 24 h before; ${cityTotal} ${city} ad visit${cityTotal > 1 ? 's' : ''} in that window)`,
        }
      }
    }
    const top = [...(visitsByDay.get(day) || new Map()).entries()].sort((a, b) => b[1] - a[1])[0]
    if (top) {
      return {
        kind: 'possible',
        text: `${top[0]} (possible: ${top[1]} ad-driven IG profile visit${top[1] > 1 ? 's' : ''} that day, no qualifying ${knownCity(city) ? city + ' ' : ''}ad visit in the 24 h before; not credited)`,
      }
    }
    return {kind: 'none', text: 'no ad link (organic)'}
  }

  const bioByDay = new Map()
  for (const [dh, city, device, firstSrc, firstContent, n] of bioRows) {
    const day = ga4Day(dh)
    if (!bioByDay.has(day)) bioByDay.set(day, [])
    bioByDay.get(day).push({dh, city, device, n: Number(n), v: verdictFor(dh, city, firstSrc, firstContent)})
  }

  console.log(`Instagram bio-link visits, ${since} → ${until} (Pacific). Credited: exact + likely.\n`)
  const tally = {EXACT: 0, likely: 0, possible: 0, none: 0}
  for (let day = since; day <= until; day = addDays(day, 1)) {
    const ranked = [...(visitsByDay.get(day) || new Map()).entries()].sort((a, b) => b[1] - a[1])
    const bio = bioByDay.get(day) || []
    if (!ranked.length && !bio.length) continue
    const total = ranked.reduce((s, [, v]) => s + v, 0)
    console.log(`${day}  IG profile visits from ads: ${total}${ranked.length ? '  (' + ranked.map(([n, v]) => `${n} ${v}`).join(', ') + ')' : ''}`)
    if (!bio.length) console.log('  no bio-link visits')
    for (const s of bio) {
      tally[s.v.kind] += 1
      console.log(`  ${s.dh.slice(8, 10)}:00  ${s.city || '?'} · ${s.device}${s.n > 1 ? ` ×${s.n}` : ''}  →  ${s.v.kind.toUpperCase()}: ${s.v.text}`)
    }
  }
  console.log(`\nBio-link visit rows: ${tally.EXACT} exact, ${tally.likely} likely, ${tally.possible} possible (not credited), ${tally.none} no ad link.`)
}

main().catch((err) => fail(err.message))
