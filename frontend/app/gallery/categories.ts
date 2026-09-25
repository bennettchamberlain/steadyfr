/**
 * Canonical gallery categories: the exact set and display order used across the
 * site (filter pills, project cards, project detail). Keep this in sync with the
 * `categories` options list in
 * studio/src/schemaTypes/documents/galleryProject.ts (same values, same order).
 */
export interface CategoryOption {
  value: string
  label: string
}

export const GALLERY_CATEGORIES: CategoryOption[] = [
  {value: 'cable-rail', label: 'Cable Rail'},
  {value: 'picket', label: 'Picket'},
  {value: 'slat', label: 'Slat'},
  {value: 'no-infill', label: 'No Infill'},
  {value: 'custom', label: 'Custom'},
]

/**
 * Human label for a category value. Falls back to a formatted version of the raw
 * value for any legacy category not in the canonical list (e.g. old data before
 * it is re-tagged in the Studio).
 */
export function categoryLabel(value: string): string {
  const found = GALLERY_CATEGORIES.find((c) => c.value === value)
  if (found) return found.label
  const spaced = value.replace(/-/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
