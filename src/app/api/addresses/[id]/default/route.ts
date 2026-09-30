import type { NextRequest } from 'next/server'
import { setDefaultAddress } from '@/server/db/features'
import { fail, ok } from '@/server/http'
import { requireUser } from '@/server/require-user'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireUser(req)
  if ('res' in a) return a.res
  return (await setDefaultAddress(a.user.id, (await params).id)) ? ok('Default address updated') : fail('Not found', 404)
}
