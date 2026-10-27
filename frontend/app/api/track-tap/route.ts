import {NextRequest, NextResponse} from 'next/server'
import {createTapLead} from '@/lib/notionLead'
import type {LeadUtm} from '@/lib/adClickIds'
import {clientIpFrom} from '@/lib/clientIp'

export const runtime = 'nodejs'

interface TapPayload {
  kind?: 'phone' | 'email'
  pagePath?: string
  gclid?: string
  gbraid?: string
  wbraid?: string
  fbclid?: string
  utm?: LeadUtm
}

/**
 * Logs a tap on a tel:/mailto: link to Notion with the ad attribution captured
 * on landing (gclid/fbclid/UTM) plus server-side IP/user-agent, so a later
 * Dialpad call or email reply can be matched back to the ad click. Fire-and-
 * forget from the browser (navigator.sendBeacon) — always answers 200 so the
 * beacon never errors or retries. Click ids are client-supplied (same as the
 * forms); IP/user-agent are read server-side and never trusted from the body.
 */
export async function POST(request: NextRequest) {
  // Production hosts only, so previews/localhost don't create rows.
  const host = request.headers.get('host') || ''
  if (host !== 'steadyfnr.com' && host !== 'www.steadyfnr.com') {
    return NextResponse.json({ok: true, skipped: 'non-production host'})
  }

  let data: TapPayload
  try {
    data = (await request.json()) as TapPayload
  } catch {
    return NextResponse.json({ok: false, error: 'invalid json'}, {status: 400})
  }

  const kind = data.kind === 'phone' || data.kind === 'email' ? data.kind : null
  if (!kind) {
    return NextResponse.json({ok: false, error: 'kind must be "phone" or "email"'}, {status: 400})
  }

  const result = await createTapLead({
    kind,
    pagePath: typeof data.pagePath === 'string' ? data.pagePath.slice(0, 300) : undefined,
    gclid: data.gclid,
    gbraid: data.gbraid,
    wbraid: data.wbraid,
    fbclid: data.fbclid,
    utm: data.utm,
    ip: clientIpFrom(request.headers),
    userAgent: request.headers.get('user-agent') || undefined,
  })

  if (!result.ok) {
    console.error('track-tap: failed to log tap to Notion:', result.error)
  }
  // Always 200 — this is best-effort telemetry, not a user-facing action.
  return NextResponse.json({ok: result.ok})
}
