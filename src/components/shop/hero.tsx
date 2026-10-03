import Link from 'next/link'
import { SITE } from '@/constants/site'
import { formatMoney } from '@/lib/money'
import type { Product } from '@/server/db/products'
import { ProductImage } from './product-image'

/** One calm headline and one large product photo. No box, no gradient. */
export function Hero({ featured }: { featured: Product[] }) {
  const lead = featured[0]
  return (
    <section className="grid items-center gap-10 py-6 sm:py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-14">
      <div>
        <h1 className="font-display text-[2.5rem] leading-[1.05] sm:text-6xl">{SITE.tagline}</h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">Bags, tech and home pieces chosen to last. Order in a few minutes and follow it all the way to your door.</p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="#shop" className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">Shop the collection</Link>
          <Link href="/track" className="text-sm font-medium underline decoration-border underline-offset-4 hover:decoration-foreground">Track an order</Link>
        </div>
      </div>
      {lead && (
        <Link href={`/products/${lead.slug}`} className="group block">
          <ProductImage name={lead.name} imageUrl={lead.imageUrl} className="aspect-[5/4] w-full rounded-md" />
          <p className="mt-3 flex items-baseline justify-between gap-4 text-sm">
            <span className="font-medium group-hover:underline">{lead.name}</span>
            <span className="text-muted-foreground">{formatMoney(lead.priceCents, lead.currency)}</span>
          </p>
        </Link>
      )}
    </section>
  )
}
