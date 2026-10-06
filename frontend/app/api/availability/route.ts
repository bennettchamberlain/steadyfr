import {NextRequest, NextResponse} from 'next/server'

// Node runtime + always fresh (bookings change constantly).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NOTION_VERSION = '2022-06-28'
const TIME_ZONE = 'America/Los_Angeles'
const DATABASE_ID =
  process.env.NOTION_DATABASE_ID?.trim() || '3f101274-8342-804a-b00a-d041a2867b1b'

// Pacific wall-clock {date:'YYYY-MM-DD', minutes:0-1439} for an ISO instant.
function pacificParts(iso: string): {date: string; minutes: number} | null {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => {
    const v = p.find((x) => x.type === t)?.value ?? '00'
    return v === '24' ? '00' : v
  }
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  }
}

export async function GET(request: NextRequest) {
  const token = process.env.NOTION_TOKEN?.trim()
  // No token locally → return empty so the calendar still works (shows all slots).
  if (!token) return NextResponse.json({booked: {}})

  const {searchParams} = new URL(request.url)
  const start = searchParams.get('start') // YYYY-MM-DD (inclusive)
  const end = searchParams.get('end') // YYYY-MM-DD (inclusive)

  const filter =
    start && end
      ? {
          and: [
            {property: 'Date', date: {on_or_after: start}},
            {property: 'Date', date: {on_or_before: `${end}T23:59:59`}},
          ],
        }
      : undefined

  const booked: Record<string, Array<[number, number]>> = {}
  let cursor: string | undefined
  try {
    do {
      const res = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter,
          start_cursor: cursor,
          page_size: 100,
        }),
      })
      if (!res.ok) {
        // Fail open: don't block the whole form if Notion hiccups.
        return NextResponse.json({booked: {}, warning: `notion ${res.status}`})
      }
      const data = (await res.json()) as {
        results: Array<{properties?: Record<string, {date?: {start?: string; end?: string} | null}>}>
        has_more?: boolean
        next_cursor?: string | null
      }
      for (const page of data.results || []) {
        const dateProp = page.properties?.Date?.date
        if (!dateProp?.start) continue
        // All-day entries (date only, no time) don't block a slot.
        if (!dateProp.start.includes('T')) continue
        const s = pacificParts(dateProp.start)
        if (!s) continue
        const e = dateProp.end ? pacificParts(dateProp.end) : null
        // End minutes on the same Pacific day; default to +30 if missing/odd.
        let endMin = e && e.date === s.date ? e.minutes : s.minutes + 30
        if (endMin <= s.minutes) endMin = s.minutes + 30
        ;(booked[s.date] ||= []).push([s.minutes, endMin])
      }
      cursor = data.has_more ? data.next_cursor || undefined : undefined
    } while (cursor)
  } catch {
    return NextResponse.json({booked: {}, warning: 'notion error'})
  }

  return NextResponse.json({booked})
}
