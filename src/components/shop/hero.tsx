import Link from 'next/link'
import { SITE } from '@/constants/site'
import { formatMoney } from '@/lib/money'
import type { Product } from '@/server/db/products'
import { ProductImage } from './product-image'

function Tile({ p, hidden }: { p: Product; hidden?: boolean }) {
  return (
    <Link href={`/products/${p.slug}`} tabIndex={hidden ? -1 : undefined} aria-hidden={hidden || undefined} className="group block pb-4">
      <ProductImage name={p.name} imageUrl={p.imageUrl} className="aspect-[3/4] rounded-md" />
      <p className="mt-2 truncate text-xs font-medium group-hover:underline sm:text-sm">{p.name}</p>
      <p className="text-xs text-muted-foreground sm:text-sm">{formatMoney(p.priceCents, p.currency)}</p>
    </Link>
  )
}

/**
 * Headline on the left. On the right, three columns of products drift slowly past (the middle one the other way), so the
 * whole catalogue passes by. They pause when you point at them and stand still for anyone who prefers reduced motion.
 * With fewer than six products it falls back to a still row of three.
 */
export function Hero({ featured }: { featured: Product[] }) {
  const moving = featured.length >= 6
  const columns = [0, 1, 2].map((c) => featured.filter((_, i) => i % 3 === c))
  return (
    <section className="grid items-center gap-10 py-6 sm:py-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14 lg:py-14">
      <div>
        <h1 className="font-display text-[2.5rem] leading-[1.05] sm:text-5xl lg:text-[3.6rem]">{SITE.tagline}</h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">Bags, tech and home pieces chosen to last. Order in a few minutes and follow it all the way to your door.</p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="#shop" className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">Shop the collection</Link>
          <Link href="/track" className="text-sm font-medium underline decoration-border underline-offset-4 hover:decoration-foreground">Track an order</Link>
        </div>
      </div>

      {moving ? (
        <div className="hero-showcase grid h-[26rem] grid-cols-3 gap-3 overflow-hidden sm:h-[34rem] sm:gap-4 [mask-image:linear-gradient(to_bottom,transparent,#000_10%,#000_90%,transparent)]">
          {columns.map((col, c) => (
            <div key={c} className={`hero-col ${c === 1 ? 'reverse' : ''}`} style={{ ['--hero-speed' as string]: `${46 + c * 9}s` }}>
              {col.map((p) => <Tile key={`a-${p.id}`} p={p} />)}
              {col.map((p) => <Tile key={`b-${p.id}`} p={p} hidden />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {featured.slice(0, 3).map((p, i) => <div key={p.id} className={i === 1 ? 'mt-8 sm:mt-12' : ''}><Tile p={p} /></div>)}
        </div>
      )}
    </section>
  )
}
