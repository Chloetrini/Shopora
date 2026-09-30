import Link from 'next/link'
import { PackageSearch } from 'lucide-react'
import { SITE } from '@/constants/site'
import { ThemeToggle } from '@/context/theme'
import type { PublicUser } from '@/server/db/users'
import { CartLink } from './cart-link'
import { UserMenu } from './user-menu'

export function SiteHeader({ user }: { user: PublicUser | null }) {
  return (
    <>
      <div className="bg-ink px-4 py-2 text-center text-xs text-ink-foreground">
        Secure checkout with Paystack. Order confirmations and delivery updates by email.
      </div>
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight">{SITE.name}</Link>
          <nav aria-label="Main" className="hidden items-center gap-6 text-sm sm:flex">
            <Link href="/#shop" className="hover:text-primary">Shop</Link>
            <Link href="/track" className="hover:text-primary">Track an order</Link>
            {user?.isAdmin && <Link href="/admin/orders" className="hover:text-primary">Manage orders</Link>}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/track" aria-label="Track an order" className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface hover:border-primary sm:hidden">
              <PackageSearch className="size-4" aria-hidden />
            </Link>
            <ThemeToggle />
            <CartLink />
            <UserMenu user={user} />
          </div>
        </div>
      </header>
    </>
  )
}
