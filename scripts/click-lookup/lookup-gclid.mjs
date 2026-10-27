#!/usr/bin/env node
// Resolve a Google click id (gclid) to the keyword / campaign / ad group / and
// approximate geography that produced it, using the Google Ads API `click_view`
// resource.
//
// A gclid is an opaque, encrypted token — you can't decode it yourself, and the
// Google Ads web UI has no "paste a gclid, see the keyword" lookup. The ONLY way
// to turn one gclid into its keyword is this API call. click_view keeps clicks
// for ~90 days and must be queried one calendar day at a time, so by default this
// scans the last several days until it finds the click.
//
// No npm dependencies — plain Node (>=18, for global fetch). Credentials are read
// from the environment, or from scripts/meta-capi/.env.local (same pattern as the
// other scripts). Nothing is written or uploaded — this is a read-only lookup.
//
// Required env (see scripts/click-lookup/README.md for how to get each one):
//   GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN,
//   GOOGLE_ADS_CUSTOMER_ID. Optional: GOOGLE_ADS_LOGIN_CUSTOMER_ID (manager id),
//   GOOGLE_ADS_API_VERSION (default v26).
//
// Usage:
//   node scripts/click-lookup/lookup-gclid.mjs --gclid EAIa...BwE
//   node scripts/click-lookup/lookup-gclid.mjs --gclid EAIa...BwE --date 2026-10-26
//   node scripts/click-lookup/lookup-gclid.mjs --gclid EAIa...BwE --days 14
//   node scripts/click-lookup/lookup-gclid.mjs --gclid EAIa...BwE --json

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

function printResult(flat, date) {
  console.log('\n  ✓ Click found' + (date ? ` (${date})` : '') + ':\n')
  console.log(
    `    Keyword:    ${flat.keyword ? `${flat.keyword}${flat.matchType ? `  [${flat.matchType}]` : ''}` : '(none — not a keyword-targeted click, e.g. Performance Max / Display)'}`,
  )
  console.log(`    Campaign:   ${flat.campaign || '—'}`)
  console.log(`    Ad group:   ${flat.adGroup || '—'}`)
  console.log(`    Network:    ${flat.network || '—'}`)
  console.log(`    Device:     ${flat.device || '—'}`)
  console.log(`    Where they were:   ${flat.location || '—'}`)
  console.log(`    Area of interest:  ${flat.interest || '—'}`)
  console.log('')
  console.log('  Note: "Keyword" is the keyword you bid on — not the literal query the person typed.')
  console.log('  Geography is approximate (postal code / city / metro / region), never a precise address.')
  console.log('  For the actual search query, open Google Ads → Insights & reports → Search terms.\n')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const gclid = typeof args.gclid === 'string' ? args.gclid.trim() : ''
  if (!gclid) fail('pass --gclid <value>')

  const cred = getAdsCredentials()
  if (!cred.ok) {
    fail(
      `missing credentials: ${cred.missing.join(', ')}\n` +
        'Add them to scripts/meta-capi/.env.local or export them. See scripts/click-lookup/README.md.',
    )
  }

  const ctx = await makeContext(cred.creds)

  const dates =
    typeof args.date === 'string' ? [args.date.trim()] : dateWindow(Number(args.days) || 10)

  if (!args.json) {
    console.log(`\nLooking up gclid in account ${cred.creds.customerId} across ${dates.length} day(s)...`)
  }

  const found = await findClick(ctx, gclid, dates)
  if (!found) {
    fail(
      `no click found for that gclid in the searched window.\n` +
        `  - If the click is older than ~90 days, click_view no longer has it.\n` +
        `  - If you know the click's date, pass --date YYYY-MM-DD (reporting timezone).\n` +
        `  - Widen the scan with --days 30.`,
    )
  }

  const geo = await resolveGeoNames(ctx, [
    found.row.clickView?.locationOfPresence?.mostSpecific,
    found.row.clickView?.areaOfInterest?.mostSpecific,
  ])
  const flat = flattenClick(found.row, geo)

  if (args.json) {
    console.log(JSON.stringify({date: found.date, ...flat}, null, 2))
  } else {
    printResult(flat, found.date)
  }
}

main().catch((e) => fail(e?.message || String(e)))
