import Link from 'next/link'
import { SITE } from '@/constants/site'
import { CATEGORIES, catalogHref } from '@/lib/catalog'

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="text-[15px] font-semibold uppercase tracking-[0.2em]">{SITE.name}</p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">{SITE.description}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Shop</p>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            {CATEGORIES.map((c) => (
              <li key={c.slug}><Link href={catalogHref({ category: c.slug })} className="hover:text-foreground">{c.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Orders</p>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li><Link href="/track" className="hover:text-foreground">Track an order</Link></li>
            <li><Link href="/orders" className="hover:text-foreground">My orders</Link></li>
            <li><Link href="/cart" className="hover:text-foreground">Cart</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Account</p>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li><Link href="/login" className="hover:text-foreground">Log in</Link></li>
            <li><Link href="/register" className="hover:text-foreground">Create an account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-5 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {SITE.name}</span>
          <span>Payments are processed by Paystack.</span>
        </p>
      </div>
    </footer>
  )
}
