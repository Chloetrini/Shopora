'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { addItem, parseCart, removeItem, setQuantity, type CartItem } from '@/lib/cart'

const KEY = 'shopora-cart'
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

export function useCart() {
  const cart = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
  return {
    cart,
    add: useCallback((item: Omit<CartItem, 'quantity'>) => write(addItem(getSnapshot(), item)), []),
    setQty: useCallback((id: string, q: number) => write(setQuantity(getSnapshot(), id, q)), []),
    remove: useCallback((id: string) => write(removeItem(getSnapshot(), id)), []),
    clear: useCallback(() => write([]), []),
  }
}
