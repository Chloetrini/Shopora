'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCart } from '@/hooks/use-cart'
import { cartTotalCents } from '@/lib/cart'
import { formatMoney } from '@/lib/money'
import { orderSchema } from '@/lib/validation'

const FIELDS = [
  { name: 'fullName', label: 'Full name', autoComplete: 'name' },
  { name: 'email', label: 'Email', autoComplete: 'email', type: 'email' },
  { name: 'addressLine1', label: 'Address', autoComplete: 'address-line1' },
  { name: 'addressLine2', label: 'Apartment, suite (optional)', autoComplete: 'address-line2' },
  { name: 'city', label: 'City', autoComplete: 'address-level2' },
  { name: 'region', label: 'State or region (optional)', autoComplete: 'address-level1' },
  { name: 'postalCode', label: 'Postal code', autoComplete: 'postal-code' },
  { name: 'country', label: 'Country', autoComplete: 'country-name' },
] as const

export function CheckoutView() {
  const router = useRouter()
  const { cart, clear } = useCart()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  if (cart.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <p className="mt-4 text-muted-foreground">Your cart is empty.</p>
        <Link href="/" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Browse products</Link>
      </div>
    )
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError('')
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    const parsed = orderSchema.safeParse({
      ...data,
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message
      setErrors(next)
      return
    }
    setErrors({})
    setBusy(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      const json = await res.json()
      if (res.ok) {
        clear()
        router.push(`/orders/${json.body.id}`)
        return
      }
      if (Array.isArray(json.details)) {
        setErrors(Object.fromEntries(json.details.map((d: { path: string; message: string }) => [d.path, d.message])))
      }
      setFormError(json.message ?? 'Something went wrong. Try again.')
    } catch {
      setFormError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const currency = cart[0].currency
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label htmlFor={f.name} className="block text-sm font-medium">{f.label}</label>
            <input
              id={f.name}
              name={f.name}
              type={'type' in f ? f.type : 'text'}
              autoComplete={f.autoComplete}
              aria-invalid={!!errors[f.name]}
              aria-describedby={errors[f.name] ? `${f.name}-error` : undefined}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
            />
            {errors[f.name] && <p id={`${f.name}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">{errors[f.name]}</p>}
          </div>
        ))}
        {formError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
        <button type="submit" disabled={busy} className="rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? 'Placing order…' : 'Place order'}
        </button>
      </form>
      <aside className="h-fit rounded-lg border border-border bg-surface p-4">
        <h2 className="font-semibold">Order summary</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {cart.map((i) => (
            <li key={i.productId} className="flex justify-between gap-2">
              <span>{i.quantity} × {i.name}</span>
              <span>{formatMoney(i.priceCents * i.quantity, i.currency)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t border-border pt-3 font-semibold">
          <span>Total</span>
          <span>{formatMoney(cartTotalCents(cart), currency)}</span>
        </p>
      </aside>
    </div>
  )
}
