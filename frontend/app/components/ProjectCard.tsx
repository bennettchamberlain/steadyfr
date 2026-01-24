'use client'

import Image from './SanityImage'

interface ProjectCardProps {
  project: {
    _id: string
    projectName?: string | null
    location?: string | null
    categories?: string[] | null
    photoGallery?: Array<{
      asset?: {
        _ref?: string
        _type?: string
      } | null
      alt?: string | null
    }> | null
  }
  onClick?: () => void
}

export default function ProjectCard({project, onClick}: ProjectCardProps) {
  const firstImage = project.photoGallery?.[0]
  const categories = project.categories || []

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-lg bg-gray-900 transition-transform hover:scale-[1.02]"
      onClick={onClick}
    >
      {firstImage?.asset && (
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={firstImage.asset}
            alt={firstImage.alt || project.projectName || 'Project image'}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            width={600}
            height={450}
            loading="lazy"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
      )}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-1">{project.projectName}</h3>
        <p className="text-sm text-gray-400 mb-2">{project.location}</p>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 3).map((category, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 bg-gray-800 text-gray-300 rounded"
              >
                {category.replace(/-/g, ' ')}
              </span>
            ))}
            {categories.length > 3 && (
              <span className="text-xs px-2 py-1 text-gray-500">
                +{categories.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
