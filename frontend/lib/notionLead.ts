import type {LeadUtm} from './adClickIds'

const NOTION_VERSION = '2022-06-28'
const TIME_ZONE = 'America/Los_Angeles'
const DATABASE_ID =
  process.env.NOTION_DATABASE_ID?.trim() || '3f101274-8342-804a-b00a-d041a2867b1b'

export type LeadSource = 'Quote' | 'Call' | 'Shop visit'

export type WebsiteLead = {
  name: string
  email?: string
  phone?: string
  company?: string
  street?: string
  city?: string
  state?: string
  zip?: string
  propertyType?: string
  project?: string
  location?: string[]
  railType?: string[]
  application?: string[]
  infill?: string[]
  files?: string[]
  notes?: string
  /** Quote estimate total in dollars → "Estimate" column (falls back to Notes). */
  estimateTotal?: number
  /** Quote project length in feet → "Length (ft)" column (falls back to Notes). */
  lengthFeet?: number
  /** Google Ads click ids captured on the landing page, for offline conversion tracking. */
  gclid?: string
  gbraid?: string
  wbraid?: string
  /** Meta (Facebook/Instagram) click id → "Meta click ID" column (falls back to Notes). */
  fbclid?: string
  /** Client IP captured server-side → "IP address" column (for conversion-match enhancement / Meta CAPI). */
  ip?: string
  /** Client user-agent captured server-side → "User agent" column (conversion enhancement / Meta CAPI). */
  userAgent?: string
  /** Campaign tags (utm_*) → "Source / Campaign" column (falls back to Notes). */
  utm?: LeadUtm
  source: LeadSource
  /**
   * Pacific wall-clock appointment. Omit to log an all-day lead on today's Pacific date.
   * durationMinutes defaults to 60.
   */
  visit?: {date: string; time: string; durationMinutes?: number}
  /**
   * All-day lead on this specific Pacific date (YYYY-MM-DD) instead of today — used for
   * flexible "we'll reach out" leads, which are marked for the day after submission.
   */
  allDayDate?: string
}

/** Turn a form slot like "9:00 AM" or "9:00 AM – 10:00 AM" into a Pacific start time. */
export function appointmentFromSlot(
  slot: string,
  kind: 'shop' | 'call',
): {time: string; durationMinutes: number} | null {
  const parts = slot.split(/\s*[–—-]\s*/).map((part) => part.trim()).filter(Boolean)
  const start = parseClock(parts[0] || '')
  if (!start) return null

  const end = parts[1] ? parseClock(parts[1]) : null
  if (end) {
    const [startHour, startMinute] = start.split(':').map(Number)
    const [endHour, endMinute] = end.split(':').map(Number)
    const duration = endHour * 60 + endMinute - (startHour * 60 + startMinute)
    if (duration > 0) return {time: start, durationMinutes: duration}
  }

  return {time: start, durationMinutes: kind === 'shop' ? 60 : 30}
}

function parseClock(label: string): string | null {
  const match = label.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return null
  let hour = Number(match[1])
  const minute = match[2]
  const meridiem = match[3].toUpperCase()
  if (meridiem === 'PM' && hour !== 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${minute}`
}

function wallClock(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const get = (type: string) => {
    const value = parts.find((part) => part.type === type)?.value ?? '00'
    return value === '24' ? '00' : value
  }
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
}

function pacificDateOnly(instant: Date) {
  return wallClock(instant, TIME_ZONE).slice(0, 10)
}

/** Pacific calendar date (YYYY-MM-DD) `days` from now — defaults to tomorrow. */
export function pacificDatePlus(days = 1): string {
  const [year, month, day] = pacificDateOnly(new Date()).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** Interpret a Pacific wall-clock date and time as an absolute instant. */
function pacificInstant(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(utc))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value === '24' ? '00' : part.value]),
    )
    const asWall = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    )
    const desired = Date.UTC(year, month - 1, day, hour, minute, 0)
    const delta = desired - asWall
    if (delta === 0) break
    utc += delta
  }

  return new Date(utc)
}

function dateProperty(lead: WebsiteLead) {
  if (lead.visit?.date && lead.visit.time) {
    const start = pacificInstant(lead.visit.date, lead.visit.time)
    const minutes = lead.visit.durationMinutes ?? 60
    const end = new Date(start.getTime() + minutes * 60 * 1000)
    return {
      date: {
        start: wallClock(start, TIME_ZONE),
        end: wallClock(end, TIME_ZONE),
        time_zone: TIME_ZONE,
      },
    }
  }

  return {date: {start: lead.allDayDate || pacificDateOnly(new Date())}}
}

function richText(value: string) {
  return {rich_text: [{text: {content: value.slice(0, 2000)}}]}
}

/** "google / cpc · Spring Railings · term: cable railing · ad: 12345" from UTMs. */
function composeSourceCampaign(utm?: LeadUtm): string {
  if (!utm) return ''
  const sourceMedium = [utm.source?.trim(), utm.medium?.trim()].filter(Boolean).join(' / ')
  return [
    sourceMedium,
    utm.campaign?.trim(),
    utm.term?.trim() && `term: ${utm.term.trim()}`,
    utm.content?.trim() && `ad: ${utm.content.trim()}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

function multiSelect(values?: string[]) {
  const names = (values ?? []).map((value) => value.trim()).filter(Boolean)
  if (!names.length) return undefined
  return {multi_select: names.map((name) => ({name}))}
}

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Apply the ad-attribution columns — Gclid (raw gclid, else labelled
 * gbraid/wbraid), Meta click ID (fbclid), IP address, User agent, and
 * Source / Campaign (from UTMs) — each with a Notes fallback so the value still
 * lands if the column is missing from the database. Shared by leads and taps.
 */
function applyAttribution(
  properties: Record<string, unknown>,
  optionalColumns: Array<{name: string; fallbackNote: string}>,
  a: {
    gclid?: string
    gbraid?: string
    wbraid?: string
    fbclid?: string
    ip?: string
    userAgent?: string
    utm?: LeadUtm
  },
): void {
  const adClickIds = [
    a.gclid?.trim() && `gclid=${a.gclid.trim()}`,
    a.gbraid?.trim() && `gbraid=${a.gbraid.trim()}`,
    a.wbraid?.trim() && `wbraid=${a.wbraid.trim()}`,
  ].filter(Boolean) as string[]
  // Raw gclid when present (cleanest for CSV export); else the gbraid/wbraid fallback.
  const gclidColumnValue = a.gclid?.trim() || adClickIds.join(' ')
  if (gclidColumnValue) {
    properties.Gclid = richText(gclidColumnValue)
    optionalColumns.push({
      name: 'Gclid',
      fallbackNote: adClickIds.length ? `Ad click: ${adClickIds.join(' ')}` : '',
    })
  }
  const fbclid = a.fbclid?.trim()
  if (fbclid) {
    properties['Meta click ID'] = richText(fbclid)
    optionalColumns.push({name: 'Meta click ID', fallbackNote: `Meta ad click (fbclid): ${fbclid}`})
  }
  const ip = a.ip?.trim()
  if (ip) {
    properties['IP address'] = richText(ip)
    optionalColumns.push({name: 'IP address', fallbackNote: `IP: ${ip}`})
  }
  const userAgent = a.userAgent?.trim()
  if (userAgent) {
    properties['User agent'] = richText(userAgent)
    optionalColumns.push({name: 'User agent', fallbackNote: `UA: ${userAgent}`})
  }
  const sourceCampaign = composeSourceCampaign(a.utm)
  if (sourceCampaign) {
    properties['Source / Campaign'] = richText(sourceCampaign)
    optionalColumns.push({name: 'Source / Campaign', fallbackNote: `Source / Campaign: ${sourceCampaign}`})
  }
}

/**
 * POST a page to the leads database, retrying when the database is missing one
 * of the "optional" columns — Notion rejects the whole create with "<Name> is
 * not a property that exists." Drop that column, fold its value into Notes, and
 * retry so the row still saves. Only retries on failure, so there's no risk of a
 * duplicate page. `initialNotes` seeds Notes (fallbacks are appended to it).
 */
async function createNotionPage(
  properties: Record<string, unknown>,
  optionalColumns: Array<{name: string; fallbackNote: string}>,
  initialNotes: string,
): Promise<{ok: true; id: string} | {ok: false; error: string}> {
  const token = process.env.NOTION_TOKEN?.trim()
  if (!token) {
    return {ok: false, error: 'NOTION_TOKEN is not set'}
  }

  // Notes is set last so missing-column fallbacks can be appended to it.
  let notesValue = initialNotes.trim()
  if (notesValue) properties.Notes = richText(notesValue)

  async function postPage(): Promise<
    {ok: true; id: string} | {ok: false; status: number; error: string}
  > {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: {database_id: DATABASE_ID},
        properties,
      }),
    })

    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as {message?: string}
      return {
        ok: false,
        status: response.status,
        error: err.message || `Notion request failed (${response.status})`,
      }
    }

    const data = (await response.json()) as {id: string}
    return {ok: true, id: data.id}
  }

  let result = await postPage()

  let guard = 0
  while (!result.ok && result.status === 400 && guard < optionalColumns.length + 1) {
    guard++
    const missing = /^(.+?) is not a property that exists/i.exec(result.error)?.[1]?.trim()
    const column = missing ? optionalColumns.find((c) => c.name === missing) : undefined
    if (!column || !(column.name in properties)) break
    delete properties[column.name]
    if (column.fallbackNote) {
      notesValue = [notesValue, column.fallbackNote].filter(Boolean).join('\n')
      properties.Notes = richText(notesValue)
    }
    result = await postPage()
  }

  if (!result.ok) {
    return {ok: false, error: result.error}
  }
  return {ok: true, id: result.id}
}

export async function createWebsiteLead(
  lead: WebsiteLead,
): Promise<{ok: true; id: string} | {ok: false; error: string}> {
  const properties: Record<string, unknown> = {
    Name: {
      title: [{text: {content: (lead.name || lead.email || 'Website lead').slice(0, 200)}}],
    },
    Source: {select: {name: lead.source}},
    Date: dateProperty(lead),
  }

  const email = lead.email?.trim()
  if (email && EMAIL_OK.test(email)) properties.Email = {email}
  const phone = lead.phone?.trim()
  if (phone) properties.Phone = {phone_number: phone}

  const textFields: Array<[string, string | undefined]> = [
    ['Company', lead.company],
    ['Street', lead.street],
    ['City', lead.city],
    ['State', lead.state],
    ['Zip', lead.zip],
    ['Files', lead.files?.filter(Boolean).join(', ')],
  ]
  for (const [key, value] of textFields) {
    const trimmed = value?.trim()
    if (trimmed) properties[key] = richText(trimmed)
  }
  if (lead.propertyType?.trim()) properties['Property type'] = {select: {name: lead.propertyType.trim()}}
  if (lead.project?.trim()) properties.Project = {select: {name: lead.project.trim()}}
  const multiFields: Array<[string, string[] | undefined]> = [
    ['Location', lead.location],
    ['Rail type', lead.railType],
    ['Application', lead.application],
    ['Infill', lead.infill],
  ]
  for (const [key, values] of multiFields) {
    const property = multiSelect(values)
    if (property) properties[key] = property
  }

  // "Optional" columns are ones a given database may not have yet (added over
  // time / different per deployment). Each carries a Notes fallback so that if
  // the column is missing, its value still lands on the lead.
  const optionalColumns: Array<{name: string; fallbackNote: string}> = []
  applyAttribution(properties, optionalColumns, lead)
  if (typeof lead.estimateTotal === 'number' && Number.isFinite(lead.estimateTotal)) {
    const dollars = Math.round(lead.estimateTotal)
    properties.Estimate = {number: dollars}
    optionalColumns.push({name: 'Estimate', fallbackNote: `Estimate: $${dollars.toLocaleString('en-US')}`})
  }
  if (typeof lead.lengthFeet === 'number' && Number.isFinite(lead.lengthFeet)) {
    properties['Length (ft)'] = {number: lead.lengthFeet}
    optionalColumns.push({name: 'Length (ft)', fallbackNote: `Length: ${lead.lengthFeet} ft`})
  }

  return createNotionPage(properties, optionalColumns, lead.notes?.trim() || '')
}

export type TapEvent = {
  kind: 'phone' | 'email'
  /** Path of the page the tap happened on (for context in Notes). */
  pagePath?: string
  gclid?: string
  gbraid?: string
  wbraid?: string
  fbclid?: string
  ip?: string
  userAgent?: string
  utm?: LeadUtm
}

/**
 * Log an anonymous tap on a tel:/mailto: link to the leads database, carrying
 * whatever ad attribution (gclid/fbclid/UTM) was captured on landing plus the
 * server-side IP/user-agent. There's no name/email/phone — the visitor only
 * tapped — so the row exists to be matched to the eventual Dialpad call or email
 * reply by click id + timestamp. Reuses the lead create's column-fallback retry.
 */
export async function createTapLead(
  tap: TapEvent,
): Promise<{ok: true; id: string} | {ok: false; error: string}> {
  const label = tap.kind === 'phone' ? 'Phone tap' : 'Email tap'
  // Pacific wall-clock timestamp — precise enough to line up with a Dialpad call.
  const nowWall = wallClock(new Date(), TIME_ZONE)
  const stamp = `${nowWall.slice(0, 10)} ${nowWall.slice(11, 16)}`

  const properties: Record<string, unknown> = {
    Name: {title: [{text: {content: `${label} · ${stamp} PT`}}]},
    Source: {select: {name: 'Website tap'}},
    Date: {date: {start: nowWall, time_zone: TIME_ZONE}},
  }

  const optionalColumns: Array<{name: string; fallbackNote: string}> = []
  applyAttribution(properties, optionalColumns, tap)

  const linkKind = tap.kind === 'phone' ? 'tel:' : 'mailto:'
  const notes = [
    `Anonymous ${tap.kind} tap on the website (${linkKind} link). No contact info captured — match to the Dialpad call / email reply by click id + time.`,
    tap.pagePath ? `Page: ${tap.pagePath}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return createNotionPage(properties, optionalColumns, notes)
}
