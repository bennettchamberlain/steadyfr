import GalleryGrid from '@/app/components/GalleryGrid'
import {allGalleryProjectsQuery} from '@/sanity/lib/queries'
import {sanityFetch} from '@/sanity/lib/live'

export const metadata = {
  title: 'Gallery | Steady Fence & Railing',
  description:
    'Browse our portfolio of railing projects throughout the San Francisco Bay Area. Stair railings, deck rails, guardrails, gates, and custom metalwork.',
}

export default async function GalleryPage() {
  const {data: projects} = await sanityFetch({
    query: allGalleryProjectsQuery,
  })

  return (
    <>
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
        <div className="absolute inset-0 bg-[url('/images/tile-grid-white.png')] bg-size-[17px] opacity-5" />
        <div className="container relative z-10 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Project Gallery
            </h1>
            <p className="text-xl text-gray-400 mb-8 font-light">
              Explore our recent work showcasing quality craftsmanship and attention to detail
            </p>
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-20 bg-gray-950 min-h-screen">
        <div className="container px-4 sm:px-6">
          {projects && projects.length > 0 ? (
            <GalleryGrid projects={projects} columns={3} />
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg mb-4">No projects available yet.</p>
              <p className="text-gray-500 text-sm">
                Check back soon or contact us to see examples of our work.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
