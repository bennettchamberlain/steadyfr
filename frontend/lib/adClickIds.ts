// Google Ads click-ID capture for offline conversion tracking.
//
// When someone arrives from a Google/YouTube ad, the landing URL carries a click
// identifier: `gclid` (standard), or `gbraid` / `wbraid` for iOS/privacy-safe
// campaigns. We stash whichever is present in localStorage on landing and read it
// back when a lead form is submitted, so the click can later be matched to a
// closed job and uploaded to Google Ads as an offline conversion.
//
// gtag already uses these for *online* attribution automatically; this is only
// about persisting the raw id so we can report conversions that happen offline.

const STORAGE_KEY = 'steady_ad_click_ids'

// Google's click-ID attribution window is up to 90 days. After that the id is no
// longer useful for a conversion upload, so we treat stored ids as expired.
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

export type AdClickIds = {
  gclid?: string
  gbraid?: string
  wbraid?: string
}

type StoredAdClickIds = AdClickIds & {capturedAt: number}

const PARAM_KEYS = ['gclid', 'gbraid', 'wbraid'] as const

/**
 * Read gclid/gbraid/wbraid from the current URL and, if any are present, persist
 * them (overwriting any older click — last click wins, matching Google's model).
 * Safe to call on every page load; a no-op when there are no ad params or when
 * storage is unavailable (private mode, SSR, blocked cookies).
 */
export function captureAdClickIds(): void {
  if (typeof window === 'undefined') return

  let found: AdClickIds = {}
  try {
    const params = new URLSearchParams(window.location.search)
    for (const key of PARAM_KEYS) {
      const value = params.get(key)?.trim()
      if (value) found[key] = value.slice(0, 512)
    }
  } catch {
    return
  }

  if (!found.gclid && !found.gbraid && !found.wbraid) return

  const record: StoredAdClickIds = {...found, capturedAt: Date.now()}
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Storage blocked — nothing more we can do; online attribution still works.
  }
}

/**
 * Return the stored click ids, or an empty object if none are stored, storage is
 * unavailable, or the stored click is older than the 90-day attribution window.
 */
export function getAdClickIds(): AdClickIds {
  if (typeof window === 'undefined') return {}

  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return {}
  }
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAdClickIds>
    if (typeof parsed.capturedAt === 'number' && Date.now() - parsed.capturedAt > MAX_AGE_MS) {
      return {}
    }
    const out: AdClickIds = {}
    for (const key of PARAM_KEYS) {
      const value = parsed[key]
      if (typeof value === 'string' && value) out[key] = value
    }
    return out
  } catch {
    return {}
  }
}
