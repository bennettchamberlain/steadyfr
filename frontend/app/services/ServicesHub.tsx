'use client'

import {useState} from 'react'
import Link from 'next/link'
import {useRouter, usePathname, useSearchParams} from 'next/navigation'
import {ARTICLE_CATEGORIES, articleCategoryLabel} from '@/app/services/articleCategories'
import {urlForImage} from '@/sanity/lib/utils'
import type {ArticlesQueryResult} from '@/sanity.types'

type Article = ArticlesQueryResult[number]

const ALL = 'all'

function ArticleCard({article}: {article: Article}) {
  const img = article.coverImage
    ? urlForImage(article.coverImage)?.width(800).height(450).fit('crop').url()
    : null
  const cat = articleCategoryLabel(article.category)

  return (
    <Link
      href={`/posts/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition-colors hover:border-gray-600"
    >
      <div className="aspect-[16/9] overflow-hidden bg-gray-800">
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={article.title ?? ''}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        {cat && (
          <span className="mb-2 inline-block self-start rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-medium text-sky-300">
            {cat}
          </span>
        )}
        <h3 className="text-lg font-semibold leading-snug text-white">{article.title}</h3>
        {article.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-400">{article.excerpt}</p>
        )}
        <span className="mt-4 text-sm font-medium text-sky-400 transition-colors group-hover:text-sky-300">
          Read more &rarr;
        </span>
      </div>
    </Link>
  )
}

export default function ServicesHub({articles}: {articles: ArticlesQueryResult}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlCat = searchParams.get('category')
  const initial =
    urlCat && ARTICLE_CATEGORIES.some((c) => c.value === urlCat) ? urlCat : ALL
  const [active, setActive] = useState(initial)

  // No articles yet — friendly placeholder so the hub never looks broken.
  if (!articles.length) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-10 text-center">
        <h3 className="text-xl font-semibold text-white">Guides are on the way</h3>
        <p className="mx-auto mt-2 max-w-md text-gray-400">
          We&rsquo;re putting together in-depth guides on railing types, materials, and code. In
          the meantime, tell us about your project and we&rsquo;ll walk you through the options.
        </p>
        <Link
          href="/#quote-widget"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-white px-6 py-3 font-semibold text-gray-900 transition-colors hover:bg-gray-100"
        >
          Get a Quote
        </Link>
      </div>
    )
  }

  const filtered = active === ALL ? articles : articles.filter((a) => a.category === active)

  const selectCategory = (value: string) => {
    setActive(value)
    const url = value === ALL ? pathname : `${pathname}?category=${encodeURIComponent(value)}`
    // Keep the view shareable/bookmarkable without scrolling or a full reload.
    router.replace(url, {scroll: false})
  }

  const pillBase = 'cursor-pointer rounded-full px-4 py-2 text-sm transition-colors'
  const pillActive = 'bg-white text-gray-900'
  const pillInactive = 'bg-gray-800 text-gray-300 hover:bg-gray-700'

  return (
    <>
      <div className="mb-3 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => selectCategory(ALL)}
          className={`${pillBase} ${active === ALL ? pillActive : pillInactive}`}
        >
          All
        </button>
        {ARTICLE_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => selectCategory(cat.value)}
            className={`${pillBase} ${active === cat.value ? pillActive : pillInactive}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <p className="mb-8 text-center text-sm text-gray-500">
        {active === ALL
          ? `Showing all ${filtered.length} ${filtered.length === 1 ? 'guide' : 'guides'}`
          : `Showing ${filtered.length} ${filtered.length === 1 ? 'guide' : 'guides'}`}
      </p>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article) => (
            <ArticleCard key={article._id} article={article} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-gray-400">No guides in this category yet — check back soon.</p>
        </div>
      )}
    </>
  )
}
