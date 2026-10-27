// Shared Google Ads API helpers for the click-lookup scripts (lookup-gclid.mjs
// and enrich-notion.mjs). Read-only reporting via GoogleAdsService.search — no
// writes to Google Ads. No npm dependencies (Node >=18 global fetch).
//
// Credentials come from the environment, or scripts/meta-capi/.env.local.
// See scripts/click-lookup/README.md for how to obtain each one.

import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'

const ENV_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'meta-capi', '.env.local')

// Load scripts/meta-capi/.env.local into process.env (inline/shell env wins).
export function loadSharedEnv() {
  try {
    for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
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
    // none — env may come from the shell instead
  }
}

// Collect + validate the Ads credentials. Returns {ok, creds} or {ok:false, missing}.
export function getAdsCredentials() {
  const creds = {
    // Developer token is legacy (retired Sep 2026, header now ignored) — optional.
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() || '',
    clientId: process.env.GOOGLE_ADS_CLIENT_ID?.trim() || '',
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET?.trim() || '',
    refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim() || '',
    customerId: (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/[^0-9]/g, ''),
    loginCustomerId: (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replace(/[^0-9]/g, ''),
    version: process.env.GOOGLE_ADS_API_VERSION?.trim() || 'v26',
  }
  const missing = []
  if (!creds.clientId) missing.push('GOOGLE_ADS_CLIENT_ID')
  if (!creds.clientSecret) missing.push('GOOGLE_ADS_CLIENT_SECRET')
  if (!creds.refreshToken) missing.push('GOOGLE_ADS_REFRESH_TOKEN')
  if (!creds.customerId) missing.push('GOOGLE_ADS_CUSTOMER_ID')
  return missing.length ? {ok: false, missing} : {ok: true, creds}
}

// Exchange the refresh token for a short-lived access token.
export async function getAccessToken({clientId, clientSecret, refreshToken}) {
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
    throw new Error(
      `OAuth token exchange failed (${res.status}): ${data.error || ''} ${data.error_description || ''}`.trim() +
        ' — check GOOGLE_ADS_CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN.',
    )
  }
  return data.access_token
}

// Build the context (adds accessToken) used by the query helpers.
export async function makeContext(creds) {
  const accessToken = await getAccessToken(creds)
  return {
    version: creds.version,
    customerId: creds.customerId,
    loginCustomerId: creds.loginCustomerId,
    developerToken: creds.developerToken,
    accessToken,
  }
}

// Run one GAQL query, returning results[]. Throws on API error (with a hint for
// the common stale-version case).
export async function gaqlSearch(ctx, query) {
  const headers = {Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': 'application/json'}
  if (ctx.developerToken) headers['developer-token'] = ctx.developerToken
  if (ctx.loginCustomerId) headers['login-customer-id'] = ctx.loginCustomerId

  const res = await fetch(
    `https://googleads.googleapis.com/${ctx.version}/customers/${ctx.customerId}/googleAds:search`,
    {method: 'POST', headers, body: JSON.stringify({query})},
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const apiErr = data?.error?.message || data?.[0]?.error?.message || JSON.stringify(data).slice(0, 400)
    if (res.status === 404 || /not found|invalid.*version/i.test(apiErr)) {
      throw new Error(
        `Google Ads API request failed (${res.status}): ${apiErr}\n` +
          `This is often a stale API version. Set GOOGLE_ADS_API_VERSION to the current one ` +
          `(you're using ${ctx.version}) and retry.`,
      )
    }
    throw new Error(`Google Ads API request failed (${res.status}): ${apiErr}`)
  }
  return data.results || []
}

// click_view requires a single-day date filter and lets you filter by gclid.
export async function queryClickViewOneDay(ctx, gclid, date) {
  const query = `
    SELECT
      click_view.gclid,
      click_view.keyword_info.text,
      click_view.keyword_info.match_type,
      click_view.location_of_presence.most_specific,
      click_view.area_of_interest.most_specific,
      campaign.id,
      campaign.name,
      ad_group.id,
      ad_group.name,
      segments.ad_network_type,
      segments.device,
      segments.date
    FROM click_view
    WHERE segments.date = '${date}'
      AND click_view.gclid = '${String(gclid).replace(/'/g, '')}'
  `.trim()
  return gaqlSearch(ctx, query)
}

// Scan the given dates (newest first) until the gclid's click is found.
// Returns {row, date} or null.
export async function findClick(ctx, gclid, dates) {
  for (const date of dates) {
    const results = await queryClickViewOneDay(ctx, gclid, date)
    if (results.length) return {row: results[0], date}
  }
  return null
}

// Resolve geoTargetConstant resource names ("geoTargetConstants/1014044") to
// readable canonical names ("Oakland,California,United States (City)") in one
// query. Geography is coarse by design (postal code / city / metro / region /
// country), never a precise address. Returns {} on any error (nice-to-have).
export async function resolveGeoNames(ctx, resourceNames) {
  const names = [...new Set((resourceNames || []).filter(Boolean))]
  const ids = names.map((rn) => rn.split('/')[1]).filter(Boolean)
  if (!ids.length) return {}
  const query = `
    SELECT geo_target_constant.id, geo_target_constant.canonical_name, geo_target_constant.target_type
    FROM geo_target_constant
    WHERE geo_target_constant.id IN (${ids.join(', ')})
  `.trim()
  let results
  try {
    results = await gaqlSearch(ctx, query)
  } catch {
    return {}
  }
  const map = {}
  for (const row of results) {
    const id = row.geoTargetConstant?.id
    const canonical = row.geoTargetConstant?.canonicalName
    const type = row.geoTargetConstant?.targetType
    if (id && canonical) map[`geoTargetConstants/${id}`] = type ? `${canonical} (${type})` : canonical
  }
  return map
}

// Flatten a click_view row (+ resolved geo map) into plain fields.
export function flattenClick(row, geo = {}) {
  const lopRes = row.clickView?.locationOfPresence?.mostSpecific
  const aoiRes = row.clickView?.areaOfInterest?.mostSpecific
  return {
    keyword: row.clickView?.keywordInfo?.text || '',
    matchType: row.clickView?.keywordInfo?.matchType || '',
    campaign: row.campaign?.name || '',
    adGroup: row.adGroup?.name || '',
    network: row.segments?.adNetworkType || '',
    device: row.segments?.device || '',
    location: lopRes ? geo[lopRes] || lopRes : '',
    interest: aoiRes ? geo[aoiRes] || aoiRes : '',
  }
}

// Build a descending list of YYYY-MM-DD strings, `days` long, ending at `end`
// (a Date, default today). Caps at ~90 days back and never goes to the future.
export function dateWindow(days, end = new Date()) {
  const n = Math.max(1, Math.min(90, Number(days) || 10))
  const out = []
  const d = new Date(end)
  for (let i = 0; i < n; i++) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    out.push(`${y}-${m}-${day}`)
    d.setDate(d.getDate() - 1)
  }
  return out
}
