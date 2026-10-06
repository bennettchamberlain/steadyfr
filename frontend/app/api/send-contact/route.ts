import {NextRequest, NextResponse} from 'next/server'
import nodemailer from 'nodemailer'

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

  if (!data.name?.trim() || (!data.email?.trim() && !data.phone?.trim())) {
    return NextResponse.json(
      {error: 'Name and an email or phone are required.'},
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
  if (data.path === 'scheduleCall' && data.convenience) {
    add('Scheduling', 'Flexible — contact at their convenience')
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

  const htmlContent = `
  <div style="background:#030712;padding:24px;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#0d1320;border:1px solid #283142;border-radius:12px;overflow:hidden">
      <div style="background:#163861;padding:18px 20px">
        <div style="color:#fff;font-size:18px;font-weight:700">New contact form submission</div>
        <div style="color:#c7d3e6;font-size:13px;margin-top:2px">Steady Fence &amp; Railing — website</div>
      </div>
      <table style="width:100%;border-collapse:collapse">${rowsHtml}</table>
    </div>
  </div>`

  const textContent =
    'New contact form submission\n\n' +
    rows.map(([k, v]) => `${k}: ${v}`).join('\n') +
    '\n\n— Steady Fence & Railing website'

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
    from: '"Steady Fence & Railing Website" <sales@steadyfnr.com>',
    to: 'sales@steadyfnr.com',
    bcc: 'help@superhotfab.com',
    replyTo: data.email?.trim() || undefined,
    subject: `New contact — ${data.name}${data.company ? ` (${data.company})` : ''}`,
    html: htmlContent + skippedNote,
    text: textContent + (skipped.length ? `\n\nFiles too large to attach: ${skipped.join(', ')}` : ''),
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

  return NextResponse.json({ok: true})
}
