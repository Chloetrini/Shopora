'use client'

import { useState } from 'react'

/** "Welcome to Shopora, <name>!" once, right after a sign-up. The cookie that triggers it lasts 2 minutes and is cleared on dismiss. */
export function WelcomeBanner({ name }: { name: string }) {
  const [open, setOpen] = useState(true)
  if (!open) return null
  function close() {
    document.cookie = 'shopora_welcome=; Max-Age=0; path=/'
    setOpen(false)
  }
  return (
    <div role="status" className="flex items-center justify-center gap-3 bg-primary px-4 py-2 text-sm text-primary-foreground">
      <span>Welcome to Shopora, <strong>{name}</strong>! We’re glad you’re here.</span>
      <button type="button" onClick={close} className="rounded-full border border-primary-foreground/40 px-3 py-0.5 text-xs hover:bg-primary-foreground/10">Dismiss</button>
    </div>
  )
}
