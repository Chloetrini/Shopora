import type { NextRequest } from 'next/server'
import { addressSchema } from '@/lib/validation'
import { createAddress, listAddresses, TooManyAddressesError } from '@/server/db/features'
import { fail, ok, parseJson } from '@/server/http'
import { allow } from '@/server/rate-limit'
import { requireUser } from '@/server/require-user'

export async function GET(req: NextRequest) {
  const a = await requireUser(req)
  if ('res' in a) return a.res
  return ok('Addresses', { addresses: await listAddresses(a.user.id) })
}

export async function POST(req: NextRequest) {
  const a = await requireUser(req)
  if ('res' in a) return a.res
  if (!allow(`addr:${a.user.id}`, 30, 15 * 60 * 1000)) return fail('Slow down a little.', 429)
  const parsed = await parseJson(req, addressSchema)
  if ('res' in parsed) return parsed.res
  try {
    return ok('Address saved', { address: await createAddress(a.user.id, parsed.data) }, 201)
  } catch (e) {
    if (e instanceof TooManyAddressesError) return fail(e.message, 409)
    throw e
  }
}
