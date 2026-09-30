'use client'

import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** A heart. Signed out, it sends you to log in and brings you back. The change shows at once and rolls back on error. */
export function WishlistButton({ productId, initial, signedIn, className = '' }: { productId: string; initial: boolean; signedIn: boolean; className?: string }) {
  const router = useRouter()
  const [wished, setWished] = useState(initial)
  const [busy, setBusy] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault() // the heart sits on top of a link to the product
    e.stopPropagation()
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
    if (busy) return
    const next = !wished
    setWished(next)
    setBusy(true)
    try {
      const res = await fetch(`/api/wishlist/${productId}`, { method: next ? 'PUT' : 'DELETE' })
      if (!res.ok) setWished(!next)
      else router.refresh()
    } catch {
      setWished(!next)
    }
    setBusy(false)
  }

  return (
    <button type="button" onClick={toggle} aria-pressed={wished} aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
      className={`inline-flex size-9 items-center justify-center rounded-full bg-background/90 shadow hover:scale-105 ${className}`}>
      <Heart className={`size-[18px] ${wished ? 'fill-primary text-primary' : ''}`} aria-hidden />
    </button>
  )
}
