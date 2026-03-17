import {MetadataRoute} from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/studio/', '/_next/'],
    },
    sitemap: 'https://steadyfnr.com/sitemap.xml',
  }
}
