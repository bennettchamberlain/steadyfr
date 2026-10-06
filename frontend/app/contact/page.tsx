import ContactPageTracker from './ContactPageTracker'
import ContactForm from './ContactForm'

export const metadata = {
  title: 'Contact Us | Steady Fence & Railing',
  description:
    'Contact Steady Fence & Railing in the San Francisco Bay Area. Email or call us for a free quote on your railing project.',
}

export default function ContactPage() {
  return (
    <>
      <ContactPageTracker />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Email */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-4">
                <div className="font-mono text-[11px] tracking-wider uppercase text-gray-500">
                  Email us
                </div>
                <div className="mt-1 text-[15px]">
                  <a
                    href="mailto:sales@steadyfnr.com"
                    className="text-white border-b border-gray-700 hover:border-white transition-colors break-all"
                  >
                    sales@steadyfnr.com
                  </a>
                </div>
              </div>
              {/* Phone */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-4">
                <div className="font-mono text-[11px] tracking-wider uppercase text-gray-500">
                  Call or text
                </div>
                <div className="mt-1 text-[15px]">
                  <a
                    href="tel:4153473270"
                    className="text-white border-b border-gray-700 hover:border-white transition-colors"
                  >
                    (415) 347-3270
                  </a>
                </div>
              </div>
            </div>

            {/* OR divider + appointment form */}
            <div className="flex items-center gap-4 my-10">
              <div className="h-px flex-1 bg-gray-800" />
              <span className="font-mono text-xs tracking-[0.2em] text-gray-500">OR</span>
              <div className="h-px flex-1 bg-gray-800" />
            </div>
            <ContactForm />

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
