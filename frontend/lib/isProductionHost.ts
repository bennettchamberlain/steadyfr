// True only on the live production hosts. Used to gate analytics and pixels so
// that preview deployments (*.vercel.app), localhost, and any other host don't
// send data to GA / Google Ads / Meta — keeping reporting and, importantly,
// conversion counts limited to real production traffic.
const PRODUCTION_HOSTS = new Set(['steadyfnr.com', 'www.steadyfnr.com'])

export function isProductionHost(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return PRODUCTION_HOSTS.has(window.location.hostname)
  } catch {
    return false
  }
}
