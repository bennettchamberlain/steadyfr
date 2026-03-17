'use client'

import Script from 'next/script'

export default function LocalBusinessSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': 'https://steadyfnr.com',
    name: 'Steady Fence & Railing',
    alternateName: 'steadyfnr.com',
    url: 'https://steadyfnr.com',
    logo: 'https://steadyfnr.com/icons/logo.png',
    image: 'https://steadyfnr.com/icons/logo.png',
    description:
      'Professional fence and railing installation services in the San Francisco Bay Area. Specializing in stair railings, deck rails, guardrails, and custom metalwork with the shortest lead time in the region.',
    telephone: '+1-XXX-XXX-XXXX', // TODO: Add actual phone number
    email: 'info@steadyfnr.com', // TODO: Add actual email
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'San Francisco',
      addressRegion: 'CA',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 37.7749,
      longitude: -122.4194,
    },
    areaServed: [
      {
        '@type': 'City',
        name: 'San Francisco',
        '@id': 'https://en.wikipedia.org/wiki/San_Francisco',
      },
      {
        '@type': 'City',
        name: 'Oakland',
        '@id': 'https://en.wikipedia.org/wiki/Oakland,_California',
      },
      {
        '@type': 'City',
        name: 'San Jose',
        '@id': 'https://en.wikipedia.org/wiki/San_Jose,_California',
      },
      {
        '@type': 'City',
        name: 'Berkeley',
        '@id': 'https://en.wikipedia.org/wiki/Berkeley,_California',
      },
      {
        '@type': 'City',
        name: 'Palo Alto',
        '@id': 'https://en.wikipedia.org/wiki/Palo_Alto,_California',
      },
      {
        '@type': 'State',
        name: 'California',
      },
    ],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '09:00',
        closes: '15:00',
      },
    ],
    sameAs: [
      // TODO: Add social media profiles
      // 'https://www.facebook.com/steadyfnr',
      // 'https://www.instagram.com/steadyfnr',
      // 'https://www.yelp.com/biz/steady-fence-and-railing',
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      reviewCount: '1',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Railing and Fence Services',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Stair Railing Installation',
            description:
              'Professional stair railing installation services for interior and exterior stairs in the San Francisco Bay Area.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Deck Railing Installation',
            description:
              'Custom deck railing installation and repair services with quick turnaround times.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Guardrail Installation',
            description:
              'Safety guardrail installation for residential and commercial properties.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Custom Metalwork',
            description:
              'Custom metal fabrication and installation services tailored to your specific needs.',
          },
        },
      ],
    },
  }

  return (
    <Script
      id="local-business-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}}
    />
  )
}
