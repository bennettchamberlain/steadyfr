import {notFound} from 'next/navigation'
import {getProjectBySlug} from '@/app/gallery/getProject'
import ProjectDetail from '@/app/gallery/ProjectDetail'

type Props = {
  params: Promise<{slug: string}>
}

/**
 * Intercepting route: when a project is opened via client-side navigation from
 * the gallery grid, this renders the project as a modal overlay on top of the
 * still-mounted grid (see app/gallery/layout.tsx). Direct loads/refreshes fall
 * through to app/gallery/[slug]/page.tsx (the full standalone page).
 */
export default async function InterceptedProjectModal(props: Props) {
  const {slug} = await props.params
  const project = await getProjectBySlug(slug)

  if (!project) {
    return notFound()
  }

  return <ProjectDetail project={project} />
}
