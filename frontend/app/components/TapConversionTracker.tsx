'use client'

import {useEffect} from 'react'
import {
  trackGoogleAdsConversion,
  PHONE_TAP_CONVERSION_SEND_TO,
  EMAIL_TAP_CONVERSION_SEND_TO,
} from '@/app/components/GoogleAnalytics'

/**
 * Fires the "Phone tap" / "Email tap" Google Ads conversions whenever a visitor
 * taps a tel: or mailto: link, anywhere on the site (header, footer, contact
 * page, etc.). Uses a single delegated listener so it covers every link,
 * including ones rendered after mount.
 *
 * trackGoogleAdsConversion no-ops when gtag isn't loaded (i.e. off the
 * production host), so this never fires on previews/localhost.
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
      } else if (href.startsWith('mailto:')) {
        trackGoogleAdsConversion(EMAIL_TAP_CONVERSION_SEND_TO)
      }
    }
    // Capture phase so it runs before the browser follows the link.
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}
