import nodemailer from 'nodemailer'

/**
 * Failsafe for the Notion lead log: when a website lead (quote, contact form or
 * phone/email tap) can't be written to Notion, email the lead's details plus
 * Notion's exact error to sales@ so the lead is never lost silently and the
 * cause is visible without opening the Vercel logs.
 *
 * Never throws — a failed alert is logged and swallowed so it can't break the
 * customer-facing response.
 */

const ALERT_TO = 'sales@steadyfnr.com'
const ALERT_FROM = '"Steady website" <sales@steadyfnr.com>'

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

/** Flatten a Notion `properties` object into readable "Column: value" lines. */
type TextPart = {text?: {content?: string}}
type NotionValue = {
  title?: TextPart[]
  rich_text?: TextPart[]
  select?: {name?: string}
  multi_select?: Array<{name?: string}>
  status?: {name?: string}
  email?: string
  phone_number?: string
  number?: number
  date?: {start?: string; end?: string}
}

function describeProperties(properties: Record<string, unknown>): string[] {
  const lines: string[] = []
  const join = (parts: TextPart[]) => parts.map((t) => t.text?.content ?? '').join('')
  for (const [name, raw] of Object.entries(properties)) {
    const p = (raw ?? {}) as NotionValue
    let value = ''
    if (p.title) value = join(p.title)
    else if (p.rich_text) value = join(p.rich_text)
    else if (p.select) value = p.select.name ?? ''
    else if (p.multi_select) value = p.multi_select.map((o) => o.name).join(', ')
    else if (p.status) value = p.status.name ?? ''
    else if ('email' in p) value = p.email ?? ''
    else if ('phone_number' in p) value = p.phone_number ?? ''
    else if ('number' in p) value = String(p.number ?? '')
    else if (p.date) value = [p.date.start, p.date.end].filter(Boolean).join(' → ')
    else value = JSON.stringify(p)
    if (value) lines.push(`${name}: ${value}`)
  }
  return lines
}

export async function alertNotionLeadFailure(
  properties: Record<string, unknown>,
  error: string,
): Promise<void> {
  // Preview deployments use test data; only alert from production (or when
  // VERCEL_ENV is unset, e.g. a self-hosted run).
  const env = process.env.VERCEL_ENV
  if (env && env !== 'production') return
  if (!transporter) {
    console.error('[leadAlert] Cannot send Notion-failure alert: Brevo SMTP is not configured')
    return
  }

  const details = describeProperties(properties)
  const name = details.find((l) => l.startsWith('Name: '))?.slice(6) || 'Website lead'
  const form = details.find((l) => l.startsWith('Form: '))?.slice(6) || 'lead'

  const text = [
    'A website lead could NOT be saved to Notion. Add it by hand — details below.',
    '',
    `Notion error: ${error}`,
    '',
    ...details,
    '',
    'If every lead is failing, check NOTION_TOKEN in the Vercel production env vars.',
  ].join('\n')

  try {
    await transporter.sendMail({
      from: ALERT_FROM,
      to: ALERT_TO,
      subject: `⚠️ Lead not saved to Notion: ${name} (${form})`,
      text,
    })
  } catch (err) {
    console.error('[leadAlert] Failed to send Notion-failure alert:', err)
  }
}
