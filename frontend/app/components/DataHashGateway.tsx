'use client'

import Script from 'next/script'
import {usePathname, useSearchParams} from 'next/navigation'
import {useEffect, Suspense} from 'react'

// DataHash Signals Gateway pixel
const DATAHASH_PIXEL_ID = '1942293362687017360'
const DATAHASH_HOST = 'https://sgw.datah07.com/'
const DATAHASH_SDK_SRC = `https://sgw.datah07.com/sdk/${DATAHASH_PIXEL_ID}/events.js`

declare global {
  interface Window {
    cbq: (
      action: string,
      event: string,
      params?: Record<string, unknown>,
    ) => void
  }
}

function DataHashTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Track page view on route change
    if (typeof window !== 'undefined' && window.cbq) {
      window.cbq('track', 'PageView')
    }
  }, [pathname, searchParams])

  return null
}

export default function DataHashGateway() {
  return (
    <>
      {/* Signals Gateway Pixel Code */}
      <Script
        id="datahash-signals-gateway"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(a,h,e,v,n,t,s){
              if(a.cbq)return;
              n=a.cbq=function(){
                n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)
              };
              if(!a._cbq)a._cbq=n;
              n.push=n;
              n.loaded=!0;
              n.version='2.0';
              n.queue=[];
              t=h.createElement(e);
              t.async=!0;
              t.src=v;
              s=h.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)
            }(window, document, 'script', '${DATAHASH_SDK_SRC}');
            cbq('setHost', '${DATAHASH_HOST}');
            cbq('init', '${DATAHASH_PIXEL_ID}');
            cbq('track', 'PageView');
          `,
        }}
      />
      <Suspense fallback={null}>
        <DataHashTracker />
      </Suspense>
    </>
  )
}

/**
 * Helper function to track custom DataHash Signals Gateway events.
 * Mirrors the Meta Pixel API (cbq behaves like fbq).
 * Usage: trackDataHashEvent('Lead', { content_name: 'Quote Request' })
 */
export function trackDataHashEvent(eventName: string, params?: Record<string, unknown>) {
  // Guard against empty or undefined event names
  if (!eventName || eventName.trim() === '') {
    console.warn('DataHash Gateway: Attempted to track event with empty name', params)
    return
  }

  if (typeof window !== 'undefined' && window.cbq) {
    window.cbq('track', eventName, params)
  }
}
