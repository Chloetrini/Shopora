'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { PublicUser } from '@/server/db/users'

export function UserMenu({ user }: { user: PublicUser | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function logout() {
    setBusy(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/')
      router.refresh()
      setBusy(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link href="/login" className="hover:underline">Log in</Link>
        <Link href="/register" className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90">Sign up</Link>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/orders" className="hover:underline">My orders</Link>
      <span className="hidden max-w-32 truncate text-muted-foreground sm:inline" title={user.email}>{user.fullName}</span>
      <button type="button" onClick={logout} disabled={busy} className="rounded-md border border-border px-3 py-1.5 hover:bg-background disabled:opacity-60">
        Log out
      </button>
    </div>
  )
}
