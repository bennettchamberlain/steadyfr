'use client'

import {useState, useEffect, useCallback} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import Image from '@/app/components/SanityImage'
import {categoryLabel} from '@/app/gallery/categories'

interface ProjectDetailProps {
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
}

export default function ProjectDetail({project}: ProjectDetailProps) {
  const router = useRouter()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [cameFromGallery, setCameFromGallery] = useState(false)
  const images = project.photoGallery || []

  // Fade/scale in on mount so opening feels like a modal popping open
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Did the user arrive by clicking a gallery card? If so, closing goes *back*,
  // which (with intercepting routes) simply dismisses the overlay and reveals the
  // grid exactly where it was — no reload, no scroll jump.
  useEffect(() => {
    try {
      if (sessionStorage.getItem('galleryReturn') === '1') {
        setCameFromGallery(true)
        sessionStorage.removeItem('galleryReturn')
      }
    } catch {
      // sessionStorage unavailable; fall back to pushing /gallery
    }
  }, [])

  // Lock background scroll while the overlay is shown
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // Close: fade out first, then navigate, so the dismissal is smooth.
  const handleClose = useCallback(() => {
    setVisible(false)
    window.setTimeout(() => {
      if (cameFromGallery) {
        router.back()
      } else {
        router.push('/gallery')
      }
    }, 200)
  }, [cameFromGallery, router])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [handleClose])

  if (images.length === 0) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4">
        <div className="text-center text-white">
          <p className="mb-4">No images for this project.</p>
          <Link href="/gallery" className="underline hover:text-gray-300">
            Back to gallery
          </Link>
        </div>
      </div>
    )
  }

  const currentImage = images[currentImageIndex]
  const hasMultipleImages = images.length > 1

  const goToNext = () => setCurrentImageIndex((prev) => (prev + 1) % images.length)
  const goToPrevious = () =>
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)

  return (
    <div
      className={`fixed inset-0 z-[60] overflow-y-auto bg-black/95 transition-opacity duration-300 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      {/* Close button: fixed to the viewport so it stays reachable while scrolling */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleClose()
        }}
        className="fixed top-4 right-4 z-[70] text-white hover:text-gray-300 transition-colors"
        aria-label="Back to gallery"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative w-full max-w-7xl flex flex-col transition-all duration-300 ease-out ${
            visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main image */}
          <div className="relative flex items-center justify-center">
          {currentImage?.asset?._ref && (
            <Image
              id={currentImage.asset._ref}
              alt={
                currentImage.alt ||
                `${project.projectName} - Image ${currentImageIndex + 1}`
              }
              className="max-h-[75vh] max-w-full object-contain"
              width={1920}
              height={1080}
              sizes="100vw"
              mode="cover"
            />
          )}

          {hasMultipleImages && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
                aria-label="Previous image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
                aria-label="Next image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Project info */}
        <div className="bg-gray-900 text-white p-6 border-t border-gray-800">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">{project.projectName}</h1>
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
                    {categoryLabel(category)}
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
                    aria-label={`View image ${idx + 1}`}
                  >
                    {image?.asset?._ref && (
                      <Image
                        id={image.asset._ref}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                        width={80}
                        height={80}
                        mode="cover"
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
    </div>
  )
}
