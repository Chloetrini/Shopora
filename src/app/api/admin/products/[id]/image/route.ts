import type { NextRequest } from 'next/server'
import { MAX_IMAGE_BYTES, sniffImageType } from '@/lib/image-type'
import { saveProductImage } from '@/server/db/features'
import { getProductById } from '@/server/db/products'
import { fail, ok } from '@/server/http'
import { requireAdmin } from '@/server/require-user'

/** Raw image bytes in the request body. The type is decided from the bytes, never the header or file name. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin(req)
  if ('res' in a) return a.res
  const bytes = new Uint8Array(await req.arrayBuffer())
  if (bytes.length === 0) return fail('Choose an image first', 400)
  if (bytes.length > MAX_IMAGE_BYTES) return fail('That image is too large. Use one under 1.5 MB.', 413)
  const type = sniffImageType(bytes)
  if (!type) return fail('Use a JPG, PNG or WebP image.', 415)
  const product = await getProductById((await params).id)
  if (!product) return fail('Not found', 404)
  await saveProductImage(product.slug, Buffer.from(bytes).toString('base64'), type)
  return ok('Photo saved')
}
