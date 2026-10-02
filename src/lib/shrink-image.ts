/**
 * Browser only. Shrinks a photo before it is uploaded: the longest side becomes at most `maxSide` pixels and it is
 * re-encoded as JPEG, so a 5 MB phone photo becomes a few hundred KB and the server's 1.5 MB limit is never hit.
 * If the browser can't decode the file (an unusual format), the original is returned and the server decides.
 */
export async function shrinkImage(file: File, maxSide = 1400, quality = 0.85): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#ffffff' // a transparent PNG becomes white, not black, in a JPEG
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    return blob ?? file
  } catch {
    return file
  }
}
