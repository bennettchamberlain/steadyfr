import Link from 'next/link'
import GalleryGrid from '@/app/components/GalleryGrid'
import {QuoteBuilder} from '@/app/components/QuoteBuilder/QuoteBuilder'
import {featuredGalleryProjectsQuery} from '@/sanity/lib/queries'
import {sanityFetch} from '@/sanity/lib/live'

export const metadata = {
  title: 'Steady Fence & Railing | San Francisco Bay Area',
  description:
    'Get a quote in a minute and a railing in a week. The shortest lead time in the San Francisco Bay Area. Quality railing installations including stair railings, deck rails, guardrails, and custom metalwork.',
}

export default async function HomePage() {
  const {data: featuredProjects} = await sanityFetch({
    query: featuredGalleryProjectsQuery,
  })

  return (
    <>
      {/* Hero Section */}
      {/* Change backgroundColor to any hex (#0a0a0a) or rgb (rgb(10, 10, 10)) value, or use gradient */}
      <section 
        className="relative min-h-[503px] max-h-[50vh] flex items-center justify-center"
        style={{
          background: 'linear-gradient(to bottom, #163861, #163861, #163861)' // Change this to your desired background color/gradient
        }}
      >
        {/* Old background grid - commented out */}
        {/* <div className="absolute inset-0 bg-[url('/images/tile-grid-white.png')] bg-size-[17px] opacity-5" /> */}
        {/* Graph paper pattern: 25px boxes, 2px small lines, 3px thick lines every 5 boxes (125px) */}
        {/* Change gridColor to any hex (#ffffff) or rgb (rgb(255, 255, 255)) value */}
        <div 
          className="absolute inset-0 opacity-25"
          style={{
            '--grid-color': '#ffffff', // Change this to your desired color (hex or rgb)
            backgroundImage: `
              linear-gradient(to right, var(--grid-color) 2px, transparent 2px),
              linear-gradient(to bottom, var(--grid-color) 2px, transparent 2px),
              linear-gradient(to right, var(--grid-color) 3px, transparent 3px),
              linear-gradient(to bottom, var(--grid-color) 3px, transparent 3px)
            `,
            backgroundSize: '25px 25px, 25px 25px, 125px 125px, 125px 125px'
          } as React.CSSProperties}
        />
        <div className="container relative z-10 py-20 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
              <a href="#quote-widget" className="text-white-300 cursor-pointer hover:opacity-90 transition-opacity">
                Get a quote in a minute
              </a>
              <br />
              <span className="text-gray-300">and a railing in a week</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-400 mb-8 font-medium">
              The shortest lead time in the San Francisco Bay Area
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#quote-widget"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-md hover:bg-gray-100 transition-colors text-lg"
              >
                Get a Quote
              </a>
              <Link
                href="/gallery"
                className="inline-flex items-center justify-center px-8 py-4 bg-gray-800 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors text-lg border border-gray-700"
              >
                View Our Work
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Widget Section */}
      <section id="quote-widget" className="py-16 bg-gray-900 border-y border-gray-800 scroll-mt-20">
        <div className="container px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-6 sm:p-8 border border-gray-700">
              <QuoteBuilder />
            </div>
          </div>
        </div>
      </section>

      {/* Preview Gallery Section */}
      {featuredProjects && featuredProjects.length > 0 && (
        <section className="py-20 bg-gray-950">
          <div className="container px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Featured Projects
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Explore our recent work showcasing quality craftsmanship and attention to detail
              </p>
            </div>
            <GalleryGrid projects={featuredProjects} columns={3} />
            <div className="text-center mt-12">
              <Link
                href="/gallery"
                className="inline-flex items-center justify-center px-8 py-3 bg-gray-800 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors border border-gray-700"
              >
                View All Projects
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Trust Section - Yelp Reviews */}
      <section className="py-20 bg-gray-900 border-t border-gray-800">
        <div className="container px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Trusted by Bay Area Homeowners
            </h2>
            <p className="text-gray-400 mb-8 text-lg">
              See what our customers are saying about our work
            </p>
            <a
              href="https://www.yelp.com/biz/sturdy-fence-and-railing-san-francisco"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
            >
              <svg
                className="w-6 h-6 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M21.5 9.5c-.1-1.1-.3-2.2-.6-3.2-.3-1-.7-2-1.2-2.9-.5-.9-1.1-1.7-1.8-2.5-.7-.8-1.5-1.5-2.4-2.1-.9-.6-1.9-1.1-2.9-1.5-1-.4-2-.7-3.1-.9-1.1-.2-2.2-.3-3.4-.3-1.2 0-2.3.1-3.4.3-1.1.2-2.1.5-3.1.9-1 .4-2 .9-2.9 1.5-.9.6-1.7 1.3-2.4 2.1-.7.8-1.3 1.6-1.8 2.5-.5.9-.9 1.9-1.2 2.9-.3 1-.5 2.1-.6 3.2-.1 1.1-.1 2.2-.1 3.4 0 1.2.1 2.3.1 3.4.1 1.1.3 2.2.6 3.2.3 1 .7 2 1.2 2.9.5.9 1.1 1.7 1.8 2.5.7.8 1.5 1.5 2.4 2.1.9.6 1.9 1.1 2.9 1.5 1 .4 2 .7 3.1.9 1.1.2 2.2.3 3.4.3 1.2 0 2.3-.1 3.4-.3 1.1-.2 2.1-.5 3.1-.9 1-.4 2-.9 2.9-1.5.9-.6 1.7-1.3 2.4-2.1.7-.8 1.3-1.6 1.8-2.5.5-.9.9-1.9 1.2-2.9.3-1 .5-2.1.6-3.2.1-1.1.1-2.2.1-3.4 0-1.2-.1-2.3-.1-3.4zm-9.5 2.5l-3.5 3.5-1.5-1.5L9.5 12l1.5-1.5L12.5 12l3.5-3.5L17.5 10l-5.5 5.5z" />
              </svg>
              Read Reviews on Yelp
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
