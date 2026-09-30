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
  const needle = f.search.toLowerCase()
  const out = products.filter(
    (p) =>
      (!f.category || p.category === f.category) &&
      (!needle || p.name.toLowerCase().includes(needle) || p.description.toLowerCase().includes(needle)),
  )
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

export type ArtKind =
  | 'tote' | 'mug' | 'lamp' | 'notebook' | 'bottle' | 'beanie'
  | 'backpack' | 'sunglasses' | 'watch' | 'headphones' | 'candle' | 'plant'

const KEYWORDS: [RegExp, ArtKind][] = [
  [/backpack/, 'backpack'], [/tote/, 'tote'], [/mug/, 'mug'], [/lamp/, 'lamp'], [/notebook/, 'notebook'],
  [/bottle/, 'bottle'], [/beanie/, 'beanie'], [/sunglass/, 'sunglasses'], [/watch/, 'watch'],
  [/headphone|earbud/, 'headphones'], [/candle/, 'candle'], [/planter|succulent|plant/, 'plant'],
]
const BY_CATEGORY: Record<string, ArtKind> = {
  bags: 'tote', accessories: 'watch', tech: 'headphones', home: 'candle', stationery: 'notebook', outdoors: 'bottle', clothing: 'beanie',
}

/** Which drawing stands in for a product whose photo is missing or fails to load. */
export function artKind(slug: string, category: string): ArtKind {
  return KEYWORDS.find(([re]) => re.test(slug))?.[1] ?? BY_CATEGORY[category] ?? 'tote'
}

export const TONES = [
  { bg1: '#e9edf2', bg2: '#ccd6e2', c1: '#3a4a5f', c2: '#1f2a3a' },
  { bg1: '#e2ece6', bg2: '#c2d8cc', c1: '#2f6b57', c2: '#1d4538' },
  { bg1: '#e6e9f5', bg2: '#c8d0ea', c1: '#34468f', c2: '#212d5e' },
  { bg1: '#f6eed6', bg2: '#ebdba0', c1: '#b8861b', c2: '#7d5a0c' },
  { bg1: '#f1e2ec', bg2: '#dfc1d4', c1: '#8a3a68', c2: '#5c2444' },
  { bg1: '#e8e8e6', bg2: '#cfcfcb', c1: '#2b2b2b', c2: '#111111' },
] as const

/** Same product, same colours, every time (a simple string hash). */
export function toneFor(slug: string) {
  let h = 0
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TONES[h % TONES.length]
}
