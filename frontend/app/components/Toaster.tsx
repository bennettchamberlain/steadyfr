'use client'

import dynamic from 'next/dynamic'

const SonnerToaster = dynamic(() => import('sonner').then((mod) => mod.Toaster), {
  ssr: false,
})

export default function Toaster() {
  return <SonnerToaster />
}
