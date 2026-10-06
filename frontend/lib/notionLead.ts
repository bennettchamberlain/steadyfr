const NOTION_VERSION = '2022-06-28'
const TIME_ZONE = 'America/Los_Angeles'
const DATABASE_ID =
  process.env.NOTION_DATABASE_ID?.trim() || '3f101274-8342-804a-b00a-d041a2867b1b'

export type LeadSource = 'Quote' | 'Site visit'

export type WebsiteLead = {
  name: string
  email: string
  phone?: string
  zip?: string
  notes?: string
  source: LeadSource
  /** Pacific wall-clock site visit. Omit to log an all-day lead on today's Pacific date. */
  visit?: {date: string; time: string}
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
    const end = new Date(start.getTime() + 60 * 60 * 1000)
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
