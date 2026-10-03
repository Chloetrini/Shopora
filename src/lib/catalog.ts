import { matchesQuery } from './search'
export const CATEGORIES = [
  { slug: 'bags', label: 'Bags' },
  { slug: 'accessories', label: 'Accessories' },
  { slug: 'tech', label: 'Tech' },
  { slug: 'home', label: 'Home' },
  { slug: 'stationery', label: 'Stationery' },
  { slug: 'outdoors', label: 'Outdoors' },
  { slug: 'clothing', label: 'Clothing' },
] as const

export const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A to Z' },
] as const

export type SortValue = (typeof SORTS)[number]['value']

type Sortable = { name: string; description: string; category: string; priceCents: number }

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug.charAt(0).toUpperCase() + slug.slice(1)
}

/** Unknown values fall back to "everything" / "featured", like the task filters in Taskora. */
export function parseCatalogQuery(q: { category?: string; sort?: string; q?: string }) {
  const category = CATEGORIES.some((c) => c.slug === q.category) ? q.category! : ''
  const sort = (SORTS.some((s) => s.value === q.sort) ? q.sort : 'featured') as SortValue
  return { category, sort, search: (q.q ?? '').trim().slice(0, 60) }
}

export function applyCatalogFilters<T extends Sortable>(products: T[], f: { category: string; sort: SortValue; search: string }): T[] {
  const out = products.filter((p) => (!f.category || p.category === f.category) && (!f.search.trim() || matchesQuery(p, f.search)))
  if (f.sort === 'price-asc') out.sort((a, b) => a.priceCents - b.priceCents)
  else if (f.sort === 'price-desc') out.sort((a, b) => b.priceCents - a.priceCents)
  else if (f.sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

/** Builds the catalogue URL for a filter state, omitting defaults so links stay short. */
export function catalogHref(f: { category?: string; sort?: string; search?: string }): string {
  const p = new URLSearchParams()
  if (f.category) p.set('category', f.category)
  if (f.sort && f.sort !== 'featured') p.set('sort', f.sort)
  if (f.search) p.set('q', f.search)
  const s = p.toString()
  return `/${s ? `?${s}` : ''}#shop`
}
