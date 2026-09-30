/** The public origin. Emailed and redirect links use this, never the request's Host header. */
export function siteUrl(): string {
  const explicit = process.env.APP_URL
  if (explicit) return explicit.replace(/\/+$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
}
