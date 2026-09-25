/**
 * Gallery layout with a parallel "modal" slot. When a project is opened via a
 * client-side navigation from the grid, the intercepting route (@modal/(.)[slug])
 * renders in the modal slot while `children` keeps showing the grid underneath —
 * so the grid never unmounts and opening/closing is seamless. On a direct load of
 * /gallery/[slug], the modal slot falls back to @modal/default (null) and the full
 * page renders in `children`.
 */
export default function GalleryLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}
