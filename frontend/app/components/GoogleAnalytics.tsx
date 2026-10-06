'use client'

import Script from 'next/script'
import {usePathname, useSearchParams} from 'next/navigation'
import {useEffect, Suspense} from 'react'

const GA_MEASUREMENT_ID = 'G-PV51QJQLR9'
// Google Ads (conversion tracking) — shares the same gtag.js already loaded for GA
const GOOGLE_ADS_ID = 'AW-18264152079'
// Conversion action: "Contact conversion"
export const CONTACT_CONVERSION_SEND_TO = 'AW-18264152079/wNbYCLr48sccEI-wg4VE'

declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, unknown>,
    ) => void
    dataLayer: unknown[]
  }
}

function GAPageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Track page view on route change
    if (typeof window !== 'undefined' && window.gtag) {
      const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: url,
      })
    }
  }, [pathname, searchParams])

  return null
}

export default function GoogleAnalytics() {
  return (
    <>
      {/* Google Analytics */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
            gtag('config', '${GOOGLE_ADS_ID}');
          `,
        }}
      />
      <Suspense fallback={null}>
        <GAPageViewTracker />
      </Suspense>
    </>
  )
}

/**
 * Track a Google Analytics event
 * Usage: trackGAEvent('button_click', { button_name: 'Get Quote', page: 'home' })
 */
export function trackGAEvent(
  eventName: string,
  params?: Record<string, unknown>,
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params)
  }
}

/**
 * Fire a Google Ads conversion.
 * Usage: trackGoogleAdsConversion(CONTACT_CONVERSION_SEND_TO)
 */
export function trackGoogleAdsConversion(sendTo: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {send_to: sendTo})
  }
}

/**
 * Track page view
 */
export function trackGAPageView(path: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: path,
    })
  }
}
