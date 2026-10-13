'use client'

import {trackGAEvent} from './GoogleAnalytics'
import {trackMetaEvent} from './MetaPixel'

/**
 * Unified analytics tracking that sends events to both Google Analytics and Facebook Pixel
 * 
 * This ensures data consistency between platforms and makes it easier to track conversions
 * 
 * Event mapping:
 * - GA uses snake_case event names (e.g., 'lead_form_submit')
 * - Meta Pixel uses PascalCase standard event names (e.g., 'Lead')
 */

export interface UnifiedEventParams {
  // Common parameters
  content_name?: string
  content_category?: string
  value?: number
  currency?: string
  
  // Additional GA parameters
  event_category?: string
  event_label?: string
  page?: string
  
  // Any other custom parameters
  [key: string]: unknown
}

/**
 * Track a unified event across both Google Analytics and Facebook Pixel
 * 
 * @param gaEventName - Google Analytics event name (snake_case)
 * @param metaEventName - Facebook Pixel event name (PascalCase standard event)
 * @param params - Event parameters (will be sent to both platforms)
 */
export function trackUnifiedEvent(
  gaEventName: string,
  metaEventName: string,
  params?: UnifiedEventParams,
) {
  // Track in Google Analytics
  trackGAEvent(gaEventName, params)
  
  // Track in Facebook Pixel (filter to only standard Meta parameters)
  const metaParams = params ? {
    content_name: params.content_name,
    content_category: params.content_category,
    value: params.value,
    currency: params.currency,
    content_ids: params.content_ids,
    content_type: params.content_type,
  } : undefined
  
  trackMetaEvent(metaEventName, metaParams)
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Unified Event Tracked:', {
      GA: {name: gaEventName, params},
      Meta: {name: metaEventName, params: metaParams},
    })
  }
}

/**
 * Pre-configured tracking functions for common events
 */

export const unifiedTracking = {
  // Quote/Lead Generation
  quoteInitiated: (params?: Omit<UnifiedEventParams, 'event_category'>) => {
    trackUnifiedEvent(
      'begin_checkout',
      'InitiateCheckout',
      {
        ...params,
        event_category: 'quote',
        currency: 'USD',
      }
    )
  },
  
  quoteSubmitted: (params?: Omit<UnifiedEventParams, 'event_category'>) => {
    trackUnifiedEvent(
      'generate_lead',
      'Lead',
      {
        ...params,
        event_category: 'quote',
        currency: 'USD',
      }
    )
    // Also track as Purchase for Facebook conversion tracking
    trackMetaEvent('Purchase', {
      content_name: params?.content_name,
      value: params?.value || 0,
      currency: 'USD',
    })
  },
  
  // Contact Events
  contactClicked: (contactType: 'email' | 'phone', params?: UnifiedEventParams) => {
    trackUnifiedEvent(
      'contact_click',
      'Contact',
      {
        ...params,
        event_category: 'engagement',
        event_label: contactType,
        content_category: contactType,
      }
    )
  },
  
  // Content Viewing
  contentViewed: (params: UnifiedEventParams) => {
    trackUnifiedEvent(
      'view_item',
      'ViewContent',
      {
        ...params,
        event_category: 'engagement',
      }
    )
  },
  
  // Gallery Viewing
  galleryViewed: (projectName: string) => {
    trackUnifiedEvent(
      'view_item',
      'ViewContent',
      {
        content_name: projectName,
        content_category: 'gallery_project',
        event_category: 'engagement',
        event_label: 'gallery_project_view',
      }
    )
  },
  
  // Form Interactions
  formFieldFocused: (fieldName: string, formName: string) => {
    // Only track in GA (too granular for Meta Pixel)
    trackGAEvent('form_field_focus', {
      event_category: 'form_interaction',
      event_label: fieldName,
      form_name: formName,
    })
  },
  
  formFieldCompleted: (fieldName: string, formName: string) => {
    // Only track in GA (too granular for Meta Pixel)
    trackGAEvent('form_field_complete', {
      event_category: 'form_interaction',
      event_label: fieldName,
      form_name: formName,
    })
  },
  
  // Navigation
  ctaClicked: (ctaName: string, destination: string) => {
    trackUnifiedEvent(
      'cta_click',
      'ViewContent',
      {
        content_name: ctaName,
        content_category: 'cta',
        event_category: 'navigation',
        event_label: destination,
      }
    )
  },
  
  // Page Scroll Depth (GA only)
  scrollDepth: (depth: number) => {
    trackGAEvent('scroll_depth', {
      event_category: 'engagement',
      event_label: `${depth}%`,
      value: depth,
    })
  },
}

/**
 * Debug utility to check if analytics are loaded
 */
export function checkAnalyticsStatus() {
  const status = {
    ga: typeof window !== 'undefined' && window.gtag !== undefined,
    meta: typeof window !== 'undefined' && window.fbq !== undefined,
  }
  
  console.log('📊 Analytics Status:', status)
  return status
}
