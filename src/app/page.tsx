import Link from 'next/link'
import { PackageCheck, ShieldCheck, Mail, LogIn } from 'lucide-react'
import { ProductCard } from '@/components/shop/product-card'
import { ProductImage } from '@/components/shop/product-image'
import { SITE } from '@/constants/site'
import { applyCatalogFilters, catalogHref, CATEGORIES, parseCatalogQuery, SORTS } from '@/lib/catalog'
import { formatMoney } from '@/lib/money'
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
  const all = await listProducts()
  const products = applyCatalogFilters(all, f)
  const featured = all.slice(0, 3)
  const filtered = !!(f.category || f.search)

  return (
    <>
      {!filtered && (
        <section className="hero-glow -mx-4 rounded-3xl border border-border bg-surface px-6 py-10 sm:mx-0 sm:px-12 sm:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-primary">New season, everyday essentials</p>
              <h1 className="font-display mt-3 text-4xl font-semibold leading-tight sm:text-6xl">{SITE.tagline}</h1>
              <p className="mt-4 max-w-md text-muted-foreground">Bags, watches, tech and home pieces chosen to last. Order in minutes and follow it all the way to your door.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="#shop" className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90">Shop now</Link>
                <Link href="/track" className="rounded-full border border-border px-6 py-3 font-medium hover:border-primary">Track an order</Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {featured.map((p, i) => (
                <Link key={p.id} href={`/products/${p.slug}`} className={`group overflow-hidden rounded-2xl border border-border ${i === 1 ? 'mt-8' : ''}`}>
                  <ProductImage slug={p.slug} category={p.category} name={p.name} imageUrl={p.imageUrl} className="aspect-[3/4]" />
                  <div className="bg-surface p-2">
                    <p className="truncate text-xs font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{formatMoney(p.priceCents, p.currency)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
          <form action="/" method="get" className="flex gap-2" role="search">
            {f.category && <input type="hidden" name="category" value={f.category} />}
            {f.sort !== 'featured' && <input type="hidden" name="sort" value={f.sort} />}
            <label htmlFor="q" className="sr-only">Search products</label>
            <input id="q" name="q" defaultValue={f.search} placeholder="Search products" className="w-44 rounded-full border border-border bg-surface px-4 py-2 text-sm sm:w-64" />
            <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-foreground">Search</button>
          </form>
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
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
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
