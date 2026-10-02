import { describe, expect, it } from 'vitest'
import { applyCatalogFilters, catalogHref, parseCatalogQuery } from './catalog'

const items = [
  { name: 'Canvas tote', description: 'Cotton bag', category: 'bags', priceCents: 1800000 },
  { name: 'Ceramic mug', description: 'Glazed', category: 'home', priceCents: 1400000 },
  { name: 'Steel watch', description: 'Quartz', category: 'accessories', priceCents: 9500000 },
]

describe('parseCatalogQuery', () => {
  it('keeps valid values and drops unknown ones', () => {
    expect(parseCatalogQuery({ category: 'bags', sort: 'name', q: ' mug ' })).toEqual({ category: 'bags', sort: 'name', search: 'mug' })
    expect(parseCatalogQuery({ category: 'nope', sort: 'bogus' })).toEqual({ category: '', sort: 'featured', search: '' })
  })
})

describe('applyCatalogFilters', () => {
  const base = { category: '', sort: 'featured' as const, search: '' }
  it('filters by category and by search (name or description, case-insensitive)', () => {
    expect(applyCatalogFilters(items, { ...base, category: 'home' }).map((p) => p.name)).toEqual(['Ceramic mug'])
    expect(applyCatalogFilters(items, { ...base, search: 'COTTON' }).map((p) => p.name)).toEqual(['Canvas tote'])
  })
  it('sorts by price and name without changing the input', () => {
    expect(applyCatalogFilters(items, { ...base, sort: 'price-asc' })[0].name).toBe('Ceramic mug')
    expect(applyCatalogFilters(items, { ...base, sort: 'price-desc' })[0].name).toBe('Steel watch')
    expect(applyCatalogFilters(items, { ...base, sort: 'name' })[0].name).toBe('Canvas tote')
    expect(items[0].name).toBe('Canvas tote')
  })
})

describe('catalogHref', () => {
  it('omits defaults and always jumps to the grid', () => {
    expect(catalogHref({})).toBe('/#shop')
    expect(catalogHref({ category: 'bags', sort: 'featured' })).toBe('/?category=bags#shop')
    expect(catalogHref({ category: 'home', sort: 'name', search: 'a b' })).toBe('/?category=home&sort=name&q=a+b#shop')
  })
})
