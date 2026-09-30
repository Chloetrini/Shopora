import { describe, expect, it } from 'vitest'
import { sniffImageType } from './image-type'

const b = (...n: number[]) => new Uint8Array(n)

describe('sniffImageType', () => {
  it('recognises jpeg, png and webp by their bytes', () => {
    expect(sniffImageType(b(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg')
    expect(sniffImageType(b(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe('image/png')
    expect(sniffImageType(b(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe('image/webp')
  })
  it('rejects html, svg, gif and empty input even if named .jpg', () => {
    expect(sniffImageType(new TextEncoder().encode('<html><script>alert(1)</script>'))).toBeNull()
    expect(sniffImageType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull()
    expect(sniffImageType(new TextEncoder().encode('GIF89a'))).toBeNull()
    expect(sniffImageType(b())).toBeNull()
  })
})
