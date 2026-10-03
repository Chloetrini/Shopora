'use client'

import { Clock, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useDismiss } from '@/hooks/use-dismiss'
import { catalogHref } from '@/lib/catalog'
import { formatMoney } from '@/lib/money'
import { didYouMean, highlightParts, pushRecent, suggest, suggestCategories } from '@/lib/search'
import { ProductImage } from '@/components/shop/product-image'

type Item = { slug: string; name: string; priceCents: number; currency: string; category: string; imageUrl: string | null }

const RECENT_KEY = 'shopora-recent-searches'
const readRecent = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 5) : []
  } catch {
    return []
  }
}
const writeRecent = (list: string[]) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    /* storage blocked: recents just aren't kept */
  }
}
type Category = { slug: string; label: string }

/** Bold the parts of `text` that match what was typed. */
function Marked({ text, q }: { text: string; q: string }) {
  return (
    <>
      {highlightParts(text, q).map((p, i) => (p.match ? <strong key={i} className="font-semibold text-foreground">{p.text}</strong> : <span key={i}>{p.text}</span>))}
    </>
  )
}

/**
 * Search as you type: suggestions drop down under the box while you type (matched here in the browser, so they are instant),
 * and the product list below updates a moment after you stop typing. Enter, with nothing chosen, runs the normal search.
 */
export function SearchBox({ products, categories, initialQuery, category, sort }: {
  products: Item[]; categories: Category[]; initialQuery: string; category: string; sort: string
}) {
  const router = useRouter()
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [q, setQ] = useState(initialQuery)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  // The last few searches. Only shown after you interact, so the server and browser HTML always agree.
  const [recent, setRecent] = useState<string[]>(() => (typeof window === 'undefined' ? [] : readRecent()))
  useDismiss(wrapRef, open, () => setOpen(false))

  const productHits = useMemo(() => suggest(products, q, 6), [products, q])
  const categoryHits = useMemo(() => suggestCategories(categories, q, 2), [categories, q])
  // One flat list so the arrow keys move through everything in order.
  const rows = useMemo(
    () => [
      ...productHits.map((p) => ({ key: `p-${p.slug}`, href: `/products/${p.slug}`, kind: 'product' as const, p })),
      ...categoryHits.map((c) => ({ key: `c-${c.slug}`, href: catalogHref({ category: c.slug, sort }), kind: 'category' as const, c })),
    ],
    [productHits, categoryHits, sort],
  )
  const typed = q.trim().length > 0
  const showList = open && (typed || recent.length > 0)
  const fix = useMemo(() => (typed && productHits.length === 0 && categoryHits.length === 0 ? didYouMean(products, q) : null), [typed, productHits.length, categoryHits.length, products, q])

  function remember(term: string) {
    const next = pushRecent(recent, term)
    setRecent(next)
    writeRecent(next)
  }

  // The list below the box follows what has been typed, a moment after the last key.
  useEffect(() => {
    if (q.trim() === initialQuery.trim()) return
    const t = setTimeout(() => router.replace(catalogHref({ category, sort, search: q.trim() }), { scroll: false }), 250)
    return () => clearTimeout(t)
  }, [q, initialQuery, category, sort, router])

  function go(href: string, term?: string) {
    if (term) remember(term)
    setOpen(false)
    router.push(href)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (rows.length === 0 ? -1 : (i + 1) % rows.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (rows.length === 0 ? -1 : i <= 0 ? rows.length - 1 : i - 1))
    } else if (e.key === 'Enter' && active >= 0 && rows[active]) {
      e.preventDefault()
      const r = rows[active]
      go(r.href, r.kind === 'product' ? r.p.name : undefined)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <form action="/" method="get" role="search" className="flex gap-2" onSubmit={() => { if (typed) remember(q) }}>
        {category && <input type="hidden" name="category" value={category} />}
        {sort !== 'featured' && <input type="hidden" name="sort" value={sort} />}
        <label htmlFor="q" className="sr-only">Search products</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id="q" name="q" value={q} autoComplete="off" placeholder="Search products"
            role="combobox" aria-expanded={showList} aria-controls={listId} aria-autocomplete="list"
            aria-activedescendant={active >= 0 && rows[active] ? `${listId}-${active}` : undefined}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1) }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="w-52 rounded-md border border-border bg-surface py-2 pl-10 pr-4 text-sm sm:w-72"
          />
        </div>
        <button type="submit" className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">Search</button>
      </form>

      {showList && (
        <ul id={listId} role="listbox" className="absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {!typed && (
            <>
              <li className="flex items-center justify-between px-4 pb-1 pt-3 text-xs text-muted-foreground">
                <span>Recent searches</span>
                <button type="button" onPointerDown={(e) => { e.preventDefault(); setRecent([]); writeRecent([]) }} className="underline hover:text-foreground">Clear</button>
              </li>
              {recent.map((term) => (
                <li key={term} role="option" aria-selected={false}
                  onPointerDown={(e) => { e.preventDefault(); setQ(term); setActive(-1) }}
                  className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:bg-primary-soft">
                  <Clock className="size-4 shrink-0" aria-hidden /> <span className="truncate">{term}</span>
                </li>
              ))}
            </>
          )}
          {typed && rows.length === 0 && (
            <li className="space-y-2 px-4 py-3 text-sm text-muted-foreground">
              <p>No products match “{q.trim()}”.</p>
              {fix && (
                <p>Did you mean{' '}
                  <button type="button" onPointerDown={(e) => { e.preventDefault(); setQ(fix); setActive(-1) }} className="font-semibold text-primary underline">{fix}</button>?
                </p>
              )}
              <p className="flex flex-wrap gap-1.5">
                <span>Or browse:</span>
                {categories.slice(0, 4).map((c) => (
                  <button key={c.slug} type="button" onPointerDown={(e) => { e.preventDefault(); go(catalogHref({ category: c.slug, sort })) }}
                    className="rounded-md border border-border px-2.5 py-0.5 text-xs hover:border-primary">{c.label}</button>
                ))}
              </p>
            </li>
          )}
          {typed && rows.map((r, i) => (
            <li key={r.key} id={`${listId}-${i}`} role="option" aria-selected={i === active}
              onPointerDown={(e) => { e.preventDefault(); go(r.href, r.kind === 'product' ? r.p.name : undefined) }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2 text-sm ${i === active ? 'bg-primary-soft' : ''}`}>
              {r.kind === 'product' ? (
                <>
                  <ProductImage name={r.p.name} imageUrl={r.p.imageUrl} className="size-9 shrink-0 rounded-md" />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground"><Marked text={r.p.name} q={q} /></span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatMoney(r.p.priceCents, r.p.currency)}</span>
                </>
              ) : (
                <span className="py-1 text-muted-foreground">All in <strong className="font-semibold text-foreground">{r.c.label}</strong></span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
