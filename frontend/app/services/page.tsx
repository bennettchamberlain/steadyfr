import {Suspense} from 'react'
import Link from 'next/link'
import {TrackedLink} from '@/app/components/TrackedLink'
import ServicesHub from '@/app/services/ServicesHub'
import {GALLERY_CATEGORIES} from '@/app/gallery/categories'
import {articlesQuery} from '@/sanity/lib/queries'
import {sanityFetch} from '@/sanity/lib/live'

export const metadata = {
  alternates: {canonical: '/services'},
  title: 'Services & Guides | Steady Fence & Railing',
  description:
    'Railing services plus in-depth guides on railing types, infill and materials, and code — handrails, guardrails, cable rail, balusters, and custom work in the San Francisco Bay Area.',
}

const serviceCategories = [
  {
    title: 'Traditional Handrail',
    description:
      'Classic handrail designs that combine timeless elegance with modern durability. Perfect for both interior and exterior applications.',
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Guardrail with Balusters',
    description:
      'Safety-focused guardrail systems featuring various baluster styles. Ideal for decks, balconies, and elevated areas.',
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
]

// Infill styles shown on the Services page — matched 1:1 to the gallery filter
// categories (GALLERY_CATEGORIES is the source of truth for labels/values) so
// each card deep-links to that filtered view of the gallery.
const INFILL_DESCRIPTIONS: Record<string, string> = {
  'cable-rail':
    'Minimalist cable systems that maximize the view while keeping things safe — ideal for scenic, modern settings.',
  picket: 'Clean vertical pickets that add rigidity and safety without obstructing the view.',
  slat: 'Horizontal slat infill for a modern, screen-like look with a bit more privacy.',
  'no-infill':
    'An open top rail with no infill — the clearest possible view, for stairs and handrails where code allows.',
  custom: 'Bespoke infill tailored to your design vision and architectural requirements.',
}

export default async function ServicesPage() {
  const {data: articles} = await sanityFetch({query: articlesQuery})

  return (
    <>
      {/* Hero Section */}
      <section
        className="relative py-20 flex items-center justify-center"
        style={{background: 'linear-gradient(to bottom, #163861, #163861, #163861)'}}
      >
        <div
          className="absolute inset-0 opacity-25"
          style={
            {
              '--grid-color': '#ffffff',
              backgroundImage: `
                linear-gradient(to right, var(--grid-color) 2px, transparent 2px),
                linear-gradient(to bottom, var(--grid-color) 2px, transparent 2px),
                linear-gradient(to right, var(--grid-color) 3px, transparent 3px),
                linear-gradient(to bottom, var(--grid-color) 3px, transparent 3px)
              `,
              backgroundSize: '25px 25px, 25px 25px, 125px 125px, 125px 125px',
            } as React.CSSProperties
          }
        />
        <div className="container relative z-10 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Services &amp; Guides
            </h1>
            <p className="text-xl text-gray-400 mb-8 font-light">
              Expert railing work — plus guides on materials, styles, and code to help you choose.
            </p>
          </div>
        </div>
      </section>

      {/* Guides / Articles Hub */}
      <section className="py-20 bg-gray-950">
        <div className="container px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Guides &amp; Resources</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Straight answers on railing types, materials, and code — from the shop that builds them.
            </p>
          </div>
          <Suspense fallback={<p className="text-center text-sm text-gray-500">Loading guides…</p>}>
            <ServicesHub articles={articles} />
          </Suspense>
        </div>
      </section>

      {/* What We Build */}
      <section className="py-20 bg-gray-900 border-y border-gray-800">
        <div className="container px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">What We Build</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              A full range of railing solutions to suit your style and safety requirements.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
            {serviceCategories.map((service, idx) => (
              <div
                key={idx}
                className="bg-gray-800 rounded-lg p-8 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="text-white mb-4">{service.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-3">{service.title}</h3>
                <p className="text-gray-400 leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mb-6">
            Infill styles — tap any to see real projects in the gallery.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {GALLERY_CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={`/gallery?filter=${cat.value}`}
                className="group flex flex-col bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-sky-500/60 transition-colors"
              >
                <h3 className="text-xl font-semibold text-white mb-3">{cat.label}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1">
                  {INFILL_DESCRIPTIONS[cat.value]}
                </p>
                <span className="text-sky-400 text-sm font-medium group-hover:text-sky-300 transition-colors">
                  View projects &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-950">
        <div className="container px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Ready to Get Started?</h2>
            <p className="text-gray-400 mb-8 text-lg">
              Get a quote in a minute and have your railing installed in a week
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <TrackedLink
                href="/#quote-widget"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-md hover:bg-gray-100 transition-colors text-lg"
                eventName="InitiateCheckout"
                eventParams={{content_name: 'Services Page CTA - Get a Quote'}}
              >
                Get a Quote
              </TrackedLink>
              <Link
                href="/gallery"
                className="inline-flex items-center justify-center px-8 py-4 bg-gray-800 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors text-lg border border-gray-700"
              >
                View Gallery
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
