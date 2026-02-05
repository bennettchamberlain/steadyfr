import {Suspense} from 'react'
import {QuoteBuilder} from '@/app/components/QuoteBuilder/QuoteBuilder'

export const metadata = {
  title: 'Get a Quote | Steady Fence & Railing',
  description:
    'Get a quote in a minute and a railing installed in a week. The shortest lead time in the San Francisco Bay Area.',
}

export default function QuotePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
        <div className="absolute inset-0 bg-[url('/images/tile-grid-white.png')] bg-size-[17px] opacity-5" />
        <div className="container relative z-10 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              A Railing Installed in a Week!
            </h1>
            <p className="text-xl text-gray-400 mb-4 font-light">
              Get a quote in a minute and have your railing installed in a week
            </p>
            <p className="text-lg text-gray-500">
              The shortest lead time in the San Francisco Bay Area
            </p>
          </div>
        </div>
      </section>

      {/* Quote Widget Section */}
      <section className="py-20 bg-gray-950 min-h-screen">
        <div className="container px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="bg-gray-900 rounded-lg p-8 md:p-12 border border-gray-800">
              <div className="mb-8 text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Get Your Free Quote
                </h2>
                <p className="text-gray-400">
                  Fill out the form below to receive a detailed quote for your railing project
                </p>
              </div>
              
              {/* Quote Builder Widget */}
              <Suspense fallback={<div className="text-gray-400 text-center py-8">Loading quote builder...</div>}>
                <QuoteBuilder />
              </Suspense>

              {/* Additional Info */}
              <div className="mt-8 pt-8 border-t border-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Fast Turnaround</h3>
                    <p className="text-gray-400 text-sm">
                      Get your quote in minutes, installation within a week
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Free Estimates</h3>
                    <p className="text-gray-400 text-sm">
                      No obligation, transparent pricing for all projects
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
