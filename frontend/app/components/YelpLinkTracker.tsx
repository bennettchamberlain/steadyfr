'use client'

import {useEffect} from 'react'
import {trackMetaEvent} from './MetaPixel'
import {trackGAEvent} from './GoogleAnalytics'

export default function YelpLinkTracker() {
  useEffect(() => {
    // Track Yelp link clicks
    const yelpLink = document.querySelector('a[href*="yelp.com"]')
    const handleYelpClick = () => {
      trackGAEvent('external_link_click', {
        event_category: 'social',
        event_label: 'yelp_reviews_click',
        link_url: 'https://www.yelp.com/biz/sturdy-fence-and-railing-san-francisco',
      })
      trackMetaEvent('ViewContent', {
        content_name: 'Yelp Reviews Click',
        content_category: 'Social',
        content_type: 'external_link',
      })
    }
    if (yelpLink) {
      yelpLink.addEventListener('click', handleYelpClick)
    }
    return () => {
      yelpLink?.removeEventListener('click', handleYelpClick)
    }
  }, [])

  return null
}
