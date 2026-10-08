import {NextRequest, NextResponse} from 'next/server'
import nodemailer from 'nodemailer'
import {appointmentFromSlot, createWebsiteLead, pacificDatePlus} from '@/lib/notionLead'

// Node runtime required for nodemailer
export const runtime = 'nodejs'

interface ContactFile {
  name: string
  type: string
  data: string // base64 (no data: prefix)
}

interface ContactData {
  name: string
  email?: string
  phone?: string
  company?: string
  path?: string // 'scheduleCall' | 'visitShop'
  convenience?: boolean
  visitDate?: string
  slot?: string
  street?: string
  city?: string
  region?: string
  zip?: string
  propType?: string
  mode?: string // 'specs' | 'talk'
  location?: string[]
  railType?: string[]
  application?: string[]
  infill?: string[]
  additional?: string
  files?: ContactFile[]
}

// Brevo SMTP credentials come from environment variables.
const BREVO_SMTP_USER = process.env.BREVO_SMTP_USER
const BREVO_SMTP_PASS = process.env.BREVO_SMTP_PASS

const transporter =
  BREVO_SMTP_USER && BREVO_SMTP_PASS
    ? nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {user: BREVO_SMTP_USER, pass: BREVO_SMTP_PASS},
        requireTLS: true,
        tls: {rejectUnauthorized: false},
      })
    : null

const esc = (s: string) =>
  (s || '').replace(/[&<>]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c] as string))

const PATH_LABEL: Record<string, string> = {
  scheduleCall: 'Schedule a call',
  visitShop: 'Visit the shop',
}

const MAX_ATTACH_BYTES = 10 * 1024 * 1024 // 10 MB total

export async function POST(request: NextRequest) {
  if (!transporter) {
    return NextResponse.json(
      {error: 'Email service is not configured.'},
      {status: 500},
    )
  }

  let data: ContactData
  try {
    data = await request.json()
  } catch {
    return NextResponse.json({error: 'Invalid request.'}, {status: 400})
  }

  if (!data.name?.trim() || !data.email?.trim() || !data.phone?.trim()) {
    return NextResponse.json(
      {error: 'Name, email, and phone are required.'},
      {status: 400},
    )
  }

  // Build the summary rows shown in the email.
  const rows: Array<[string, string]> = []
  const add = (k: string, v?: string | string[]) => {
    const val = Array.isArray(v) ? v.join(', ') : v
    if (val && val.trim()) rows.push([k, val])
  }
  add('Name', data.name)
  add('Email', data.email)
  add('Phone', data.phone)
  add('Company / firm', data.company)
  add('Connect via', data.path ? PATH_LABEL[data.path] : '')
  if (data.convenience) {
    add(
      'Scheduling',
      data.path === 'visitShop'
        ? "Flexible — we'll reach out to find a time"
        : 'Flexible — contact at their convenience',
    )
  } else if (data.visitDate) {
    add(
      data.path === 'visitShop' ? 'Requested shop visit' : 'Requested call',
      [data.visitDate, data.slot].filter(Boolean).join(' · '),
    )
  }
  const addr = [
    data.street,
    data.city,
    [data.region, data.zip].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ')
  add('Property', addr)
  add('Property type', data.propType)
  if (data.mode === 'talk') add('Project', 'Still deciding — wants to talk')
  if (data.mode === 'specs') {
    add('Location', data.location)
    add('Rail type', data.railType)
    add('Application', data.application)
    add('Infill', data.infill)
  }
  add('Notes', data.additional)

  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 14px;color:#9aa3b2;font-size:13px;border-bottom:1px solid #22293a;white-space:nowrap;vertical-align:top">${esc(
          k,
        )}</td><td style="padding:8px 14px;color:#f5f7fa;font-size:14px;border-bottom:1px solid #22293a">${esc(
          v,
        )}</td></tr>`,
    )
    .join('')

  const firstName = data.name.trim().split(/\s+/)[0] || 'there'
  const fmtDay = (iso?: string) => {
    if (!iso) return ''
    try {
      return new Date(iso + 'T00:00').toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'})
    } catch {
      return iso
    }
  }
  const booked = !!(data.visitDate && data.slot && !data.convenience)
  let nextLine: string
  if (booked && data.path === 'visitShop') {
    nextLine = `You're booked to visit the shop on <b>${esc(fmtDay(data.visitDate))} · ${esc(data.slot || '')}</b>. We look forward to seeing you.`
  } else if (booked) {
    nextLine = `You asked us to call you on <b>${esc(fmtDay(data.visitDate))} · ${esc(data.slot || '')}</b>. We'll reach out then.`
  } else {
    nextLine = `We'll reach out shortly to find a time that works.`
  }
  const nextLineText = nextLine.replace(/<\/?b>/g, '')

  const htmlContent = `
  <div style="background:#030712;padding:24px;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#0d1320;border:1px solid #283142;border-radius:12px;overflow:hidden">
      <div style="background:#163861;padding:18px 20px">
        <div style="color:#fff;font-size:18px;font-weight:700">We received your request</div>
        <div style="color:#c7d3e6;font-size:13px;margin-top:2px">Steady Fence &amp; Railing</div>
      </div>
      <div style="padding:20px">
        <p style="color:#f5f7fa;font-size:15px;margin:0 0 14px">Hi ${esc(firstName)},</p>
        <p style="color:#c7d3e6;font-size:14px;line-height:1.6;margin:0 0 14px">Thanks for reaching out to Steady Fence &amp; Railing — your request came through and we'll be in touch soon.</p>
        <p style="color:#c7d3e6;font-size:14px;line-height:1.6;margin:0 0 18px">${nextLine}</p>
        <div style="color:#9aa3b2;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 4px">What you sent us</div>
        <table style="width:100%;border-collapse:collapse">${rowsHtml}</table>
        <p style="color:#c7d3e6;font-size:14px;line-height:1.6;margin:18px 0 0">Questions in the meantime? Call or text <b style="color:#fff">(415) 347-3270</b> or just reply to this email.</p>
        <p style="color:#6b7585;font-size:13px;margin:16px 0 0">— Steady Fence &amp; Railing<br>San Francisco Bay Area</p>
      </div>
    </div>
  </div>`

  const textContent =
    `Hi ${firstName},\n\n` +
    `Thanks for reaching out to Steady Fence & Railing — your request came through and we'll be in touch soon.\n\n` +
    `${nextLineText}\n\n` +
    `What you sent us:\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join('\n') +
    `\n\nQuestions? Call or text (415) 347-3270 or reply to this email.\n\n— Steady Fence & Railing\nSan Francisco Bay Area`

  // Attachments, capped at a total size to stay within email limits.
  const attachments: Array<{filename: string; content: Buffer; contentType: string}> = []
  let totalBytes = 0
  const skipped: string[] = []
  for (const f of data.files || []) {
    try {
      const buf = Buffer.from(f.data, 'base64')
      if (totalBytes + buf.length > MAX_ATTACH_BYTES) {
        skipped.push(f.name)
        continue
      }
      totalBytes += buf.length
      attachments.push({
        filename: f.name || 'attachment',
        content: buf,
        contentType: f.type || 'application/octet-stream',
      })
    } catch {
      skipped.push(f.name)
    }
  }

  const skippedNote = skipped.length
    ? `<p style="color:#9aa3b2;font-size:12px;max-width:560px;margin:10px auto 0">Some files were too large to attach: ${esc(
        skipped.join(', '),
      )}</p>`
    : ''

  const mailOptions = {
    from: '"Steady Fence & Railing" <sales@steadyfnr.com>',
    to: (data.email || '').trim(),
    bcc: 'help@superhotfab.com',
    replyTo: 'sales@steadyfnr.com',
    subject: 'We received your request — Steady Fence & Railing',
    html: htmlContent + skippedNote,
    text: textContent + (skipped.length ? `\n\nNote: some files were too large to attach: ${skipped.join(', ')}` : ''),
    attachments,
  }

  try {
    await transporter.verify()
    await transporter.sendMail(mailOptions)
  } catch (err) {
    console.error('[send-contact] send failed:', err)
    return NextResponse.json(
      {error: 'Could not send your message. Please email sales@steadyfnr.com directly.'},
      {status: 502},
    )
  }

  const kind = data.path === 'visitShop' ? 'shop' : 'call'
  const parsed =
    data.visitDate && data.slot && !data.convenience
      ? appointmentFromSlot(data.slot, kind)
      : null
  const notionResult = await createWebsiteLead({
    name: data.name.trim(),
    email: data.email,
    phone: data.phone,
    company: data.company,
    street: data.street,
    city: data.city,
    state: data.region,
    zip: data.zip,
    propertyType: data.propType,
    project: data.mode === 'specs' ? 'Specs' : data.mode === 'talk' ? 'Wants to talk' : undefined,
    location: data.mode === 'specs' ? data.location : undefined,
    railType: data.mode === 'specs' ? data.railType : undefined,
    application: data.mode === 'specs' ? data.application : undefined,
    infill: data.mode === 'specs' ? data.infill : undefined,
    files: (data.files ?? []).map((file) => file.name),
    notes: data.additional,
    source: kind === 'shop' ? 'Shop visit' : 'Call',
    visit:
      parsed && data.visitDate
        ? {date: data.visitDate, time: parsed.time, durationMinutes: parsed.durationMinutes}
        : undefined,
    // Any lead without a concrete booked slot — whether they tapped the flexible
    // button or skipped scheduling entirely — counts as flexible and is marked on
    // the calendar for the day after they submit.
    allDayDate: booked ? undefined : pacificDatePlus(1),
  })
  if (!notionResult.ok) {
    console.error('[send-contact] Notion write failed:', notionResult.error)
    return NextResponse.json(
      {
        ok: false,
        emailed: true,
        notionError: notionResult.error,
        error: `Notion did not save this lead: ${notionResult.error}`,
      },
      {status: 502},
    )
  }

  return NextResponse.json({ok: true, notionOk: true})
}
