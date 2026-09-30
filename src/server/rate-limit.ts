import 'server-only'
import type { NextRequest } from 'next/server'

/**
 * In-memory fixed-window limiter. On Vercel every warm instance has its own memory, so this is
 * best-effort (it stops a burst, not a distributed attacker). Swap for a shared store in hardening.
 */
const buckets = new Map<string, { count: number; resetAt: number }>()

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

/** Returns false once `key` has been used more than `limit` times inside the window. */
export function allow(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  if (process.env.DISABLE_RATE_LIMIT === '1') return true
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 10_000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
    return true
  }
  bucket.count++
  return bucket.count <= limit
}

export const AUTH_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 } // login, register, Google, per IP

export const resetRateLimits = () => buckets.clear()
