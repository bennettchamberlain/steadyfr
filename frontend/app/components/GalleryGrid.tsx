'use client'

import {useState} from 'react'
import ImageModal from './ImageModal'
import ProjectCard from './ProjectCard'
import {trackGAEvent} from './GoogleAnalytics'
import {trackMetaEvent} from './MetaPixel'

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
  const [selectedProject, setSelectedProject] = useState<GalleryProject | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleProjectClick = (project: GalleryProject) => {
    // Track gallery project click
    const projectName = project.projectName || 'Unknown Project'
    trackGAEvent('gallery_project_click', {
      event_category: 'gallery',
      event_label: projectName,
      project_id: project._id,
      project_location: project.location || '',
      project_categories: project.categories?.join(', ') || '',
    })
    // Track Meta Pixel event
    trackMetaEvent('ViewContent', {
      content_name: projectName,
      content_category: 'Gallery',
      content_ids: [project._id],
      content_type: 'product',
    })
    setSelectedProject(project)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setSelectedProject(null), 300)
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
    <>
      <div className={`grid grid-cols-1 gap-6 ${gridCols[columns]}`}>
        {projects.map((project) => (
          <ProjectCard
            key={project._id}
            project={project}
            onClick={() => handleProjectClick(project)}
          />
        ))}
      </div>
      {selectedProject && (
        <ImageModal
          project={selectedProject}
          isOpen={isModalOpen}
          onClose={closeModal}
        />
      )}
    </>
  )
}
