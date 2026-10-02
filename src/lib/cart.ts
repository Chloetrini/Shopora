import { LIMITS } from '@/constants/shop'

/** A snapshot for display only. The server re-reads prices from the database at checkout. */
export type CartItem = {
  productId: string
  name: string
  priceCents: number
  currency: string
  quantity: number
  /** Only present on a server cart, for the phone app and the stock hint. */
  slug?: string
  imageUrl?: string | null
  stock?: number
}

const clampQty = (n: number) => Math.min(LIMITS.maxQuantityPerLine, Math.max(0, Math.floor(n)))

export function addItem(cart: CartItem[], item: Omit<CartItem, 'quantity'>, quantity = 1): CartItem[] {
  const existing = cart.find((i) => i.productId === item.productId)
  if (existing) return setQuantity(cart, item.productId, existing.quantity + quantity)
  if (cart.length >= LIMITS.maxCartLines) return cart
  return [...cart, { ...item, quantity: clampQty(quantity) }].filter((i) => i.quantity > 0)
}

/** A quantity of 0 removes the line. */
export function setQuantity(cart: CartItem[], productId: string, quantity: number): CartItem[] {
  const q = clampQty(quantity)
  return cart.flatMap((i) => (i.productId !== productId ? [i] : q === 0 ? [] : [{ ...i, quantity: q }]))
}

export const removeItem = (cart: CartItem[], productId: string) => setQuantity(cart, productId, 0)

export const cartCount = (cart: CartItem[]) => cart.reduce((n, i) => n + i.quantity, 0)

export const cartTotalCents = (cart: CartItem[]) => cart.reduce((n, i) => n + i.priceCents * i.quantity, 0)

/** Parse whatever is in localStorage; anything malformed becomes an empty cart. */
export function parseCart(raw: string | null): CartItem[] {
  if (!raw) return []
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data
      .filter(
        (i): i is CartItem =>
          !!i &&
          typeof i.productId === 'string' &&
          typeof i.name === 'string' &&
          Number.isInteger(i.priceCents) &&
          typeof i.currency === 'string' &&
          Number.isInteger(i.quantity) &&
          i.quantity > 0,
      )
      .slice(0, LIMITS.maxCartLines)
      .map((i) => ({ ...i, quantity: clampQty(i.quantity) }))
  } catch {
    return []
  }
}
