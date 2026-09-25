'use client'

import Link from 'next/link'
import ProjectCard from './ProjectCard'
import {trackGAEvent} from './GoogleAnalytics'
import {trackMetaEvent} from './MetaPixel'
import {projectSlug} from '@/app/gallery/slugify'

interface GalleryProject {
  _id: string
  projectName?: string | null
  location?: string | null
  categories?: string[] | null
  description?: string | null
  photoGallery?: Array<{
    asset?: {
      _ref?: string
      _type?: string
    } | null
    alt?: string | null
  }> | null
}

interface GalleryGridProps {
  projects: GalleryProject[]
  columns?: 2 | 3 | 4
}

export default function GalleryGrid({projects, columns = 3}: GalleryGridProps) {
  const handleProjectClick = (project: GalleryProject) => {
    // Mark that this navigation came from a gallery card, so the project page's
    // close button can go *back* (restoring the grid's scroll position) rather
    // than pushing a fresh /gallery route that resets scroll to the top.
    try {
      sessionStorage.setItem('galleryReturn', '1')
    } catch {
      // sessionStorage may be unavailable (private mode); non-critical
    }

    // Track gallery project click (navigation now goes to the project page)
    const projectName = project.projectName || 'Unknown Project'
    trackGAEvent('gallery_project_click', {
      event_category: 'gallery',
      event_label: projectName,
      project_id: project._id,
      project_location: project.location || '',
      project_categories: project.categories?.join(', ') || '',
    })
    trackMetaEvent('ViewContent', {
      content_name: projectName,
      content_category: 'Gallery',
      content_ids: [project._id],
      content_type: 'product',
    })
  }

  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No projects to display.</p>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 gap-6 ${gridCols[columns]}`}>
      {projects.map((project) => (
        <Link
          key={project._id}
          href={`/gallery/${projectSlug(project.projectName, project._id)}`}
          onClick={() => handleProjectClick(project)}
          prefetch
          className="block"
        >
          <ProjectCard project={project} />
        </Link>
      ))}
    </div>
  )
}
