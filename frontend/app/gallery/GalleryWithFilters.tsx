'use client'

import {useState} from 'react'
import {useRouter, usePathname, useSearchParams} from 'next/navigation'
import GalleryGrid from '@/app/components/GalleryGrid'
import {GALLERY_CATEGORIES} from '@/app/gallery/categories'

interface GalleryProject {
  _id: string
  projectName?: string | null
  location?: string | null
  categories?: string[] | null
  description?: string | null
  photoGallery?: Array<{
    asset?: {_ref?: string; _type?: string} | null
    alt?: string | null
  }> | null
}

const ALL = 'all'

// Fixed set/order of categories shown as filter pills.
const categories = GALLERY_CATEGORIES

export default function GalleryWithFilters({projects}: {projects: GalleryProject[]}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlFilter = searchParams.get('filter')
  const initial =
    urlFilter && categories.some((c) => c.value === urlFilter) ? urlFilter : ALL
  const [active, setActive] = useState(initial)

  const filtered =
    active === ALL
      ? projects
      : projects.filter((p) => (p.categories || []).includes(active))

  const selectFilter = (value: string) => {
    setActive(value)
    const url =
      value === ALL ? pathname : `${pathname}?filter=${encodeURIComponent(value)}`
    // Update the URL so the filtered view is shareable/bookmarkable, without
    // scrolling or a full reload.
    router.replace(url, {scroll: false})
  }

  const pillBase =
    'cursor-pointer rounded-full px-4 py-2 text-sm transition-colors'
  const pillActive = 'bg-white text-gray-900'
  const pillInactive = 'bg-gray-800 text-gray-300 hover:bg-gray-700'

  return (
    <>
      {categories.length > 0 && (
        <div className="mb-3 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => selectFilter(ALL)}
            className={`${pillBase} ${active === ALL ? pillActive : pillInactive}`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => selectFilter(cat.value)}
              className={`${pillBase} ${active === cat.value ? pillActive : pillInactive}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      <p className="mb-8 text-center text-sm text-gray-500">
        {active === ALL
          ? `Showing all ${filtered.length} projects`
          : `Showing ${filtered.length} ${
              filtered.length === 1 ? 'project' : 'projects'
            }`}
      </p>

      {filtered.length > 0 ? (
        <GalleryGrid projects={filtered} columns={3} />
      ) : (
        <div className="py-12 text-center">
          <p className="text-gray-400">No projects in this category yet.</p>
        </div>
      )}
    </>
  )
}
