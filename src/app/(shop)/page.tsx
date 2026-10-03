import Link from 'next/link'
import { PackageCheck, ShieldCheck, Mail, LogIn } from 'lucide-react'
import { ProductCard } from '@/components/shop/product-card'
import { SearchBox } from '@/components/shop/search-box'
import { Hero } from '@/components/shop/hero'
import { applyCatalogFilters, catalogHref, CATEGORIES, parseCatalogQuery, SORTS } from '@/lib/catalog'
import { getSessionUser } from '@/server/current-user'
import { ratingSummaries, wishlistProductIds } from '@/server/db/features'
import { listProducts } from '@/server/db/products'

// Reads the database on every request so new products show up without a rebuild.
export const dynamic = 'force-dynamic'

const TRUST = [
  { icon: ShieldCheck, title: 'Secure checkout', text: 'Card payments run through Paystack.' },
  { icon: Mail, title: 'Email updates', text: 'A receipt, then shipping and delivery updates.' },
  { icon: PackageCheck, title: 'Track every order', text: 'Follow it step by step, signed in or not.' },
  { icon: LogIn, title: 'Quick sign in', text: 'Continue with Google and keep all orders together.' },
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
  const featured = all.slice(0, 3)
  const filtered = !!(f.category || f.search)

  return (
    <>
      {!filtered && <Hero featured={featured} />}

      {!filtered && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t) => (
            <li key={t.title} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
              <t.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-semibold">{t.title}</p>
                <p className="text-sm text-muted-foreground">{t.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section id="shop" className="scroll-mt-24 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-semibold">{f.category ? CATEGORIES.find((c) => c.slug === f.category)?.label : 'Shop all'}</h2>
          <SearchBox
            products={all.map((p) => ({ slug: p.slug, name: p.name, priceCents: p.priceCents, currency: p.currency, category: p.category }))}
            categories={CATEGORIES.map((c) => ({ slug: c.slug, label: c.label }))}
            initialQuery={f.search} category={f.category} sort={f.sort}
          />
        </div>

        <nav aria-label="Categories" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2">
          {[{ slug: '', label: 'All' }, ...CATEGORIES].map((c) => (
            <Link key={c.slug || 'all'} href={catalogHref({ category: c.slug, sort: f.sort, search: f.search })} scroll={false}
              aria-current={f.category === c.slug ? 'page' : undefined}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${f.category === c.slug ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface hover:border-primary'}`}>
              {c.label}
            </Link>
          ))}
        </nav>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
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
          <div className="mt-10 rounded-2xl border border-border bg-surface p-10 text-center">
            <p className="font-display text-xl font-semibold">Nothing matches that</p>
            <p className="mt-1 text-muted-foreground">Try another word or category.</p>
            <Link href="/#shop" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Show everything</Link>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} wished={wishIds.includes(p.id)} signedIn={!!user} rating={(ratings as Record<string, { average: number; count: number }>)[p.id]} />)}
          </ul>
        )}
      </section>

      {!filtered && (
        <section className="mt-20 grid items-center gap-8 rounded-3xl bg-ink px-6 py-12 text-ink-foreground sm:px-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold">Order as a guest, or keep it all together.</h2>
            <p className="mt-3 max-w-md opacity-80">You never need an account to buy. Sign in and every order lives in one place, with live tracking. Signing in with Google also picks up earlier orders placed with the same email.</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/register" className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90">Create an account</Link>
            <Link href="/track" className="rounded-full border border-white/30 px-6 py-3 font-medium hover:bg-white/10">Track as a guest</Link>
          </div>
        </section>
      )}
    </>
  )
}
