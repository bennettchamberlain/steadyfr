// Ad click-ID + campaign (UTM) capture for attribution and offline conversions.
//
// When someone arrives from an ad or a tagged link, the landing URL can carry:
//   - a click identifier — Google/YouTube `gclid` (or `gbraid`/`wbraid` for
//     iOS/privacy-safe campaigns), or Meta (FB/Instagram) `fbclid`; and
//   - UTM campaign tags — utm_source/medium/campaign/term/content — which say
//     which source, campaign, keyword (term) and specific ad (content) sent them.
//
// We stash whatever is present in localStorage on landing (last touch wins) and
// read it back when a lead form is submitted, so a lead can be tied to its
// campaign/ad and, when it closes, reported to the ad platform as an offline
// conversion.
//
// The pixels (gtag / Meta Pixel) already handle *online* attribution; this is
// about persisting the raw values so we can attribute conversions that happen
// offline (a lead that closes later by phone).

const STORAGE_KEY = 'steady_ad_click_ids'

// Click-ID attribution windows run up to ~90 days; after that a stored value is
// no longer useful for a conversion upload, so we treat it as expired.
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

export type LeadUtm = {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
}

export type AdClickIds = {
  gclid?: string
  gbraid?: string
  wbraid?: string
  fbclid?: string
  utm?: LeadUtm
}

const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid'] as const
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const
const ALL_KEYS = [...CLICK_ID_KEYS, ...UTM_KEYS] as const

type StoredTracking = Partial<Record<(typeof ALL_KEYS)[number], string>> & {capturedAt: number}

/**
 * Read click ids and UTM tags from the current URL and, if any are present,
 * persist them (overwriting any older values — last touch wins). Safe to call on
 * every page load; a no-op when there are no tracking params or when storage is
 * unavailable (private mode, SSR, blocked cookies).
 */
export function captureAdClickIds(): void {
  if (typeof window === 'undefined') return

  const found: Partial<Record<(typeof ALL_KEYS)[number], string>> = {}
  try {
    const params = new URLSearchParams(window.location.search)
    for (const key of ALL_KEYS) {
      const value = params.get(key)?.trim()
      if (value) found[key] = value.slice(0, 512)
    }
  } catch {
    return
  }

  if (Object.keys(found).length === 0) return

  const record: StoredTracking = {...found, capturedAt: Date.now()}
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Storage blocked — nothing more we can do; online attribution still works.
  }
}

/**
 * Return the stored click ids and UTMs, or an empty object if none are stored,
 * storage is unavailable, or the stored touch is older than the 90-day window.
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
    const parsed = JSON.parse(raw) as Partial<StoredTracking>
    if (typeof parsed.capturedAt === 'number' && Date.now() - parsed.capturedAt > MAX_AGE_MS) {
      return {}
    }

    const out: AdClickIds = {}
    for (const key of CLICK_ID_KEYS) {
      const value = parsed[key]
      if (typeof value === 'string' && value) out[key] = value
    }

    const utm: LeadUtm = {}
    for (const key of UTM_KEYS) {
      const value = parsed[key]
      if (typeof value === 'string' && value) utm[key.slice(4) as keyof LeadUtm] = value
    }
    if (Object.keys(utm).length) out.utm = utm

    return out
  } catch {
    return {}
  }
}
