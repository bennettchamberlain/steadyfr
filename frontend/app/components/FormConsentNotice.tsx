import Link from 'next/link'

/**
 * Consent / contact disclosure shown beneath form submit buttons.
 * Covers the Privacy Policy agreement plus contact consent. When `sms` is true
 * (a form that collects a phone number), it adds phone/text consent with the
 * SMS STOP + HELP keywords (A2P 10DLC / CTIA); otherwise it's email-only.
 * Wording lives here so it can be updated in one place after legal review.
 */
export default function FormConsentNotice({
  className = '',
  sms = true,
}: {
  className?: string
  sms?: boolean
}) {
  return (
    <p className={`text-[11px] leading-relaxed text-gray-500 ${className}`}>
      By submitting, you agree to our{' '}
      <Link href="/privacy" className="underline hover:text-gray-300 transition-colors">
        Privacy Policy
      </Link>{' '}
      and to be contacted by Steady Fence &amp; Railing by{' '}
      {sms ? 'phone, text, and email' : 'email'} about your request.
      {sms && ' Msg & data rates may apply; reply STOP to opt out, HELP for help.'}
    </p>
  )
}
