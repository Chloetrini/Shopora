import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { api } from './api'
import { useAuth } from './auth'
import { CART_POLL_MS } from './config'
import type { CartItem, Product } from './types'

/*
 * The cart lives on the server, tied to the account, so it is the same cart the website shows.
 * We show a change at once, send it, and replace our copy with the server's answer. While the app is open
 * we re-read the cart every couple of seconds (and when the app comes back to the front), so something added on
 * the website appears here almost immediately.
 */

type CartApi = {
  items: CartItem[]
  count: number
  totalCents: number
  add: (p: Pick<Product, 'id' | 'name' | 'priceCents' | 'currency'>) => void
  setQty: (productId: string, quantity: number) => void
  remove: (productId: string) => void
  refresh: () => Promise<void>
}

const CartContext = createContext<CartApi | null>(null)
const same = (a: CartItem[], b: CartItem[]) => JSON.stringify(a) === JSON.stringify(b)

// Changes on the wire and their order (one cart provider in the app).
const wire = { inFlight: 0, queue: Promise.resolve() }

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const signedIn = !!user
  // Keyed by the person, so a different login never shows the previous cart.
  const [state, setState] = useState<{ uid: string | null; items: CartItem[] }>({ uid: null, items: [] })
  const uid = user?.id ?? null
  const items = state.uid === uid ? state.items : []

  const apply = useCallback((next: CartItem[]) => setState((s) => (s.uid === uid && same(s.items, next) ? s : { uid, items: next })), [uid])

  const refresh = useCallback(async () => {
    if (!signedIn || wire.inFlight > 0) return
    try {
      const body = await api<{ items: CartItem[] }>('/api/cart')
      if (wire.inFlight === 0) apply(body.items)
    } catch {
      /* offline: keep what we show */
    }
  }, [signedIn, apply])

  const send = useCallback(
    (method: string, path: string, body?: unknown) => {
      wire.inFlight++
      wire.queue = wire.queue.then(async () => {
        try {
          apply((await api<{ items: CartItem[] }>(path, { method, body })).items)
        } catch {
          wire.inFlight--
          await refresh() // roll the screen back to the server's truth
          wire.inFlight++
        } finally {
          wire.inFlight--
        }
      })
    },
    [apply, refresh],
  )

  useEffect(() => {
    if (!signedIn) return
    void refresh()
    const tick = () => { if (AppState.currentState === 'active') void refresh() }
    const id = setInterval(tick, CART_POLL_MS)
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void refresh() })
    return () => { clearInterval(id); sub.remove() }
  }, [signedIn, refresh])

  const value = useMemo<CartApi>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      totalCents: items.reduce((n, i) => n + i.priceCents * i.quantity, 0),
      refresh,
      add: (p) => {
        setState((s) => {
          const cur = s.uid === uid ? s.items : []
          const has = cur.find((i) => i.productId === p.id)
          const next = has
            ? cur.map((i) => (i.productId === p.id ? { ...i, quantity: Math.min(10, i.quantity + 1) } : i))
            : [...cur, { productId: p.id, name: p.name, priceCents: p.priceCents, currency: p.currency, quantity: 1 }]
          return { uid, items: next }
        })
        send('POST', '/api/cart', { productId: p.id, quantity: 1 })
      },
      setQty: (id, q) => {
        const quantity = Math.min(10, Math.max(0, Math.floor(q)))
        setState((s) => ({ uid, items: (s.uid === uid ? s.items : []).flatMap((i) => (i.productId !== id ? [i] : quantity === 0 ? [] : [{ ...i, quantity }])) }))
        send('PATCH', `/api/cart/${id}`, { quantity })
      },
      remove: (id) => {
        setState((s) => ({ uid, items: (s.uid === uid ? s.items : []).filter((i) => i.productId !== id) }))
        send('DELETE', `/api/cart/${id}`)
      },
    }),
    [items, uid, send, refresh],
  )
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartApi {
  const v = useContext(CartContext)
  if (!v) throw new Error('useCart must be used inside <CartProvider>')
  return v
}
