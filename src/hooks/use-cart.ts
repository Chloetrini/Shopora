'use client'

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { addItem, parseCart, removeItem, setQuantity, type CartItem } from '@/lib/cart'

/*
 * Two carts behind one hook.
 *  - Signed in: the cart lives on the server (the phone app reads the same one). We update the screen at once,
 *    send the change, and replace our copy with whatever the server answers. A light poll plus a refresh whenever
 *    the tab comes back keeps a change made on the other device showing up within a couple of seconds.
 *  - Guest: the cart lives in localStorage, as before. It is folded into the account cart when the person signs in.
 */

const KEY = 'shopora-cart'
const POLL_MS = 2000
const EMPTY: CartItem[] = []
const listeners = new Set<() => void>()

// getSnapshot must return the same reference until the data changes.
let lastRaw: string | null | undefined
let lastCart: CartItem[] = EMPTY

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function getSnapshot(): CartItem[] {
  const raw = readRaw()
  if (raw !== lastRaw) {
    lastRaw = raw
    lastCart = parseCart(raw)
  }
  return lastCart
}

function write(next: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage blocked: the cart just won't persist */
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  window.addEventListener('storage', cb) // other tabs
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', cb)
  }
}

type CartApi = {
  cart: CartItem[]
  add: (item: Omit<CartItem, 'quantity'>) => void
  setQty: (id: string, q: number) => void
  remove: (id: string) => void
  clear: () => void
}

const CartContext = createContext<CartApi | null>(null)

// Bookkeeping that never affects rendering: how many changes are on the wire, and their order.
// Module level on purpose: there is one cart provider per page.
const wire = { inFlight: 0, queue: Promise.resolve() }

const sameCart = (a: CartItem[], b: CartItem[]) => JSON.stringify(a) === JSON.stringify(b)

export function CartProvider({ signedIn, initialItems, children }: { signedIn: boolean; initialItems: CartItem[]; children: ReactNode }) {
  const guestCart = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
  const [serverCart, setServerCart] = useState<CartItem[]>(initialItems)

  const apply = useCallback((next: CartItem[]) => setServerCart((prev) => (sameCart(prev, next) ? prev : next)), [])

  const refresh = useCallback(async () => {
    if (wire.inFlight > 0) return // our own change is on its way; its answer is fresher
    try {
      const res = await fetch('/api/cart', { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      if (wire.inFlight === 0 && Array.isArray(json.body?.items)) apply(json.body.items)
    } catch {
      /* offline: keep what we show */
    }
  }, [apply])

  // One change at a time, in order, so quick taps can't arrive reordered.
  const send = useCallback(
    (method: string, path: string, body?: unknown) => {
      wire.inFlight++
      wire.queue = wire.queue.then(async () => {
        try {
          const res = await fetch(path, {
            method,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
          })
          const json = await res.json().catch(() => null)
          if (Array.isArray(json?.body?.items)) apply(json.body.items)
          else if (!res.ok) {
            wire.inFlight-- // let refresh() run: roll the screen back to the server's truth
            await refresh()
            wire.inFlight++
          }
        } catch {
          /* the next poll puts things right */
        } finally {
          wire.inFlight--
        }
      })
    },
    [apply, refresh],
  )

  // Signed in: fold in a guest cart once, then keep polling while the page is visible.
  useEffect(() => {
    if (!signedIn) return
    let cancelled = false
    ;(async () => {
      const guest = getSnapshot()
      if (guest.length > 0) {
        try {
          const res = await fetch('/api/cart', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: guest.map((i) => ({ productId: i.productId, quantity: i.quantity })) }),
          })
          const json = await res.json().catch(() => null)
          if (res.ok && Array.isArray(json?.body?.items) && !cancelled) {
            write([])
            apply(json.body.items)
            return
          }
        } catch {
          /* keep the guest cart and try again next time */
        }
      }
      if (!cancelled) await refresh()
    })()
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const id = setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [signedIn, apply, refresh])

  const api = useMemo<CartApi>(
    () => ({
      cart: signedIn ? serverCart : guestCart,
      add: (item) => {
        if (!signedIn) return write(addItem(getSnapshot(), item))
        setServerCart((c) => addItem(c, item))
        send('POST', '/api/cart', { productId: item.productId, quantity: 1 })
      },
      setQty: (id, q) => {
        if (!signedIn) return write(setQuantity(getSnapshot(), id, q))
        setServerCart((c) => setQuantity(c, id, q))
        send('PATCH', `/api/cart/${id}`, { quantity: Math.min(10, Math.max(0, Math.floor(q))) })
      },
      remove: (id) => {
        if (!signedIn) return write(removeItem(getSnapshot(), id))
        setServerCart((c) => removeItem(c, id))
        send('DELETE', `/api/cart/${id}`)
      },
      clear: () => {
        if (!signedIn) return write([])
        setServerCart([])
        send('DELETE', '/api/cart')
      },
    }),
    [signedIn, serverCart, guestCart, send],
  )

  return createElement(CartContext.Provider, { value: api }, children)
}

export function useCart(): CartApi {
  const api = useContext(CartContext)
  if (!api) throw new Error('useCart must be used inside <CartProvider>')
  return api
}
