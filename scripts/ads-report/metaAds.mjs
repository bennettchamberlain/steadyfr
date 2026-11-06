// Read-only Meta Marketing API helpers for the ads-report scripts. Uses a
// system-user token with only `ads_read` — it cannot change ads. No npm
// dependencies (Node >=18 global fetch).
//
// Credentials come from the environment, or scripts/meta-capi/.env.local
// (loaded via loadSharedEnv in ../click-lookup/googleAds.mjs):
//   META_ADS_READ_TOKEN   system-user token (ads_read)
//   META_AD_ACCOUNT_ID    ad account id, with or without the act_ prefix

const GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || 'v21.0'

export function getMetaCredentials() {
  const token = process.env.META_ADS_READ_TOKEN?.trim() || ''
  const rawId = (process.env.META_AD_ACCOUNT_ID || '').trim().replace(/^act_/, '')
  const missing = []
  if (!token) missing.push('META_ADS_READ_TOKEN')
  if (!rawId) missing.push('META_AD_ACCOUNT_ID')
  return missing.length ? {ok: false, missing} : {ok: true, creds: {token, accountId: `act_${rawId}`}}
}

async function graphGet(token, pathOrUrl, params = {}) {
  const url = pathOrUrl.startsWith('https://')
    ? new URL(pathOrUrl)
    : new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${pathOrUrl}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url, {headers: {Authorization: `Bearer ${token}`}})
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    throw new Error(`Meta API request failed (${res.status}): ${data.error?.message || JSON.stringify(data).slice(0, 300)}`)
  }
  return data
}

// Follow paging.next until exhausted; returns the concatenated data[].
async function graphGetAll(token, path, params) {
  const out = []
  let page = await graphGet(token, path, params)
  out.push(...(page.data || []))
  while (page.paging?.next) {
    page = await graphGet(token, page.paging.next)
    out.push(...(page.data || []))
  }
  return out
}

// Every ad in the account with its campaign / ad set names and status.
export async function listAds({token, accountId}) {
  return graphGetAll(token, `${accountId}/ads`, {
    fields: 'id,name,effective_status,created_time,campaign{id,name},adset{id,name}',
    limit: '200',
  })
}

const actionValue = (actions, ...types) => {
  for (const type of types) {
    const hit = (actions || []).find((a) => a.action_type === type)
    if (hit) return Number(hit.value) || 0
  }
  return 0
}

// Daily per-ad metrics between since and until (YYYY-MM-DD, account timezone).
// Returns [{adId, date, spend, impressions, clicks, quoteStarts, platformLeads}].
//   clicks        = link clicks (not all clicks, which include likes/expands)
//   quoteStarts   = initiate_checkout (the quote builder fires InitiateCheckout)
//   platformLeads = Meta's "lead" (pixel + server-side Lead events)
export async function dailyAdInsights({token, accountId}, since, until) {
  const rows = await graphGetAll(token, `${accountId}/insights`, {
    level: 'ad',
    time_increment: '1',
    time_range: JSON.stringify({since, until}),
    fields: 'ad_id,spend,impressions,actions',
    limit: '500',
  })
  return rows.map((r) => ({
    adId: r.ad_id,
    date: r.date_start,
    spend: Number(r.spend) || 0,
    impressions: Number(r.impressions) || 0,
    clicks: actionValue(r.actions, 'link_click'),
    quoteStarts: actionValue(r.actions, 'initiate_checkout', 'offsite_conversion.fb_pixel_initiate_checkout'),
    platformLeads: actionValue(r.actions, 'lead', 'offsite_conversion.fb_pixel_lead'),
  }))
}
