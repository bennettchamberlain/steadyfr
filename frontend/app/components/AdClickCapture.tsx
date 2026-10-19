'use client'

import {useEffect} from 'react'
import {captureAdClickIds} from '@/lib/adClickIds'

/**
 * Invisible component that persists any Google Ads click id (gclid/gbraid/wbraid)
 * from the landing URL into localStorage, so lead forms can attach it to the
 * submission for offline conversion tracking. Mounted once in the root layout.
 */
export default function AdClickCapture() {
  useEffect(() => {
    captureAdClickIds()
  }, [])

  return null
}
