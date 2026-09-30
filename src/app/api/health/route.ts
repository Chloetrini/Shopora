import { NextResponse, type NextRequest } from 'next/server'
import { configStatus } from '@/server/config-status'
import { sql } from '@/server/db/client'
import { checkMailgun } from '@/server/mailgun-check'
import { allow, clientIp } from '@/server/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Open after a deploy: "database": "connected" and everything you set up should say configured. No secrets in here.
 * Add ?check=email to ask Mailgun about your domain (read-only, nothing is sent; 5 per 15 min per IP).
 */
export async function GET(req: NextRequest) {
  let database = 'connected'
  try {
    await sql()`select 1`
  } catch (e) {
    database = e instanceof Error && e.message.includes('DATABASE_URL') ? 'not configured' : 'unreachable'
  }
  const config = configStatus(process.env)
  const healthy = database === 'connected' && config.sessionSecret === 'ok'
  const body: Record<string, unknown> = { status: healthy ? 'ok' : 'degraded', database, ...config }
  if (req.nextUrl.searchParams.get('check') === 'email') {
    body.emailCheck = allow(`health-email:${clientIp(req)}`, 5, 15 * 60 * 1000)
      ? await checkMailgun(process.env)
      : { hint: 'Too many checks. Try again in a few minutes.' }
  }
  return NextResponse.json(body, { status: healthy ? 200 : 503 })
}
