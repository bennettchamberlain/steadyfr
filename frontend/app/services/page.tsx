import {Suspense} from 'react'
import ArticleCTA from '@/app/components/ArticleCTA'
import InfillCarousel, {type InfillCarouselItem} from '@/app/components/InfillCarousel'
import ServicesHub from '@/app/services/ServicesHub'
import {GALLERY_CATEGORIES} from '@/app/gallery/categories'
import {articlesQuery, allGalleryProjectsQuery} from '@/sanity/lib/queries'
import {sanityFetch} from '@/sanity/lib/live'
import {urlForImage} from '@/sanity/lib/utils'

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
      'Classic handrails that pair timeless looks with modern durability — interior or exterior.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12l14-9.8M5 12V22M19 2.2V12.2" />
      </svg>
    ),
  },
  {
    title: 'Guardrail with Balusters',
    description:
      'Safety-focused guardrails in a range of baluster styles — decks, balconies, and elevated spans.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
  {
    title: 'Screens & Partitions',
    description:
      'Decorative screens, stair dividers, and fence panels that define a space without closing off light or view.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 2.2V22M9 2.2V22M14 2.2V22M19 2.2V22" />
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
  const [{data: articles}, {data: galleryProjects}] = await Promise.all([
    sanityFetch({query: articlesQuery}),
    sanityFetch({query: allGalleryProjectsQuery}),
  ])

  // One project per infill type for the carousel. Prefer projects flagged with
  // the dedicated `infillFeatured` toggle (separate from the home-page
  // `featured`), otherwise the first match (already ordered).
  const infillItems: InfillCarouselItem[] = GALLERY_CATEGORIES.map((cat) => {
    const matches = (galleryProjects || []).filter(
      (p) => (p.categories || []).includes(cat.value) && p.photoGallery?.length,
    )
    const chosen = matches.find((p) => p.infillFeatured) || matches[0]
    const photo = chosen?.photoGallery?.[0]
    const imageUrl = photo?.asset
      ? urlForImage(photo).width(640).height(480).fit('crop').url()
      : null
    return {
      value: cat.value,
      label: cat.label,
      blurb: INFILL_DESCRIPTIONS[cat.value],
      href: `/gallery?filter=${cat.value}`,
      imageUrl,
      projectName: chosen?.projectName ?? null,
    }
  })

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-5xl mx-auto mb-14">
            {serviceCategories.map((service, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 hover:border-gray-700 transition-colors"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
                  {service.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-1.5">{service.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mb-6">
            Infill styles — tap any to see real projects in the gallery.
          </p>
          <InfillCarousel items={infillItems} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-950">
        <div className="container px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <ArticleCTA />
          </div>
        </div>
      </section>
    </>
  )
}
