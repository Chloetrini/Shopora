import { NextResponse, type NextRequest } from 'next/server'
import { MAX_IMAGE_BYTES, sniffImageType } from '@/lib/image-type'
import { clearAvatar, findUserById, loadAvatar, saveAvatar, toPublicUser } from '@/server/db/users'
import { fail, ok } from '@/server/http'
import { allow } from '@/server/rate-limit'
import { requireUser } from '@/server/require-user'

/** The profile photo, to its owner only (cookie on the web, token in the app). The `?v=` in the address changes with every new photo. */
export async function GET(req: NextRequest) {
  const a = await requireUser(req)
  if ('res' in a) return a.res
  const avatar = await loadAvatar(a.user.id)
  if (!avatar) return fail('Not found', 404)
  return new NextResponse(new Uint8Array(avatar.bytes), {
    headers: { 'Content-Type': avatar.type, 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' },
  })
}

/** Raw image bytes in the body. The type comes from the bytes, never the header or file name. */
export async function PUT(req: NextRequest) {
  const a = await requireUser(req)
  if ('res' in a) return a.res
  if (!allow(`avatar:${a.user.id}`, 20, 15 * 60 * 1000)) return fail('Too many changes. Try again in a few minutes.', 429)
  const bytes = new Uint8Array(await req.arrayBuffer())
  if (bytes.length === 0) return fail('Choose a picture first.', 400)
  if (bytes.length > MAX_IMAGE_BYTES) return fail('That picture is too large. Use one under 1.5 MB.', 413)
  const type = sniffImageType(bytes)
  if (!type) return fail('Use a JPG, PNG or WebP picture.', 415)
  await saveAvatar(a.user.id, Buffer.from(bytes).toString('base64'), type)
  const user = await findUserById(a.user.id)
  return user ? ok('Photo saved', { user: toPublicUser(user) }) : fail('Please log in first', 401)
}

export async function DELETE(req: NextRequest) {
  const a = await requireUser(req)
  if ('res' in a) return a.res
  await clearAvatar(a.user.id)
  const user = await findUserById(a.user.id)
  return user ? ok('Photo removed', { user: toPublicUser(user) }) : fail('Please log in first', 401)
}

export const dynamic = 'force-dynamic'
