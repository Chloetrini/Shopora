export type User = { id: string; email: string; fullName: string; isAdmin?: boolean; emailVerified?: boolean
  phone?: string | null; avatarUrl?: string | null; hasPassword?: boolean; googleLinked?: boolean }

export type Product = {
  id: string; slug: string; name: string; description: string
  priceCents: number; currency: string; imageUrl: string | null; category: string; stock: number
}

export type CartItem = {
  productId: string; name: string; priceCents: number; currency: string; quantity: number
  slug?: string; imageUrl?: string | null; stock?: number
}

export type OrderSummary = { id: string; status: string; totalCents: number; currency: string; createdAt: string; itemCount: number }

export type OrderView = {
  id: string; email: string; fullName: string; status: string
  totalCents: number; subtotalCents: number; discountCode: string | null; discountCents: number
  deliveryCents: number; deliveryZone: string | null; currency: string; createdAt: string; address: string
  items: { name: string; unitPriceCents: number; quantity: number }[]
  events: { status: string; note: string | null; createdAt: string }[]
}

export type Address = {
  id: string; label: string; fullName: string; addressLine1: string; addressLine2: string
  city: string; region: string; postalCode: string; country: string; isDefault: boolean
}

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting payment', confirmed: 'Payment received', processing: 'Preparing your order',
  shipped: 'Shipped', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled',
}
export const isPaid = (status: string) => status !== 'pending' && status !== 'cancelled'

/** The journey shown when tracking an order, in order (same steps and wording as the website). "confirmed" = payment received. */
export const TRACK_STEPS: { status: string; label: string; hint: string }[] = [
  { status: 'confirmed', label: 'Payment received', hint: 'We have your payment.' },
  { status: 'processing', label: 'Preparing your order', hint: 'We are packing your items.' },
  { status: 'shipped', label: 'Shipped', hint: 'Your order has left us.' },
  { status: 'out_for_delivery', label: 'Out for delivery', hint: 'It is on its way to you today.' },
  { status: 'delivered', label: 'Delivered', hint: 'Enjoy!' },
]

export type AdminOrder = {
  id: string; email: string; fullName: string; status: string; totalCents: number; currency: string
  createdAt: string; itemCount: number; refundNeeded: boolean; next: string[]
}
export type AdminProduct = Product & { active: boolean; hasUploadedImage: boolean }
export type DiscountRow = {
  code: string; percentOff: number | null; amountOffCents: number | null; active: boolean
  expiresAt: string | null; maxUses: number | null; usedCount: number
}
