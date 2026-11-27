// Read-only GA4 Data API helpers for the ads-report scripts. No npm dependencies.
//
// Credentials (scripts/meta-capi/.env.local, loaded via loadSharedEnv):
//   GA4_PROPERTY_ID, GA4_REFRESH_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET
// (the GA4 refresh token was minted with the same OAuth client as Google Ads).

const REQUIRED = ['GA4_PROPERTY_ID', 'GA4_REFRESH_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET']

export function ga4Missing() {
  return REQUIRED.filter((k) => !process.env[k]?.trim())
}

let accessToken = null

async function getAccessToken() {
  if (accessToken) return accessToken
  const env = process.env
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
  if (!tok.access_token) throw new Error(`GA4 auth failed: ${tok.error_description || tok.error || 'no access token'}`)
  accessToken = tok.access_token
  return accessToken
}

// runReport → array of rows, each [...dimensionValues, ...metricValues] as strings.
export async function ga4Report(body) {
  const missing = ga4Missing()
  if (missing.length) throw new Error(`Missing ${missing.join(', ')} (scripts/meta-capi/.env.local).`)
  const token = await getAccessToken()
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA4_PROPERTY_ID.trim()}:runReport`,
    {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({limit: 10000, ...body}),
    },
  ).then((r) => r.json())
  if (res.error) throw new Error(`GA4 report failed: ${res.error.message}`)
  return (res.rows || []).map((r) => [...r.dimensionValues.map((v) => v.value), ...r.metricValues.map((v) => v.value)])
}

// GA4 date / dateHour strings → "YYYY-MM-DD" (and hour).
export const ga4Day = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`

// Instagram tags bio-link clicks utm_content=link_in_bio.
export const BIO_LINK_FILTER = {filter: {fieldName: 'sessionManualAdContent', stringFilter: {value: 'link_in_bio'}}}

// Meta ad traffic as stamped by our ad URLs (utm_source fb|ig…, utm_medium paid / paid_social).
export const isMetaPaid = (sourceMedium) =>
  /^(ig|fb|facebook|instagram|an|msg|th)\s*\/\s*paid/i.test(String(sourceMedium || '').trim())

// Map a utm_content value ("1av1", "Steady Ad 1a v1") to a Meta ad from `ads`
// ([{name, ...}]). Several ads can share a name: the caller's `rank` (higher
// first) breaks ties, e.g. spend. Returns the ad object or null.
const squash = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
export function resolveMetaAd(content, ads, rank = () => 0) {
  const key = squash(content)
  if (!key) return null
  const exact = ads.filter((a) => squash(a.name) === key)
  const hits = exact.length ? exact : ads.filter((a) => squash(a.name).endsWith(key))
  return [...hits].sort((a, b) => rank(b) - rank(a))[0] || null
}
