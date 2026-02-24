'use client'

import Link from 'next/link'
import {trackMetaEvent} from './MetaPixel'

interface TrackedLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  eventName?: string
  eventParams?: Record<string, unknown>
}

/**
 * Link component that tracks Meta Pixel events on click
 */
export function TrackedLink({
  href,
  children,
  className,
  eventName = 'InitiateCheckout',
  eventParams,
}: TrackedLinkProps) {
  const handleClick = () => {
    trackMetaEvent(eventName, {
      content_name: 'Get a Quote',
      content_category: 'Quote',
      ...eventParams,
    })
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  )
}
