import {MetadataRoute} from 'next'
import {sanityFetch} from '@/sanity/lib/live'
import {sitemapData} from '@/sanity/lib/queries'

/**
 * Builds sitemap.xml. URLs are absolute and pinned to the canonical production
 * domain (www) so they match the canonical tags — pointing Google at the final,
 * non-redirecting URLs. Learn more: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

const BASE_URL = 'https://www.steadyfnr.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allPostsAndPages = await sanityFetch({
    query: sitemapData,
  })

  // Hand-built static routes.
  const now = new Date()
  const routes: MetadataRoute.Sitemap = [
    {url: `${BASE_URL}/`, lastModified: now, priority: 1, changeFrequency: 'monthly'},
    {url: `${BASE_URL}/services`, lastModified: now, priority: 0.8, changeFrequency: 'monthly'},
    {url: `${BASE_URL}/gallery`, lastModified: now, priority: 0.8, changeFrequency: 'weekly'},
    {url: `${BASE_URL}/contact`, lastModified: now, priority: 0.8, changeFrequency: 'yearly'},
    {url: `${BASE_URL}/privacy`, lastModified: now, priority: 0.3, changeFrequency: 'yearly'},
  ]

  // Sanity-managed pages and blog posts.
  if (allPostsAndPages != null && allPostsAndPages.data.length != 0) {
    for (const p of allPostsAndPages.data) {
      switch (p._type) {
        case 'page':
          routes.push({
            url: `${BASE_URL}/${p.slug}`,
            lastModified: p._updatedAt || now,
            priority: 0.8,
            changeFrequency: 'monthly',
          })
          break
        case 'post':
          routes.push({
            url: `${BASE_URL}/posts/${p.slug}`,
            lastModified: p._updatedAt || now,
            priority: 0.5,
            changeFrequency: 'never',
          })
          break
      }
    }
  }

  return routes
}
