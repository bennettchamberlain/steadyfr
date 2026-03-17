import './globals.css'

import {SpeedInsights} from '@vercel/speed-insights/next'
import type {Metadata} from 'next'
import {Inter, IBM_Plex_Mono} from 'next/font/google'
import {draftMode} from 'next/headers'
import {toPlainText} from 'next-sanity'
import {VisualEditing} from 'next-sanity/visual-editing'
import DraftModeToast from '@/app/components/DraftModeToast'
import Toaster from '@/app/components/Toaster'
import Footer from '@/app/components/Footer'
import Header from '@/app/components/Header'
import MetaPixel from '@/app/components/MetaPixel'
import GoogleAnalytics from '@/app/components/GoogleAnalytics'
import NavigationTracker from '@/app/components/NavigationTracker'
import LocalBusinessSchema from '@/app/components/LocalBusinessSchema'
import * as demo from '@/sanity/lib/demo'
import {sanityFetch, SanityLive} from '@/sanity/lib/live'
import {settingsQuery} from '@/sanity/lib/queries'
import {resolveOpenGraphImage} from '@/sanity/lib/utils'
import {handleError} from '@/app/client-utils'

/**
 * Generate metadata for the page.
 * Learn more: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#generatemetadata-function
 */
export async function generateMetadata(): Promise<Metadata> {
  const {data: settings} = await sanityFetch({
    query: settingsQuery,
    // Metadata should never contain stega
    stega: false,
  })
  const title = settings?.title || 'Steady Fence & Railing'
  const description = settings?.description
    ? toPlainText(settings.description)
    : 'Get a quote in a minute and a railing in a week. The shortest lead time in the San Francisco Bay Area.'

  const ogImage = resolveOpenGraphImage(settings?.ogImage)
  let metadataBase: URL | undefined = undefined
  try {
    metadataBase = settings?.ogImage?.metadataBase
      ? new URL(settings.ogImage.metadataBase)
      : undefined
  } catch {
    // ignore
  }
  return {
    metadataBase,
    title: {
      template: `%s | ${title}`,
      default: title,
    },
    description,
    keywords: [
      'fence installation',
      'railing installation',
      'stair railings',
      'deck rails',
      'guardrails',
      'custom metalwork',
      'San Francisco',
      'Bay Area',
      'Oakland',
      'San Jose',
      'Berkeley',
      'Palo Alto',
      'California',
      'metal fabrication',
      'residential railings',
      'commercial railings',
      'fence repair',
      'railing repair',
      'metal railing',
      'wood fence',
      'vinyl fence',
      'chain link fence',
    ],
    authors: [{name: 'Steady Fence & Railing'}],
    creator: 'Steady Fence & Railing',
    publisher: 'Steady Fence & Railing',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: 'https://steadyfnr.com',
      title: title,
      description: description,
      siteName: 'Steady Fence & Railing',
      images: ogImage ? [ogImage] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: ogImage ? [ogImage.url] : [],
    },
    alternates: {
      canonical: 'https://steadyfnr.com',
    },
    other: {
      'geo.region': 'US-CA',
      'geo.placename': 'San Francisco',
      'geo.position': '37.7749;-122.4194',
      'ICBM': '37.7749, -122.4194',
    },
  }
}

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
})

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const {isEnabled: isDraftMode} = await draftMode()

  return (
    <html lang="en" className={`${inter.variable} ${ibmPlexMono.variable} bg-gray-950 text-white`} style={{scrollBehavior: 'smooth'}}>
      <body className="bg-gray-950 text-white" suppressHydrationWarning>
        {/* The <Toaster> component is responsible for rendering toast notifications used in /app/client-utils.ts and /app/components/DraftModeToast.tsx */}
        <Toaster />
        {isDraftMode && (
          <>
            <DraftModeToast />
            {/*  Enable Visual Editing, only to be rendered when Draft Mode is enabled */}
            <VisualEditing />
          </>
        )}
        {/* The <SanityLive> component is responsible for making all sanityFetch calls in your application live, so should always be rendered. */}
        <SanityLive onError={handleError} />
        <section className="min-h-screen pt-20">
          <Header />
          <main className="">{children}</main>
          <Footer />
        </section>
        <SpeedInsights />
        <MetaPixel />
        <GoogleAnalytics />
        <NavigationTracker />
        <LocalBusinessSchema />
      </body>
    </html>
  )
}
