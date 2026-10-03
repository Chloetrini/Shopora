'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Receipt, Settings2, ShoppingBag, User } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { cartCount } from '@/lib/cart'

// Only visible when the site is opened from the home screen on a phone (see .app-tabbar in globals.css),
// so it mirrors the phone app's bottom tabs and never shows in a normal browser.
export function AppTabBar({ signedIn, isAdmin }: { signedIn: boolean; isAdmin: boolean }) {
  const path = usePathname()
  const { cart } = useCart()
  const n = cartCount(cart)
  const tabs = [
    { href: '/', label: 'Shop', Icon: Home, active: path === '/' || path.startsWith('/products') },
    { href: '/cart', label: 'Cart', Icon: ShoppingBag, active: path.startsWith('/cart') || path.startsWith('/checkout'), badge: n },
    { href: signedIn ? '/orders' : '/track', label: signedIn ? 'Orders' : 'Track', Icon: Receipt, active: path.startsWith('/orders') || path.startsWith('/track') },
    ...(isAdmin ? [{ href: '/admin/orders', label: 'Admin', Icon: Settings2, active: path.startsWith('/admin') }] : []),
    { href: signedIn ? '/profile' : '/login', label: 'Account', Icon: User, active: path.startsWith('/profile') || path.startsWith('/addresses') || path.startsWith('/wishlist') },
  ]
  return (
    <nav aria-label="App" className="app-tabbar">
      {tabs.map(({ href, label, Icon, active, badge }) => (
        <Link key={label} href={href} aria-current={active ? 'page' : undefined} className={`app-tab ${active ? 'active' : ''}`}>
          <span className="relative">
            <Icon className="size-[22px]" aria-hidden />
            {!!badge && badge > 0 && (
              <span className="absolute -right-2.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">{badge > 99 ? '99+' : badge}</span>
            )}
          </span>
          {label}
        </Link>
      ))}
    </nav>
  )
}
