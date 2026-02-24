'use client'

import {useEffect} from 'react'
import {trackMetaEvent} from '@/app/components/MetaPixel'
import {trackGAEvent} from '@/app/components/GoogleAnalytics'

export default function QuotePageTracker() {
  useEffect(() => {
    // Track when user lands on quote page
    trackMetaEvent('InitiateCheckout', {
      content_name: 'Quote Page',
      content_category: 'Quote',
    })
    // Track GA event
    trackGAEvent('quote_page_view', {
      event_category: 'quote',
      event_label: 'quote_page_visited',
      page_path: '/quote',
    })
  }, [])

  return null
}
