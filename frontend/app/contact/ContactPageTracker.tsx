'use client'

import {useEffect} from 'react'
import {trackGAEvent} from '@/app/components/GoogleAnalytics'
import {trackMetaEvent} from '@/app/components/MetaPixel'

export default function ContactPageTracker() {
  useEffect(() => {
    // Track page view
    trackGAEvent('page_view', {
      page_title: 'Contact Page',
      page_location: window.location.href,
    })
    trackMetaEvent('PageView', {
      content_name: 'Contact Page',
    })

    // Track email click
    const emailLink = document.querySelector('a[href^="mailto:"]')
    const handleEmailClick = () => {
      trackGAEvent('contact_click', {
        event_category: 'contact',
        event_label: 'email_click',
        contact_method: 'email',
        contact_value: 'sales@steadyfnr.com',
      })
      trackMetaEvent('Contact', {
        content_name: 'Email Click',
        content_category: 'Contact',
        contact_method: 'email',
      })
    }
    if (emailLink) {
      emailLink.addEventListener('click', handleEmailClick)
    }

    // Track phone click
    const phoneLink = document.querySelector('a[href^="tel:"]')
    const handlePhoneClick = () => {
      trackGAEvent('contact_click', {
        event_category: 'contact',
        event_label: 'phone_click',
        contact_method: 'phone',
        contact_value: '5108497343',
      })
      trackMetaEvent('Contact', {
        content_name: 'Phone Click',
        content_category: 'Contact',
        contact_method: 'phone',
      })
    }
    if (phoneLink) {
      phoneLink.addEventListener('click', handlePhoneClick)
    }

    return () => {
      emailLink?.removeEventListener('click', handleEmailClick)
      phoneLink?.removeEventListener('click', handlePhoneClick)
    }
  }, [])

  return null
}
