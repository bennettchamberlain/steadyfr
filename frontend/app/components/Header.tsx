import Link from 'next/link'
import {settingsQuery, featuredArticleQuery} from '@/sanity/lib/queries'
import {sanityFetch} from '@/sanity/lib/live'
import ServicesNavDropdown from '@/app/components/ServicesNavDropdown'

export default async function Header() {
  let settings: {title?: string} | null = null
  let featured: {title?: string | null; slug?: string | null} | null = null
  try {
    const [settingsResult, featuredResult] = await Promise.all([
      sanityFetch({query: settingsQuery}),
      sanityFetch({query: featuredArticleQuery}),
    ])
    settings = settingsResult.data
    featured = featuredResult.data
  } catch (error) {
    console.error('Error fetching settings for header:', error)
    // Continue with defaults if fetch fails
  }

  return (
    <header className="fixed z-50 h-20 inset-0 bg-gray-950/95 flex items-center backdrop-blur-lg border-b border-gray-800">
      <div className="container py-4 px-4 sm:px-6 w-full">
        <div className="flex items-center justify-between gap-5">
          <Link className="flex items-center gap-2" href="/">
            <span className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-[1.11]">
              {settings?.title || 'Steady Fence & Railing'}
            </span>
          </Link>

          <nav>
            <ul
              role="list"
              className="flex items-center gap-4 md:gap-6 leading-5 text-xs sm:text-sm tracking-tight"
            >
              <ServicesNavDropdown featured={featured} />
              <li>
                <Link href="/gallery" className="text-gray-300 hover:text-white transition-colors">
                  Gallery
                </Link>
              </li>
              <li>
                <Link href="/#quote-widget" className="text-gray-300 hover:text-white transition-colors">
                  Quote
                </Link>
              </li>
              <li className="sm:before:w-[1px] sm:before:bg-gray-700 before:block flex sm:gap-4 md:gap-6">
                <Link
                  className="rounded-md flex gap-2 items-center bg-white hover:bg-gray-100 text-gray-900 py-2 px-4 justify-center sm:py-2.5 sm:px-5 transition-colors duration-200 font-medium"
                  href="/contact"
                >
                  <span className="whitespace-nowrap">Contact</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  )
}
