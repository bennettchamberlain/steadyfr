'use client'

import {useEffect} from 'react'
import {trackMetaEvent} from '@/app/components/MetaPixel'

export default function QuotePageTracker() {
  useEffect(() => {
    // Track when user lands on quote page
    trackMetaEvent('InitiateCheckout', {
      content_name: 'Quote Page',
      content_category: 'Quote',
    })
  }, [])

  return null
}
