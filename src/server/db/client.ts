import 'server-only'
import { neon } from '@neondatabase/serverless'

/** Read lazily so `next build` works with no secrets. */
export function sql() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.')
  return neon(url)
}
