import {sanityFetch} from '@/sanity/lib/live'
import {allGalleryProjectsQuery} from '@/sanity/lib/queries'
import {projectSlug} from '@/app/gallery/slugify'

/**
 * Resolve a gallery project from a URL slug. Gallery projects have no stored
 * slug, so match the slugified project name (or the raw document id) against all
 * projects. Shared by the full page route and the intercepted modal route so
 * both resolve identically.
 */
export async function getProjectBySlug(slug: string) {
  const {data: projects} = await sanityFetch({query: allGalleryProjectsQuery})
  if (!projects) return null
  return (
    projects.find((p) => projectSlug(p.projectName, p._id) === slug) ||
    projects.find((p) => p._id === slug) ||
    null
  )
}
