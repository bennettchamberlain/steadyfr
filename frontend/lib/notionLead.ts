const NOTION_VERSION = '2022-06-28'
const TIME_ZONE = 'America/Los_Angeles'
const DATABASE_ID =
  process.env.NOTION_DATABASE_ID?.trim() || '3f101274-8342-804a-b00a-d041a2867b1b'

export type LeadSource = 'Quote' | 'Call' | 'Shop visit'

export type WebsiteLead = {
  name: string
  email?: string
  phone?: string
  zip?: string
  notes?: string
  source: LeadSource
  /**
   * Pacific wall-clock appointment. Omit to log an all-day lead on today's Pacific date.
   * durationMinutes defaults to 60.
   */
  visit?: {date: string; time: string; durationMinutes?: number}
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

  return {date: {start: pacificDateOnly(new Date())}}
}

function richText(value: string) {
  return {rich_text: [{text: {content: value.slice(0, 2000)}}]}
}

export async function createWebsiteLead(
  lead: WebsiteLead,
): Promise<{ok: true; id: string} | {ok: false; error: string}> {
  const token = process.env.NOTION_TOKEN?.trim()
  if (!token) {
    return {ok: false, error: 'NOTION_TOKEN is not set'}
  }

  const properties: Record<string, unknown> = {
    Name: {
      title: [{text: {content: (lead.name || lead.email || 'Website lead').slice(0, 200)}}],
    },
    Source: {select: {name: lead.source}},
    Date: dateProperty(lead),
  }

  if (lead.email) properties.Email = {email: lead.email}
  if (lead.phone) properties.Phone = {phone_number: lead.phone}
  if (lead.zip) properties.Zip = richText(lead.zip)
  if (lead.notes) properties.Notes = richText(lead.notes)

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
    return {ok: false, error: err.message || `Notion request failed (${response.status})`}
  }

  const data = (await response.json()) as {id: string}
  return {ok: true, id: data.id}
}
