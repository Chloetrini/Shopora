import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { fold, highlightParts, matchesQuery, scoreProduct, suggest, suggestCategories, tokens } from './search'

const P = [
  { slug: 'leather-tote', name: 'Leather Tote Bag', description: 'A roomy everyday bag', category: 'bags' },
  { slug: 'desk-lamp', name: 'Desk Lamp', description: 'Warm light for late nights', category: 'home' },
  { slug: 'travel-bottle', name: 'Travel Water Bottle', description: 'Keeps drinks cold', category: 'outdoors' },
  { slug: 'cafe-mug', name: 'Café Mug', description: 'Ceramic mug', category: 'home' },
  { slug: 'bag-charm', name: 'Bag Charm', description: 'A little charm', category: 'accessories' },
]

describe('matching', () => {
  it('ignores case and accents', () => {
    expect(fold('Café')).toBe('cafe')
    expect(matchesQuery(P[3], 'CAFE')).toBe(true)
  })
  it('needs every word of the query', () => {
    expect(matchesQuery(P[0], 'leather bag')).toBe(true)
    expect(matchesQuery(P[0], 'leather lamp')).toBe(false)
  })
  it('finds words in the description and category too', () => {
    expect(matchesQuery(P[1], 'warm')).toBe(true)
    expect(matchesQuery(P[2], 'outdoors')).toBe(true)
  })
  it('an empty query matches nothing (so it suggests nothing)', () => {
    expect(tokens('   ')).toEqual([])
    expect(scoreProduct(P[0], '  ')).toBe(0)
    expect(suggest(P, '')).toEqual([])
  })
})

describe('suggestions', () => {
  it('rank a name that starts with the query first, then a word that starts with it, then the rest', () => {
    expect(suggest(P, 'bag').map((p) => p.slug)).toEqual(['bag-charm', 'leather-tote'])
    expect(suggest(P, 'water').map((p) => p.slug)).toEqual(['travel-bottle'])
  })
  it('stop at the limit', () => {
    expect(suggest(P, 'a', 2)).toHaveLength(2)
  })
  it('find nothing for nonsense', () => {
    expect(suggest(P, 'zzzzz')).toEqual([])
  })
  it('suggest categories by prefix or inside the word', () => {
    const cats = [{ label: 'Bags' }, { label: 'Accessories' }, { label: 'Outdoors' }]
    expect(suggestCategories(cats, 'ba').map((c) => c.label)).toEqual(['Bags'])
    expect(suggestCategories(cats, 'door').map((c) => c.label)).toEqual(['Outdoors'])
    expect(suggestCategories(cats, '')).toEqual([])
  })
})

describe('highlighting', () => {
  it('marks the matching parts and loses no text', () => {
    const parts = highlightParts('Leather Tote Bag', 'tote')
    expect(parts.map((p) => p.text).join('')).toBe('Leather Tote Bag')
    expect(parts.filter((p) => p.match).map((p) => p.text)).toEqual(['Tote'])
  })
  it('is safe with regex characters', () => {
    expect(highlightParts('a (b) c', '(b')).toBeTruthy()
    expect(highlightParts('x', '[')[0].text).toBe('x')
  })
})

describe('the app and the website use the same search', () => {
  it('mobile/src/search.ts is an exact copy of src/lib/search.ts', () => {
    const root = path.resolve(__dirname, '../..')
    expect(readFileSync(path.join(root, 'mobile/src/search.ts'), 'utf8')).toBe(readFileSync(path.join(root, 'src/lib/search.ts'), 'utf8'))
  })
})
