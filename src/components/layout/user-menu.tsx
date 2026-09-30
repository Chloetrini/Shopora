'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useDismiss } from '@/hooks/use-dismiss'
import type { PublicUser } from '@/server/db/users'

const ITEMS = [
  { href: '/orders', label: 'My orders' },
  { href: '/wishlist', label: 'Wishlist' },
  { href: '/addresses', label: 'Saved addresses' },
]

export function UserMenu({ user }: { user: PublicUser | null }) {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  useDismiss(ref, open, () => setOpen(false))

  async function logout() {
    setBusy(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setOpen(false)
      router.push('/')
      router.refresh()
      setBusy(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="hidden h-10 items-center rounded-full px-4 text-sm font-medium hover:bg-surface sm:inline-flex">Log in</Link>
        <Link href="/register" className="hidden h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 sm:inline-flex">Sign up</Link>
        {/* One compact button on phones; Sign up is one tap away on the login page. */}
        <Link href="/login" className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 sm:hidden">Log in</Link>
      </div>
    )
  }

  const items = user.isAdmin ? [...ITEMS, { href: '/admin/orders', label: 'Manage orders' }, { href: '/admin/products', label: 'Manage products' }, { href: '/admin/discounts', label: 'Discount codes' }] : ITEMS
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu"
        className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90">
        {(user.fullName.trim()[0] ?? '?').toUpperCase()}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-40 w-60 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <ul className="py-1 text-sm">
            {items.map((i) => (
              <li key={i.href}>
                <Link role="menuitem" href={i.href} onClick={() => setOpen(false)} className="block px-4 py-2 hover:bg-background">{i.label}</Link>
              </li>
            ))}
          </ul>
          <button type="button" role="menuitem" onClick={logout} disabled={busy} className="w-full border-t border-border px-4 py-3 text-left text-sm hover:bg-background disabled:opacity-60">
            {busy ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  )
}
