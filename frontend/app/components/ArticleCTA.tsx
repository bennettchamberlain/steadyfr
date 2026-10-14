import Link from 'next/link'
import {TrackedLink} from '@/app/components/TrackedLink'

/**
 * Conversion CTA shown at the end of every article so educational traffic has a
 * clear next step (get a quote or book a call), not just a read.
 */
export default function ArticleCTA() {
  return (
    <aside className="mt-14 rounded-2xl border border-gray-800 bg-gray-900 p-8 sm:p-10 text-center">
      <h2 className="text-2xl sm:text-3xl font-bold text-white">
        Thinking about a railing project?
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-gray-400">
        Get a quote in a minute, or book a call and we&rsquo;ll walk you through the options — from
        materials and code to what it&rsquo;ll cost.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
        <TrackedLink
          href="/#quote-widget"
          className="inline-flex items-center justify-center rounded-md bg-white px-7 py-3.5 text-base font-semibold text-gray-900 transition-colors hover:bg-gray-100"
          eventName="InitiateCheckout"
          eventParams={{content_name: 'Article CTA - Get a Quote'}}
        >
          Get a Quote
        </TrackedLink>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center rounded-md border border-gray-700 bg-gray-800 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-gray-700"
        >
          Book a Call
        </Link>
      </div>
    </aside>
  )
}
