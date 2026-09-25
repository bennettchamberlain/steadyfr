import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {sanityFetch} from '@/sanity/lib/live'
import {allGalleryProjectsQuery} from '@/sanity/lib/queries'
import {resolveOpenGraphImage} from '@/sanity/lib/utils'
import {projectSlug} from '@/app/gallery/slugify'
import {getProjectBySlug} from '@/app/gallery/getProject'
import ProjectDetail from '@/app/gallery/ProjectDetail'

type Props = {
  params: Promise<{slug: string}>
}

export async function generateStaticParams() {
  const {data: projects} = await sanityFetch({
    query: allGalleryProjectsQuery,
    perspective: 'published',
    stega: false,
  })
  const seen = new Set<string>()
  const params: {slug: string}[] = []
  for (const p of projects || []) {
    const slug = projectSlug(p.projectName, p._id)
    if (slug && !seen.has(slug)) {
      seen.add(slug)
      params.push({slug})
    }
  }
  return params
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const {slug} = await props.params
  const project = await getProjectBySlug(slug)
  if (!project) return {}

  const title = project.projectName || 'Project'
  const description =
    project.description ||
    `${project.projectName}${project.location ? ` in ${project.location}` : ''} — a railing project by Steady Fence & Railing.`
  const ogImage = resolveOpenGraphImage(project.photoGallery?.[0])

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
    alternates: {
      canonical: `/gallery/${slug}`,
    },
  }
}

export default async function GalleryProjectPage(props: Props) {
  const {slug} = await props.params
  const project = await getProjectBySlug(slug)

  if (!project) {
    return notFound()
  }

  return <ProjectDetail project={project} />
}
