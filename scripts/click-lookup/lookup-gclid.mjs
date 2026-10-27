#!/usr/bin/env node
// Resolve a Google click id (gclid) to the keyword / campaign / ad group that
// produced it, using the Google Ads API `click_view` resource.
//
// A gclid is an opaque, encrypted token — you can't decode it yourself, and the
// Google Ads web UI has no "paste a gclid, see the keyword" lookup. The ONLY way
// to turn one gclid into its keyword is this API call. click_view keeps clicks
// for ~90 days and must be queried one calendar day at a time, so by default this
// scans the last several days until it finds the click.
//
// No npm dependencies — plain Node (>=18, for global fetch). Credentials are read
// from the environment, or from scripts/meta-capi/.env.local if you add them
// there (same pattern as the other scripts in this repo). Nothing is written or
// uploaded — this is a read-only lookup.
//
// Required env (see scripts/click-lookup/README.md for how to get each one):
//   GOOGLE_ADS_CLIENT_ID           OAuth client id
//   GOOGLE_ADS_CLIENT_SECRET       OAuth client secret
//   GOOGLE_ADS_REFRESH_TOKEN       OAuth refresh token for the Ads login
//   GOOGLE_ADS_CUSTOMER_ID         the Ads account id (10 digits, dashes ok)
// Optional:
//   GOOGLE_ADS_LOGIN_CUSTOMER_ID   manager (MCC) id, if the account is under one
//   GOOGLE_ADS_API_VERSION         defaults to v26; bump if the API rejects it
//   GOOGLE_ADS_DEVELOPER_TOKEN     legacy — retired Sep 2026; the header is now
//                                  ignored. Access follows the Cloud project the
//                                  OAuth client belongs to. Still sent if present.
//
// NOTE (Sep 2026): developer tokens were retired. Your access level now rides on
// the Google Cloud project behind your OAuth client — that project must hold
// Basic (or Standard) access, or queries hit your real account at Test level and
// fail. See the README for the current Cloud-project setup.
//
// Usage:
//   node scripts/click-lookup/lookup-gclid.mjs --gclid EAIa...BwE
//   node scripts/click-lookup/lookup-gclid.mjs --gclid EAIa...BwE --date 2026-10-26
//   node scripts/click-lookup/lookup-gclid.mjs --gclid EAIa...BwE --days 14
//   node scripts/click-lookup/lookup-gclid.mjs --gclid EAIa...BwE --json

import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'

// Reuse credentials from scripts/meta-capi/.env.local if set up there, so you
// don't have to paste them again. Inline/shell env still wins.
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
    // none — fine, env may come from the shell instead
  }
}
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

// YYYY-MM-DD in the account's reporting timezone is what click_view segments on.
// We format in local time; pass --date explicitly if your box isn't on PT.
function ymd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function getAccessToken({clientId, clientSecret, refreshToken}) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    fail(
      `OAuth token exchange failed (${res.status}): ${data.error || ''} ${data.error_description || ''}`.trim() +
        '\nCheck GOOGLE_ADS_CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN.',
    )
  }
  return data.access_token
}

async function queryClickView({version, customerId, loginCustomerId, developerToken, accessToken, gclid, date}) {
  // click_view requires a single-day date filter and lets you filter by gclid.
  const query = `
    SELECT
      click_view.gclid,
      click_view.keyword_info.text,
      click_view.keyword_info.match_type,
      campaign.id,
      campaign.name,
      ad_group.id,
      ad_group.name,
      segments.ad_network_type,
      segments.device,
      segments.date
    FROM click_view
    WHERE segments.date = '${date}'
      AND click_view.gclid = '${gclid.replace(/'/g, '')}'
  `.trim()

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
  // Legacy header — ignored by the server since Sep 2026, but harmless if set.
  if (developerToken) headers['developer-token'] = developerToken
  if (loginCustomerId) headers['login-customer-id'] = loginCustomerId

  const res = await fetch(
    `https://googleads.googleapis.com/${version}/customers/${customerId}/googleAds:search`,
    {method: 'POST', headers, body: JSON.stringify({query})},
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const apiErr = data?.error?.message || data?.[0]?.error?.message || JSON.stringify(data).slice(0, 400)
    // A bad API version is the most common first-run failure — call it out.
    if (res.status === 404 || /not found|invalid.*version/i.test(apiErr)) {
      fail(
        `Google Ads API request failed (${res.status}): ${apiErr}\n` +
          `This is often a stale API version. Set GOOGLE_ADS_API_VERSION to the current one ` +
          `(you're using ${version}) and retry.`,
      )
    }
    fail(`Google Ads API request failed (${res.status}): ${apiErr}`)
  }
  return data.results || []
}

function printResult(row, date) {
  const kw = row.clickView?.keywordInfo?.text
  const match = row.clickView?.keywordInfo?.matchType
  const campaign = row.campaign?.name
  const adGroup = row.adGroup?.name
  const network = row.segments?.adNetworkType
  const device = row.segments?.device

  console.log('\n  ✓ Click found' + (date ? ` (${date})` : '') + ':\n')
  console.log(`    Keyword:    ${kw ? `${kw}${match ? `  [${match}]` : ''}` : '(none — not a keyword-targeted click, e.g. Performance Max / Display)'}`)
  console.log(`    Campaign:   ${campaign || '—'}`)
  console.log(`    Ad group:   ${adGroup || '—'}`)
  console.log(`    Network:    ${network || '—'}`)
  console.log(`    Device:     ${device || '—'}`)
  console.log('')
  console.log('  Note: "Keyword" is the keyword you bid on — not the literal query the person typed.')
  console.log('  For the actual search query, open Google Ads → Insights & reports → Search terms.\n')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const gclid = typeof args.gclid === 'string' ? args.gclid.trim() : ''
  if (!gclid) fail('pass --gclid <value>')

  // Developer token is legacy (retired Sep 2026, header now ignored) — send it
  // only if it happens to be set, but don't require it.
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() || ''
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET?.trim()
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim()
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/[^0-9]/g, '')
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/[^0-9]/g, '') || ''
  const version = process.env.GOOGLE_ADS_API_VERSION?.trim() || 'v26'

  const missing = []
  if (!clientId) missing.push('GOOGLE_ADS_CLIENT_ID')
  if (!clientSecret) missing.push('GOOGLE_ADS_CLIENT_SECRET')
  if (!refreshToken) missing.push('GOOGLE_ADS_REFRESH_TOKEN')
  if (!customerId) missing.push('GOOGLE_ADS_CUSTOMER_ID')
  if (missing.length) {
    fail(
      `missing credentials: ${missing.join(', ')}\n` +
        'Add them to scripts/meta-capi/.env.local or export them. See scripts/click-lookup/README.md.',
    )
  }

  const accessToken = await getAccessToken({clientId, clientSecret, refreshToken})

  // Build the list of days to search: a single --date, else today back N days.
  let dates
  if (typeof args.date === 'string') {
    dates = [args.date.trim()]
  } else {
    const days = Math.max(1, Math.min(90, Number(args.days) || 10))
    dates = []
    const d = new Date()
    for (let i = 0; i < days; i++) {
      dates.push(ymd(d))
      d.setDate(d.getDate() - 1)
    }
  }

  if (!args.json) {
    console.log(`\nLooking up gclid in account ${customerId} across ${dates.length} day(s)...`)
  }

  for (const date of dates) {
    const results = await queryClickView({
      version,
      customerId,
      loginCustomerId,
      developerToken,
      accessToken,
      gclid,
      date,
    })
    if (results.length) {
      if (args.json) {
        console.log(JSON.stringify({date, ...results[0]}, null, 2))
      } else {
        printResult(results[0], date)
      }
      return
    }
  }

  fail(
    `no click found for that gclid in the searched window.\n` +
      `  - If the click is older than ~90 days, click_view no longer has it.\n` +
      `  - If you know the click's date, pass --date YYYY-MM-DD (reporting timezone).\n` +
      `  - Widen the scan with --days 30.`,
  )
}

main().catch((e) => fail(e?.message || String(e)))
