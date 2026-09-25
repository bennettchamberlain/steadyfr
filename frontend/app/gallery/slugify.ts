/**
 * Derive a stable, SEO-friendly URL slug for a gallery project from its name.
 * Gallery projects have no stored slug field, so the slug is computed from the
 * project name (falling back to the document id). The SAME function is used both
 * to build the links in the grid and to resolve the [slug] route, so they always
 * agree.
 */
export function projectSlug(projectName?: string | null, id?: string): string {
  const base = (projectName ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || (id ?? '')
}
