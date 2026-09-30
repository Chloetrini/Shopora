import { NextResponse } from 'next/server'
import { configStatus } from '@/server/config-status'
import { sql } from '@/server/db/client'

export const dynamic = 'force-dynamic'

/** Open after a deploy: "database": "connected" and everything you set up should say configured. No secrets in here. */
export async function GET() {
  let database = 'connected'
  try {
    await sql()`select 1`
  } catch (e) {
    database = e instanceof Error && e.message.includes('DATABASE_URL') ? 'not configured' : 'unreachable'
  }
  const config = configStatus(process.env)
  const healthy = database === 'connected' && config.sessionSecret === 'ok'
  return NextResponse.json({ status: healthy ? 'ok' : 'degraded', database, ...config }, { status: healthy ? 200 : 503 })
}
