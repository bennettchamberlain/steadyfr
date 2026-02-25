'use client'

import {useEffect} from 'react'
import {trackGAEvent} from './GoogleAnalytics'
import {trackMetaEvent} from './MetaPixel'

export default function NavigationTracker() {
  useEffect(() => {
    // Track navigation link clicks
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      if (link && link.href) {
        const url = new URL(link.href)
        const linkText = link.textContent?.trim() || url.pathname || 'Unknown Link'
        
        // Only track if we have valid link text or pathname
        if (!linkText || linkText === '') return
        
        // Only track internal navigation
        if (url.origin === window.location.origin) {
          // Track GA event
          trackGAEvent('navigation_click', {
            event_category: 'navigation',
            event_label: linkText,
            link_url: url.pathname,
            link_text: linkText,
          })
          // Track Meta Pixel event
          trackMetaEvent('ViewContent', {
            content_name: linkText,
            content_category: 'Navigation',
            link_url: url.pathname,
          })
        } else {
          // Track external links
          trackGAEvent('external_link_click', {
            event_category: 'navigation',
            event_label: linkText,
            link_url: url.href,
            link_text: linkText,
          })
          // Track Meta Pixel event for external links
          trackMetaEvent('ViewContent', {
            content_name: linkText,
            content_category: 'External Link',
            link_url: url.href,
          })
        }
      }
    }

    document.addEventListener('click', handleLinkClick)
    return () => {
      document.removeEventListener('click', handleLinkClick)
    }
  }, [])

  return null
}
