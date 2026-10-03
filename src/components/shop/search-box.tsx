'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useDismiss } from '@/hooks/use-dismiss'
import { catalogHref } from '@/lib/catalog'
import { formatMoney } from '@/lib/money'
import { highlightParts, suggest, suggestCategories } from '@/lib/search'

type Item = { slug: string; name: string; priceCents: number; currency: string; category: string }
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
  const showList = open && q.trim().length > 0

  // The list below the box follows what has been typed, a moment after the last key.
  useEffect(() => {
    if (q.trim() === initialQuery.trim()) return
    const t = setTimeout(() => router.replace(catalogHref({ category, sort, search: q.trim() }), { scroll: false }), 250)
    return () => clearTimeout(t)
  }, [q, initialQuery, category, sort, router])

  function go(href: string) {
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
      go(rows[active].href)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <form action="/" method="get" role="search" className="flex gap-2">
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
            className="w-52 rounded-full border border-border bg-surface py-2 pl-10 pr-4 text-sm sm:w-72"
          />
        </div>
        <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-foreground">Search</button>
      </form>

      {showList && (
        <ul id={listId} role="listbox" className="absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          {rows.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">No suggestions. Press Enter to search for “{q.trim()}”.</li>}
          {rows.map((r, i) => (
            <li key={r.key} id={`${listId}-${i}`} role="option" aria-selected={i === active}
              onPointerDown={(e) => { e.preventDefault(); go(r.href) }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm ${i === active ? 'bg-primary-soft' : ''}`}>
              {r.kind === 'product' ? (
                <>
                  <span className="min-w-0 truncate text-muted-foreground"><Marked text={r.p.name} q={q} /></span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatMoney(r.p.priceCents, r.p.currency)}</span>
                </>
              ) : (
                <span className="text-muted-foreground">All in <strong className="font-semibold text-foreground">{r.c.label}</strong></span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
