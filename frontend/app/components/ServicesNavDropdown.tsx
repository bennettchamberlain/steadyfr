'use client'

import Link from 'next/link'
import {useEffect, useRef, useState} from 'react'
import {ARTICLE_CATEGORIES} from '@/app/services/articleCategories'

/**
 * "Services" nav item with a category dropdown. The label links to /services;
 * the caret opens a menu of categories that deep-link into the hub filter.
 * Opens on hover (desktop) and on click/tap (works on touch).
 */
export default function ServicesNavDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const itemCls =
    'block rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors'

  return (
    <li
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex items-center gap-1">
        <Link href="/services" className="text-gray-300 hover:text-white transition-colors">
          Services
        </Link>
        <button
          type="button"
          aria-label="Open services menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 w-64 pt-3">
          <ul className="rounded-xl border border-gray-800 bg-gray-900 p-1.5 shadow-xl shadow-black/40">
            <li>
              <Link href="/services" onClick={() => setOpen(false)} className={itemCls}>
                All guides
              </Link>
            </li>
            {ARTICLE_CATEGORIES.map((cat) => (
              <li key={cat.value}>
                <Link
                  href={`/services?category=${cat.value}`}
                  onClick={() => setOpen(false)}
                  className={itemCls}
                >
                  {cat.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}
