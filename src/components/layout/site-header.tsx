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
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight">{SITE.name}</Link>

          <nav aria-label="Main" className="ml-6 hidden items-center gap-6 text-sm md:flex">
            <Link href="/#shop" className="hover:text-primary">Shop</Link>
            <Link href="/track" className="hover:text-primary">Track an order</Link>
          </nav>

          {/* One group, one size, one gap: tools first, then the account. */}
          <div className="ml-auto flex items-center gap-2">
            <Link href="/track" aria-label="Track an order" className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface hover:border-primary md:hidden">
              <PackageSearch className="size-[18px]" aria-hidden />
            </Link>
            <ThemeToggle />
            <CartLink />
            <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
            <UserMenu user={user} />
          </div>
        </div>
      </header>
    </>
  )
}
