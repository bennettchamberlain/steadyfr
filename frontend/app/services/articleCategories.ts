/**
 * Canonical Services-hub article categories: the exact set and display order
 * used across the hub filter, article cards, and the nav dropdown. Keep this in
 * sync with the `category` options list in
 * studio/src/schemaTypes/documents/post.ts (same values, same order).
 */
export interface ArticleCategoryOption {
  value: string
  label: string
  blurb: string
}

export const ARTICLE_CATEGORIES: ArticleCategoryOption[] = [
  {
    value: 'railing-types',
    label: 'Railing Types',
    blurb: 'Cable vs. kit rail, guardrails, handrails, stair & deck rails.',
  },
  {
    value: 'infill-materials',
    label: 'Infill & Materials',
    blurb: 'Balusters, cable, picket, slat, glass, and finishes.',
  },
  {
    value: 'code-compliance',
    label: 'Code & Compliance',
    blurb: 'Handrail vs. guardrail, heights, spacing, and permits.',
  },
  {
    value: 'process-pricing',
    label: 'Process & Pricing',
    blurb: 'How quotes, lead times, and installation work.',
  },
]

/**
 * Human label for a category value. Falls back to a formatted version of the raw
 * value for any legacy category not in the canonical list.
 */
export function articleCategoryLabel(value?: string | null): string {
  if (!value) return ''
  const found = ARTICLE_CATEGORIES.find((c) => c.value === value)
  if (found) return found.label
  const spaced = value.replace(/-/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
