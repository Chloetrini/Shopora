import Link from 'next/link'
import { SITE } from '@/constants/site'
import { CATEGORIES, catalogHref } from '@/lib/catalog'

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl font-semibold">{SITE.name}</p>
          <p className="mt-3 max-w-xs text-sm opacity-70">{SITE.description}</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Shop</p>
          <ul className="mt-3 space-y-2 text-sm opacity-80">
            {CATEGORIES.map((c) => (
              <li key={c.slug}><Link href={catalogHref({ category: c.slug })} className="hover:underline">{c.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Orders</p>
          <ul className="mt-3 space-y-2 text-sm opacity-80">
            <li><Link href="/track" className="hover:underline">Track an order</Link></li>
            <li><Link href="/orders" className="hover:underline">My orders</Link></li>
            <li><Link href="/cart" className="hover:underline">Cart</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Account</p>
          <ul className="mt-3 space-y-2 text-sm opacity-80">
            <li><Link href="/login" className="hover:underline">Log in</Link></li>
            <li><Link href="/register" className="hover:underline">Create an account</Link></li>
          </ul>
          <p className="mt-6 text-xs opacity-60">Payments are processed by Paystack.</p>
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-4 text-center text-xs opacity-60">© {new Date().getFullYear()} {SITE.name}</p>
    </footer>
  )
}
