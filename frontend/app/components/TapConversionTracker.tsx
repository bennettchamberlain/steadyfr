'use client'

import {useEffect} from 'react'
import {
  trackGoogleAdsConversion,
  PHONE_TAP_CONVERSION_SEND_TO,
  EMAIL_TAP_CONVERSION_SEND_TO,
} from '@/app/components/GoogleAnalytics'
import {getAdClickIds} from '@/lib/adClickIds'
import {isProductionHost} from '@/lib/isProductionHost'

/**
 * Fires the "Phone tap" / "Email tap" Google Ads conversions whenever a visitor
 * taps a tel: or mailto: link, anywhere on the site (header, footer, contact
 * page, etc.). Uses a single delegated listener so it covers every link,
 * including ones rendered after mount.
 *
 * It also logs the tap to Notion (via /api/track-tap) with whatever ad
 * attribution was captured on landing (gclid/fbclid/UTM), so the eventual
 * Dialpad call or email reply can be matched back to the ad click. A tap carries
 * no contact info, so this is just an attribution breadcrumb — deduped to one
 * row per link type per browser session so repeated taps don't flood the CRM.
 *
 * trackGoogleAdsConversion no-ops when gtag isn't loaded (i.e. off the
 * production host), and the Notion log is gated to the production host here and
 * on the server, so neither fires on previews/localhost.
 */
export default function TapConversionTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const link = target.closest('a[href^="tel:"], a[href^="mailto:"]')
      if (!link) return
      const href = link.getAttribute('href') || ''
      if (href.startsWith('tel:')) {
        trackGoogleAdsConversion(PHONE_TAP_CONVERSION_SEND_TO)
        logTap('phone')
      } else if (href.startsWith('mailto:')) {
        trackGoogleAdsConversion(EMAIL_TAP_CONVERSION_SEND_TO)
        logTap('email')
      }
    }
    // Capture phase so it runs before the browser follows the link.
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}

/**
 * Best-effort: log a tap (with captured click ids) to Notion. Production host
 * only, and at most once per link type per session so misclicks / repeat taps
 * don't create duplicate rows. Uses sendBeacon so it survives the page unloading
 * when the tel:/mailto: link opens the dialer / mail app.
 */
function logTap(kind: 'phone' | 'email') {
  if (!isProductionHost()) return

  const sessionKey = `steady_tap_logged_${kind}`
  try {
    if (window.sessionStorage.getItem(sessionKey)) return
    window.sessionStorage.setItem(sessionKey, '1')
  } catch {
    // Storage blocked — fall through and log anyway (worst case: a few dupes).
  }

  const payload = JSON.stringify({
    kind,
    pagePath: window.location.pathname,
    ...getAdClickIds(),
  })

  try {
    const blob = new Blob([payload], {type: 'application/json'})
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon('/api/track-tap', blob)) {
      return
    }
  } catch {
    // sendBeacon unavailable or threw — fall back to keepalive fetch.
  }

  try {
    void fetch('/api/track-tap', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: payload,
      keepalive: true,
    })
  } catch {
    // Nothing more we can do; the ad-conversion pixel still fired.
  }
}
