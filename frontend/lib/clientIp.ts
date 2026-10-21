// Read the client's IP address from request headers (server-side only).
// Never trust a client-supplied IP — a form payload can spoof it. On Vercel the
// real client IP is the first entry of `x-forwarded-for`, with `x-real-ip` as a
// fallback.
export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return headers.get('x-real-ip')?.trim() || ''
}
