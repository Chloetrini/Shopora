import { describe, expect, it } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('makes a clean slug', () => expect(slugify('  Leather Tote Bag! ')).toBe('leather-tote-bag'))
  it('drops accents', () => expect(slugify('Café Crème')).toBe('cafe-creme'))
  it('never returns an empty slug', () => expect(slugify('!!!')).toBe('product'))
  it('stays within the slug rule used by the product page', () => {
    expect(slugify('a'.repeat(100))).toMatch(/^[a-z0-9-]{1,80}$/)
  })
})
