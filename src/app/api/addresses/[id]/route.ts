import type { NextRequest } from 'next/server'
import { deleteAddress } from '@/server/db/features'
import { fail, ok } from '@/server/http'
import { requireUser } from '@/server/require-user'

/** Someone else's address id behaves exactly like one that doesn't exist: 404. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireUser(req)
  if ('res' in a) return a.res
  return (await deleteAddress(a.user.id, (await params).id)) ? ok('Address deleted') : fail('Not found', 404)
}
