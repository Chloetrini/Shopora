import Link from 'next/link'
import { ProductCard } from '@/components/shop/product-card'
import { SearchBox } from '@/components/shop/search-box'
import { Hero } from '@/components/shop/hero'
import { didYouMean } from '@/lib/search'
import { applyCatalogFilters, catalogHref, CATEGORIES, parseCatalogQuery, SORTS } from '@/lib/catalog'
import { getSessionUser } from '@/server/current-user'
import { ratingSummaries, wishlistProductIds } from '@/server/db/features'
import { listProducts } from '@/server/db/products'

// Reads the database on every request so new products show up without a rebuild.
export const dynamic = 'force-dynamic'

const ASSURANCES = [
  { title: 'Secure payment', text: 'Pay by card through Paystack. Your card details never touch our servers.' },
  { title: 'Clear delivery fees', text: 'See the delivery fee for your area before you pay, with no surprises at the door.' },
  { title: 'Track every order', text: 'Follow each order from payment to delivery, signed in or not.' },
]

export default async function HomePage({ searchParams }: { searchParams: Promise<{ category?: string; sort?: string; q?: string }> }) {
  const f = parseCatalogQuery(await searchParams)
  const user = await getSessionUser()
  const [all, wishIds, ratings] = await Promise.all([
    listProducts(),
    user ? wishlistProductIds(user.id) : Promise.resolve([] as string[]),
    ratingSummaries().catch(() => ({})),
  ])
  const products = applyCatalogFilters(all, f)
  const featured = all.slice(0, 12)
  const fix = products.length === 0 && f.search ? didYouMean(all, f.search) : null
  const filtered = !!(f.category || f.search)

  return (
    <>
      {!filtered && <div className="app-hide"><Hero featured={featured} /></div>}

      {!filtered && (
        <ul className="app-hide mt-6 grid gap-8 border-t border-border pt-10 sm:grid-cols-3 sm:gap-10">
          {ASSURANCES.map((t, i) => (
            <li key={t.title}>
              <p className="text-xs font-medium tabular-nums text-muted-foreground">{String(i + 1).padStart(2, '0')}</p>
              <p className="mt-2 text-sm font-semibold">{t.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.text}</p>
            </li>
          ))}
        </ul>
      )}

      <section id="shop" className="app-shop scroll-mt-24 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="app-hide font-display text-2xl">{f.category ? CATEGORIES.find((c) => c.slug === f.category)?.label : 'All products'}</h2>
          <SearchBox
            products={all.map((p) => ({ slug: p.slug, name: p.name, priceCents: p.priceCents, currency: p.currency, category: p.category, imageUrl: p.imageUrl }))}
            categories={CATEGORIES.map((c) => ({ slug: c.slug, label: c.label }))}
            initialQuery={f.search} category={f.category} sort={f.sort}
          />
        </div>

        <nav aria-label="Categories" className="-mx-4 mt-6 flex gap-7 overflow-x-auto border-b border-border px-4 text-sm sm:mx-0 sm:px-0">
          {[{ slug: '', label: 'All' }, ...CATEGORIES].map((c) => (
            <Link key={c.slug || 'all'} href={catalogHref({ category: c.slug, sort: f.sort, search: f.search })} scroll={false}
              aria-current={f.category === c.slug ? 'page' : undefined}
              className={`-mb-px shrink-0 border-b-2 pb-3 ${f.category === c.slug ? 'border-foreground font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {c.label}
            </Link>
          ))}
        </nav>

        <div className="app-hide mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>{products.length} {products.length === 1 ? 'product' : 'products'}{f.search ? ` for “${f.search}”` : ''}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            Sort:
            {SORTS.map((s) => (
              <Link key={s.value} href={catalogHref({ category: f.category, sort: s.value, search: f.search })} scroll={false}
                className={f.sort === s.value ? 'font-semibold text-foreground underline' : 'hover:text-foreground'}>{s.label}</Link>
            ))}
          </p>
        </div>

        {products.length === 0 ? (
          <div className="mt-10 rounded-lg border border-border bg-surface p-10 text-center">
            <p className="font-display text-xl">{f.search ? `Nothing matches “${f.search}”` : 'Nothing matches that'}</p>
            {fix && (
              <p className="mt-2">Did you mean <Link href={catalogHref({ category: f.category, sort: f.sort, search: fix })} scroll={false} className="font-semibold text-primary underline">{fix}</Link>?</p>
            )}
            <p className="mt-2 text-muted-foreground">Check the spelling, try fewer words, or browse a category:</p>
            <p className="mt-3 flex flex-wrap justify-center gap-2">
              {CATEGORIES.slice(0, 5).map((c) => (
                <Link key={c.slug} href={catalogHref({ category: c.slug, sort: f.sort })} scroll={false} className="rounded-md border border-border px-4 py-1.5 text-sm hover:border-foreground">{c.label}</Link>
              ))}
            </p>
            <Link href="/#shop" className="mt-5 inline-block rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Show everything</Link>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} wished={wishIds.includes(p.id)} signedIn={!!user} rating={(ratings as Record<string, { average: number; count: number }>)[p.id]} />)}
          </ul>
        )}
      </section>

      {!filtered && (
        <section className="app-hide mt-24 grid items-center gap-6 border-t border-border pt-14 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl">Buy as a guest, or keep it all together.</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">You never need an account to buy. Sign in and every order lives in one place with live tracking. Signing in with Google also picks up earlier orders placed with the same email.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:justify-end">
            <Link href="/register" className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">Create an account</Link>
            <Link href="/track" className="text-sm font-medium underline decoration-border underline-offset-4 hover:decoration-foreground">Track as a guest</Link>
          </div>
        </section>
      )}
    </>
  )
}
