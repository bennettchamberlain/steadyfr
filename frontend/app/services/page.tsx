import Link from 'next/link'

export const metadata = {
  title: 'Services | Steady Fence & Railing',
  description:
    'Expert railing installation services in the San Francisco Bay Area. Traditional handrails, guardrails with balusters, cable rail, ornate balusters, and custom designs.',
}

const serviceCategories = [
  {
    title: 'Traditional Handrail',
    description: 'Classic handrail designs that combine timeless elegance with modern durability. Perfect for both interior and exterior applications.',
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Guardrail with Balusters',
    description: 'Safety-focused guardrail systems featuring various baluster styles. Ideal for decks, balconies, and elevated areas.',
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
]

const balusterTypes = [
  {
    title: 'Vertical Picket',
    description: 'Clean, modern vertical picket designs that provide safety without obstructing views. Perfect for contemporary homes.',
  },
  {
    title: 'Cable Rail',
    description: 'Minimalist cable rail systems that maximize visibility while maintaining safety. Ideal for scenic locations.',
  },
  {
    title: 'Ornate Balusters',
    description: 'Decorative baluster designs that add architectural interest and character to your railing system.',
  },
  {
    title: 'Custom',
    description: 'Bespoke railing solutions tailored to your specific design vision and architectural requirements.',
  },
]

export default function ServicesPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
        <div className="absolute inset-0 bg-[url('/images/tile-grid-white.png')] bg-size-[17px] opacity-5" />
        <div className="container relative z-10 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Railing Services
            </h1>
            <p className="text-xl text-gray-400 mb-8 font-light">
              Expert installation and craftsmanship for all your railing needs
            </p>
          </div>
        </div>
      </section>

      {/* Railing Categories Section */}
      <section className="py-20 bg-gray-950">
        <div className="container px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Types of Railing
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              We offer a wide range of railing solutions to suit your style and safety requirements
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
            {serviceCategories.map((service, idx) => (
              <div
                key={idx}
                className="bg-gray-900 rounded-lg p-8 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="text-white mb-4">{service.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-3">{service.title}</h3>
                <p className="text-gray-400 leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Baluster Types Section */}
      <section className="py-20 bg-gray-900 border-y border-gray-800">
        <div className="container px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Baluster Types
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Choose from various baluster styles to match your aesthetic preferences
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {balusterTypes.map((type, idx) => (
              <div
                key={idx}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <h3 className="text-xl font-semibold text-white mb-3">{type.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{type.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-950">
        <div className="container px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-gray-400 mb-8 text-lg">
              Get a quote in a minute and have your railing installed in a week
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/quote"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-md hover:bg-gray-100 transition-colors text-lg"
              >
                Get a Quote
              </Link>
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
