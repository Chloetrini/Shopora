/*
 * Search for the shop: matching, ranking and suggestions. Pure functions, no React.
 * The phone app has an identical copy (mobile/src/search.ts); `search.test.ts` fails if the two ever differ.
 */

export type Searchable = { name: string; description?: string; category: string }

/** Lower case with accents removed, so "cafe" finds "Café". */
export const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** The words of a query (at most 6), folded. */
export const tokens = (q: string): string[] => fold(q).split(/\s+/).filter(Boolean).slice(0, 6)

/** How well a product matches: 0 = not at all, higher = better. Every word of the query must appear somewhere. */
export function scoreProduct(p: Searchable, q: string): number {
  const words = tokens(q)
  if (words.length === 0) return 0
  const name = fold(p.name)
  const rest = `${fold(p.description ?? '')} ${fold(p.category)}`
  if (!words.every((w) => name.includes(w) || rest.includes(w))) return 0
  const whole = words.join(' ')
  if (name.startsWith(whole)) return 100
  if (name.split(/[^a-z0-9]+/).some((w) => w.startsWith(words[0])) && words.every((w) => name.includes(w))) return 80
  if (name.includes(whole)) return 60
  if (words.every((w) => name.includes(w))) return 50
  return 20 // found only in the description or category
}

export const matchesQuery = (p: Searchable, q: string): boolean => scoreProduct(p, q) > 0

/** The best matches first (ties by name), at most `limit`. An empty query suggests nothing. */
export function suggest<T extends Searchable>(products: T[], q: string, limit = 6): T[] {
  return products
    .map((p) => ({ p, s: scoreProduct(p, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name))
    .slice(0, limit)
    .map((x) => x.p)
}

/** Categories whose name starts with, or contains, the query ("bag" suggests Bags). */
export function suggestCategories<T extends { label: string }>(categories: T[], q: string, limit = 2): T[] {
  const w = fold(q.trim())
  if (!w) return []
  return categories
    .map((c) => ({ c, s: fold(c.label).startsWith(w) ? 2 : fold(c.label).includes(w) ? 1 : 0 }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.c)
}

/** Splits `text` into pieces, marking the ones that match a word of the query (for bold highlighting). */
export function highlightParts(text: string, q: string): { text: string; match: boolean }[] {
  const words = [...new Set(q.trim().split(/\s+/).filter(Boolean))].slice(0, 6)
  if (words.length === 0) return [{ text, match: false }]
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig')
  return text
    .split(re)
    .filter((part) => part !== '')
    .map((part) => ({ text: part, match: words.some((w) => part.toLowerCase() === w.toLowerCase()) }))
}
