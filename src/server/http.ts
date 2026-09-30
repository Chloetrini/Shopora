import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import type { ZodType } from 'zod'

export const ok = (message: string, body?: unknown, status = 200) =>
  NextResponse.json({ success: true, message, body }, { status })

export const fail = (message: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ success: false, message, ...extra }, { status })

export const tooMany = () => fail('Too many attempts. Try again in a few minutes.', 429)

/** Parses and validates a JSON body: `{ data }` on success, `{ res }` (a 400) otherwise. */
export async function parseJson<T>(req: NextRequest, schema: ZodType<T>): Promise<{ data: T } | { res: NextResponse }> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return { res: fail('Invalid JSON', 400) }
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return {
      res: fail('Validation failed', 400, {
        details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      }),
    }
  }
  return { data: parsed.data }
}
