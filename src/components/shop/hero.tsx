import Link from 'next/link'
import { SITE } from '@/constants/site'
import { formatMoney } from '@/lib/money'
import type { Product } from '@/server/db/products'
import { ProductImage } from './product-image'

export function Hero({ featured }: { featured: Product[] }) {
  return (
    <section className="hero-glow -mx-4 rounded-3xl bg-surface px-6 py-10 sm:mx-0 sm:px-12 sm:py-16">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-primary">New season, everyday essentials</p>
          <h1 className="font-display mt-3 text-4xl font-semibold leading-tight sm:text-6xl">{SITE.tagline}</h1>
          <p className="mt-4 max-w-md text-muted-foreground">Bags, watches, tech and home pieces chosen to last. Order in minutes and follow it all the way to your door.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#shop" className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90">Shop now</Link>
            <Link href="/track" className="rounded-full bg-background px-6 py-3 font-medium hover:bg-border/60">Track an order</Link>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {featured.map((p, i) => (
            <Link key={p.id} href={`/products/${p.slug}`} className={`group overflow-hidden rounded-2xl bg-background shadow-sm ${i === 1 ? 'mt-8' : ''}`}>
              <ProductImage name={p.name} imageUrl={p.imageUrl} className="aspect-[3/4]" />
              <div className="p-2">
                <p className="truncate text-xs font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{formatMoney(p.priceCents, p.currency)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
