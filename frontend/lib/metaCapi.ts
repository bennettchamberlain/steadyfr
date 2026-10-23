// Server-side Meta Conversions API — fires a real-time `Lead` event when a form
// is submitted, to complement the browser Meta Pixel. The browser event and this
// one share an `eventId`, so Meta de-duplicates them (counts one Lead). Sending
// server-side means the Lead still lands when the browser pixel is blocked
// (ad blockers, iOS/Safari ITP), with better match data (IP, user agent, cookies).
//
// Requires META_CAPI_TOKEN in the environment (Vercel). When it's not set, this
// no-ops silently, so the forms keep working whether or not CAPI is configured.

import {createHash} from 'node:crypto'

const GRAPH_VERSION = 'v21.0'
const DEFAULT_DATASET_ID = '767536079342741' // Steady's Meta pixel / dataset

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

function hashEmail(email?: string): string | undefined {
  const normalized = email?.trim().toLowerCase()
  return normalized ? sha256(normalized) : undefined
}

function hashPhone(phone?: string): string | undefined {
  let digits = (phone || '').replace(/\D/g, '')
  if (!digits) return undefined
  if (digits.length === 10) digits = `1${digits}` // assume US country code
  return sha256(digits)
}

export type MetaLeadInput = {
  eventId?: string
  email?: string
  phone?: string
  fbc?: string // _fbc cookie (preferred)
  fbp?: string // _fbp cookie
  fbclid?: string // fallback to build fbc if no cookie
  ip?: string
  userAgent?: string
  sourceUrl?: string
}

/**
 * Send a `Lead` event to Meta. Fire-and-forget: never throws, so it can't break
 * a form submission. No-ops when META_CAPI_TOKEN isn't configured.
 */
export async function sendMetaLead(input: MetaLeadInput): Promise<void> {
  const token = process.env.META_CAPI_TOKEN?.trim()
  if (!token) return
  const datasetId = process.env.META_DATASET_ID?.trim() || DEFAULT_DATASET_ID

  const userData: Record<string, unknown> = {}
  const em = hashEmail(input.email)
  if (em) userData.em = [em]
  const ph = hashPhone(input.phone)
  if (ph) userData.ph = [ph]
  const fbc = input.fbc || (input.fbclid ? `fb.1.${Date.now()}.${input.fbclid}` : undefined)
  if (fbc) userData.fbc = fbc
  if (input.fbp) userData.fbp = input.fbp
  if (input.ip) userData.client_ip_address = input.ip
  if (input.userAgent) userData.client_user_agent = input.userAgent

  const event: Record<string, unknown> = {
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data: userData,
  }
  if (input.eventId) event.event_id = input.eventId
  if (input.sourceUrl) event.event_source_url = input.sourceUrl

  try {
    const resp = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${datasetId}/events`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({data: [event], access_token: token}),
    })
    if (!resp.ok) {
      const err = (await resp.json().catch(() => ({}))) as {error?: {message?: string}}
      console.error('[meta-capi] Lead send failed:', err.error?.message || resp.status)
    }
  } catch (err) {
    console.error('[meta-capi] Lead send error:', err)
  }
}
