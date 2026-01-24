'use client'

import {useState, useEffect} from 'react'
import Image from './SanityImage'

interface ImageModalProps {
  project: {
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
  isOpen: boolean
  onClose: () => void
}

export default function ImageModal({project, isOpen, onClose}: ImageModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const images = project.photoGallery || []

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
      return () => window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen || images.length === 0) return null

  const currentImage = images[currentImageIndex]
  const hasMultipleImages = images.length > 1

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="relative max-w-7xl w-full h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors"
          aria-label="Close modal"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Main image */}
        <div className="flex-1 flex items-center justify-center relative">
          {currentImage?.asset && (
            <Image
              src={currentImage.asset}
              alt={currentImage.alt || `${project.projectName} - Image ${currentImageIndex + 1}`}
              className="max-h-full max-w-full object-contain"
              width={1920}
              height={1080}
              sizes="100vw"
            />
          )}

          {/* Navigation arrows */}
          {hasMultipleImages && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
                aria-label="Previous image"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
                aria-label="Next image"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Project info */}
        <div className="bg-gray-900 text-white p-6 border-t border-gray-800">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">{project.projectName}</h2>
            <p className="text-gray-400 mb-3">{project.location}</p>
            {project.description && (
              <p className="text-gray-300 mb-4">{project.description}</p>
            )}
            {project.categories && project.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {project.categories.map((category, idx) => (
                  <span
                    key={idx}
                    className="text-sm px-3 py-1 bg-gray-800 text-gray-300 rounded-full"
                  >
                    {category.replace(/-/g, ' ')}
                  </span>
                ))}
              </div>
            )}
            {hasMultipleImages && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {images.map((image, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded overflow-hidden border-2 transition-colors ${
                      idx === currentImageIndex
                        ? 'border-white'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    {image?.asset && (
                      <Image
                        src={image.asset}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                        width={80}
                        height={80}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
