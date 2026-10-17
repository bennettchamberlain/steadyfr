import {defineQuery} from 'next-sanity'

export const settingsQuery = defineQuery(`*[_type == "settings"][0]`)

const postFields = /* groq */ `
  _id,
  "status": select(_originalId in path("drafts.**") => "draft", "published"),
  "title": coalesce(title, "Untitled"),
  "slug": slug.current,
  excerpt,
  coverImage,
  "date": coalesce(date, _updatedAt),
  "author": author->{firstName, lastName, picture},
`

const linkReference = /* groq */ `
  _type == "link" => {
    "page": page->slug.current,
    "post": post->slug.current
  }
`

const linkFields = /* groq */ `
  link {
      ...,
      ${linkReference}
      }
`

export const getPageQuery = defineQuery(`
  *[_type == 'page' && slug.current == $slug][0]{
    _id,
    _type,
    name,
    slug,
    heading,
    subheading,
    "pageBuilder": pageBuilder[]{
      ...,
      _type == "callToAction" => {
        ...,
        button {
          ...,
          ${linkFields}
        }
      },
      _type == "infoSection" => {
        content[]{
          ...,
          markDefs[]{
            ...,
            ${linkReference}
          }
        }
      },
    },
  }
`)

export const sitemapData = defineQuery(`
  *[_type == "page" || _type == "post" && defined(slug.current)] | order(_type asc) {
    "slug": slug.current,
    _type,
    _updatedAt,
  }
`)

export const allPostsQuery = defineQuery(`
  *[_type == "post" && defined(slug.current)] | order(date desc, _updatedAt desc) {
    ${postFields}
  }
`)

// Articles for the Services content hub — same fields as posts, plus the
// category used by the hub filter and nav dropdown.
export const articlesQuery = defineQuery(`
  *[_type == "post" && defined(slug.current)] | order(coalesce(date, _updatedAt) desc) {
    ${postFields}
    category
  }
`)

// The flagship guide highlighted at the top of the Services nav dropdown.
export const featuredArticleQuery = defineQuery(`
  *[_type == "post" && defined(slug.current) && featured == true] | order(coalesce(date, _updatedAt) desc) [0] {
    "title": coalesce(title, "Untitled"),
    "slug": slug.current
  }
`)

export const morePostsQuery = defineQuery(`
  *[_type == "post" && _id != $skip && defined(slug.current)] | order(date desc, _updatedAt desc) [0...$limit] {
    ${postFields}
  }
`)

export const postQuery = defineQuery(`
  *[_type == "post" && slug.current == $slug] [0] {
    content[]{
    ...,
    markDefs[]{
      ...,
      ${linkReference}
    }
  },
    keyTakeaways,
    worksCited,
    ${postFields}
  }
`)

export const postPagesSlugs = defineQuery(`
  *[_type == "post" && defined(slug.current)]
  {"slug": slug.current}
`)

export const pagesSlugs = defineQuery(`
  *[_type == "page" && defined(slug.current)]
  {"slug": slug.current}
`)

const galleryProjectFields = /* groq */ `
  _id,
  projectName,
  location,
  categories,
  description,
  featured,
  infillFeatured,
  order,
  "photoGallery": photoGallery[]{
    asset,
    alt,
    hotspot,
    crop
  }
`

export const allGalleryProjectsQuery = defineQuery(`
  *[_type == "galleryProject"] | order(featured desc, order asc, projectName asc) {
    ${galleryProjectFields}
  }
`)

export const featuredGalleryProjectsQuery = defineQuery(`
  *[_type == "galleryProject" && featured == true] | order(order asc) [0...3] {
    ${galleryProjectFields}
  }
`)

export const galleryProjectQuery = defineQuery(`
  *[_type == "galleryProject" && _id == $id][0] {
    ${galleryProjectFields}
  }
`)
