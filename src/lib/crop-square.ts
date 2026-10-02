/**
 * Browser only. Centre-crops a picture to a square of at most `size` pixels and re-encodes it as JPEG, so a 5 MB phone
 * photo becomes a few dozen KB. If the browser can't read the file, the original is returned and the server decides.
 */
export async function cropSquare(file: File, size = 512, quality = 0.88): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const side = Math.min(bitmap.width, bitmap.height)
    const out = Math.min(size, side)
    const canvas = document.createElement('canvas')
    canvas.width = out
    canvas.height = out
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#ffffff' // a transparent PNG becomes white, not black, in a JPEG
    ctx.fillRect(0, 0, out, out)
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out)
    bitmap.close()
    return (await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))) ?? file
  } catch {
    return file
  }
}
