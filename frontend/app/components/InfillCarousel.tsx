'use client'

import Link from 'next/link'
import {useRef} from 'react'

export type InfillCarouselItem = {
  value: string
  label: string
  blurb: string
  href: string
  imageUrl: string | null
  projectName: string | null
}

/**
 * Horizontal, swipeable carousel of one featured gallery project per infill
 * type. Each card deep-links to that filtered view of the gallery. Swipe/scroll
 * on touch and trackpads; prev/next buttons appear on larger screens.
 */
export default function InfillCarousel({items}: {items: InfillCarouselItem[]}) {
  const scroller = useRef<HTMLDivElement>(null)

  const scrollByCards = (dir: number) => {
    const el = scroller.current
    if (!el) return
    el.scrollBy({left: dir * el.clientWidth * 0.8, behavior: 'smooth'})
  }

  if (!items.length) return null

  return (
    <div className="relative max-w-7xl mx-auto">
      <button
        type="button"
        aria-label="Previous"
        onClick={() => scrollByCards(-1)}
        className="hidden md:flex absolute -left-3 top-[42%] z-10 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-700 bg-gray-800/90 text-white backdrop-blur hover:border-gray-500"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={() => scrollByCards(1)}
        className="hidden md:flex absolute -right-3 top-[42%] z-10 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-700 bg-gray-800/90 text-white backdrop-blur hover:border-gray-500"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div
        ref={scroller}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <Link
            key={item.value}
            href={item.href}
            className="group flex w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800 transition-colors hover:border-sky-500/60 sm:w-[320px]"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-900">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.projectName || item.label}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-600">
                  Project photos coming soon
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4">
                <span className="text-lg font-semibold text-white">{item.label}</span>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-400">{item.blurb}</p>
              <span className="text-sm font-medium text-sky-400 transition-colors group-hover:text-sky-300">
                View projects &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
