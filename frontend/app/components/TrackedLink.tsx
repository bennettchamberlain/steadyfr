'use client'

import Link from 'next/link'
import {trackMetaEvent} from './MetaPixel'
import {trackGAEvent} from './GoogleAnalytics'

interface TrackedLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  eventName?: string
  eventParams?: Record<string, unknown>
  gaEventName?: string
  gaEventParams?: Record<string, unknown>
}

/**
 * Link component that tracks Meta Pixel and Google Analytics events on click
 */
export function TrackedLink({
  href,
  children,
  className,
  eventName = 'InitiateCheckout',
  eventParams,
                      gaEventName,
                      gaEventParams,
}: TrackedLinkProps) {
  const handleClick = () => {
    // Track Meta Pixel event
    trackMetaEvent(eventName, {
      content_name: 'Get a Quote',
      content_category: 'Quote',
      ...eventParams,
    })
    
    // Track Google Analytics event
    trackGAEvent(gaEventName || 'cta_click', {
      event_category: 'navigation',
      event_label: href,
      link_url: href,
      link_text: typeof children === 'string' ? children : 'Get a Quote',
      ...gaEventParams,
    })
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  )
}
