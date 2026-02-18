import Link from 'next/link'

export const metadata = {
  title: 'Contact Us | Steady Fence & Railing',
  description:
    'Contact Steady Fence & Railing in the San Francisco Bay Area. Email or call us for a free quote on your railing project.',
}

export default function ContactPage() {
  return (
    <>
      {/* Hero Section */}
      <section 
        className="relative py-20 flex items-center justify-center"
        style={{
          background: 'linear-gradient(to bottom, #163861, #163861, #163861)'
        }}
      >
        <div 
          className="absolute inset-0 opacity-25"
          style={{
            '--grid-color': '#ffffff',
            backgroundImage: `
              linear-gradient(to right, var(--grid-color) 2px, transparent 2px),
              linear-gradient(to bottom, var(--grid-color) 2px, transparent 2px),
              linear-gradient(to right, var(--grid-color) 3px, transparent 3px),
              linear-gradient(to bottom, var(--grid-color) 3px, transparent 3px)
            `,
            backgroundSize: '25px 25px, 25px 25px, 125px 125px, 125px 125px'
          } as React.CSSProperties}
        />
        <div className="container relative z-10 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Contact Us
            </h1>
            <p className="text-xl text-gray-400 mb-8 font-light">
              Get in touch for a free quote or to discuss your railing project
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-gray-950 min-h-screen">
        <div className="container px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div 
              className="rounded-lg p-8 md:p-12 border border-gray-800 relative"
              style={{
                background: 'linear-gradient(to bottom, #163861, #163861, #163861)'
              }}
            >
              <div 
                className="absolute inset-0 opacity-25 rounded-lg"
                style={{
                  '--grid-color': '#ffffff',
                  backgroundImage: `
                    linear-gradient(to right, var(--grid-color) 2px, transparent 2px),
                    linear-gradient(to bottom, var(--grid-color) 2px, transparent 2px),
                    linear-gradient(to right, var(--grid-color) 3px, transparent 3px),
                    linear-gradient(to bottom, var(--grid-color) 3px, transparent 3px)
                  `,
                  backgroundSize: '25px 25px, 25px 25px, 125px 125px, 125px 125px'
                } as React.CSSProperties}
              />
              <div className="relative z-10">
                <div className="space-y-8">
                  {/* Email */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full mb-4">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Email Us</h2>
                  <a
                    href="mailto:sales@steadyfnr.com"
                    className="text-xl text-gray-300 hover:text-white transition-colors break-all"
                  >
                    sales@steadyfnr.com
                  </a>
                </div>

                <div className="border-t border-gray-800"></div>

                  {/* Phone */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full mb-4">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Call or Text</h2>
                  <a
                    href="tel:5108497343"
                    className="text-xl text-gray-300 hover:text-white transition-colors"
                  >
                    (510) 849-7343
                  </a>
                </div>

                <div className="border-t border-gray-800 pt-8">
                  <div className="text-center">
                    <p className="text-gray-400 mb-6">
                      Prefer to get a quote online? Use our quick quote form.
                    </p>
                    <Link
                      href="/#quote-widget"
                      className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-md hover:bg-gray-100 transition-colors"
                    >
                      Get a Quote
                    </Link>
                  </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-12 text-center">
              <h3 className="text-xl font-semibold text-white mb-4">Service Area</h3>
              <p className="text-gray-400">
                Proudly serving the San Francisco Bay Area
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
