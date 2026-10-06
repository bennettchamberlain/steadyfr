import {NextRequest, NextResponse} from 'next/server'
import {createWebsiteLead} from '@/lib/notionLead'

export const runtime = 'nodejs'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  let body: {
    name?: string
    email?: string
    phone?: string
    zip?: string
    message?: string
    date?: string
    time?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({error: 'Invalid request'}, {status: 400})
  }

  const name = body.name?.trim() ?? ''
  const email = body.email?.trim() ?? ''
  const phone = body.phone?.trim() ?? ''
  const zip = body.zip?.trim() ?? ''
  const message = body.message?.trim() ?? ''
  const date = body.date?.trim() ?? ''
  const time = body.time?.trim() ?? ''

  if (!name) {
    return NextResponse.json({error: 'Name is required'}, {status: 400})
  }
  if (!emailRegex.test(email)) {
    return NextResponse.json({error: 'A valid email is required'}, {status: 400})
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({error: 'Pick a date and time for the visit'}, {status: 400})
  }

  const result = await createWebsiteLead({
    name,
    email,
    phone,
    zip,
    notes: message,
    source: 'Site visit',
    visit: {date, time},
  })

  if (!result.ok) {
    console.error('[contact] Notion write failed:', result.error)
    return NextResponse.json(
      {
        error:
          'We could not save your request. Call (415) 635-7014 or email sales@steadyfnr.com.',
      },
      {status: 502},
    )
  }

  return NextResponse.json({success: true})
}
