'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCart } from '@/hooks/use-cart'
import { cartTotalCents } from '@/lib/cart'
import { formatMoney } from '@/lib/money'
import { deliveryFee, normalizeLocation, pickZone, titleCase, type Zone } from '@/lib/delivery'
import { computeDiscount, describeRule, type DiscountRule } from '@/lib/discount'
import { orderSchema } from '@/lib/validation'
import type { Address } from '@/server/db/features'

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

export function CheckoutView({ testMode, defaults, addresses = [], zones = [] }: { testMode: boolean; defaults: { email: string; fullName: string } | null; addresses?: Address[]; zones?: Zone[] }) {
  const router = useRouter()
  const { cart, clear } = useCart()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState<(DiscountRule & { code: string }) | null>(null)
  const [codeMsg, setCodeMsg] = useState('')
  const [checkingCode, setCheckingCode] = useState(false)
  const [addrKey, setAddrKey] = useState(() => addresses.find((a) => a.isDefault)?.id ?? 'new')
  // What the buyer has typed for where to deliver; null means "use the selected saved address".
  const [typedLoc, setTypedLoc] = useState<{ country: string; region: string } | null>(null)
  const savedAddr = addresses.find((a) => a.id === addrKey)
  const loc = typedLoc ?? { country: savedAddr?.country ?? '', region: savedAddr?.region ?? '' }
  const zone = loc.country.trim() ? pickZone(zones, loc.country, loc.region) : null
  const knownCountries = [...new Set(zones.filter((z) => z.country !== '*').map((z) => titleCase(z.country)))]
  const knownRegions = [...new Set(zones.filter((z) => z.region && z.country === normalizeLocation(loc.country)).map((z) => titleCase(z.region!)))]

  if (cart.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <p className="mt-4 text-muted-foreground">Your cart is empty.</p>
        <Link href="/" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Browse products</Link>
      </div>
    )
  }

  async function applyCode() {
    setCheckingCode(true)
    setCodeMsg('')
    try {
      const res = await fetch('/api/discounts/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
      const json = await res.json()
      if (res.ok) {
        setApplied({ code: json.body.code, percentOff: json.body.percentOff, amountOffCents: json.body.amountOffCents })
        setCodeMsg('')
      } else {
        setApplied(null)
        setCodeMsg(json.message ?? 'That code isn’t valid.')
      }
    } catch {
      setCodeMsg('Could not check the code. Try again.')
    }
    setCheckingCode(false)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError('')
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    const parsed = orderSchema.safeParse({
      ...data,
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      discountCode: applied?.code,
      saveAddress: data.saveAddress === 'on',
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
        if (json.body.paymentUrl) window.location.href = json.body.paymentUrl
        else router.push(`/orders/${json.body.id}`)
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
      <form onSubmit={onSubmit} onInput={(e) => { const f = e.currentTarget; setTypedLoc({ country: (f.elements.namedItem('country') as HTMLInputElement)?.value ?? '', region: (f.elements.namedItem('region') as HTMLInputElement)?.value ?? '' }) }} noValidate className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        {testMode && <p className="rounded-md border border-border bg-surface p-3 text-sm">Test mode: you will pay with a Paystack test card. No real money moves.</p>}
        {addresses.length > 0 && (
          <div>
            <label htmlFor="saved-address" className="block text-sm font-medium">Deliver to</label>
            <select id="saved-address" value={addrKey} onChange={(e) => { setAddrKey(e.target.value); setTypedLoc(null) }} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2">
              {addresses.map((a) => <option key={a.id} value={a.id}>{a.label || a.fullName}: {a.addressLine1}, {a.city}</option>)}
              <option value="new">A new address</option>
            </select>
          </div>
        )}
        <datalist id="countries">{knownCountries.map((c) => <option key={c} value={c} />)}</datalist>
        <datalist id="regions">{knownRegions.map((r) => <option key={r} value={r} />)}</datalist>
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label htmlFor={f.name} className="block text-sm font-medium">{f.label}</label>
            <input
              id={f.name}
              name={f.name}
              type={'type' in f ? f.type : 'text'}
              autoComplete={f.autoComplete}
              list={f.name === 'country' ? 'countries' : f.name === 'region' ? 'regions' : undefined}
              key={`${f.name}-${addrKey}`}
              defaultValue={fieldDefault(f.name, addrKey, addresses, defaults)}
              aria-invalid={!!errors[f.name]}
              aria-describedby={errors[f.name] ? `${f.name}-error` : undefined}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
            />
            {errors[f.name] && <p id={`${f.name}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">{errors[f.name]}</p>}
          </div>
        ))}
 {defaults && addrKey === 'new' && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="saveAddress" /> Save this address for next time</label>
        )}
        {formError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
        <button type="submit" disabled={busy} className="rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? 'Placing order…' : 'Place order and pay'}
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
        {(() => {
          const subtotal = cartTotalCents(cart)
          const discount = applied ? computeDiscount(subtotal, applied) : 0
          const fee = zone ? deliveryFee(zone, subtotal - discount) : null
          return (
            <>
              <div className="mt-3 border-t border-border pt-3">
                <label htmlFor="discount" className="block text-sm font-medium">Discount code</label>
                <div className="mt-1 flex gap-2">
                  <input id="discount" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={20} autoComplete="off" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  <button type="button" onClick={applyCode} disabled={checkingCode || code.trim().length < 3} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-ink-foreground disabled:opacity-60">{checkingCode ? '…' : 'Apply'}</button>
                </div>
                {codeMsg && <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{codeMsg}</p>}
                {applied && (
                  <p role="status" className="mt-1 flex items-center justify-between text-sm text-primary">
                    <span>{applied.code}: {describeRule(applied, (c) => formatMoney(c, currency))}</span>
                    <button type="button" onClick={() => { setApplied(null); setCode('') }} className="underline">Remove</button>
                  </p>
                )}
              </div>
              {discount > 0 && <p className="mt-3 flex justify-between text-sm"><span>Discount</span><span>-{formatMoney(discount, currency)}</span></p>}
              <p className="mt-3 flex justify-between text-sm">
                <span>Delivery{zone ? ` (${zone.name})` : ''}</span>
                <span>{fee === null ? (loc.country.trim() ? 'Not available' : 'Enter your address') : fee === 0 ? 'Free' : formatMoney(fee, currency)}</span>
              </p>
              {zone && fee !== null && fee > 0 && zone.freeOverCents != null && (
                <p className="mt-1 text-xs text-muted-foreground">Free delivery over {formatMoney(zone.freeOverCents, currency)}.</p>
              )}
              {loc.country.trim() && !zone && <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">Sorry, we don’t deliver to that location yet.</p>}
              <p className="mt-3 flex justify-between border-t border-border pt-3 font-semibold">
                <span>Total</span>
                <span>{formatMoney(subtotal - discount + (fee ?? 0), currency)}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">The final price is confirmed when you place the order.</p>
            </>
          )
        })()}
      </aside>
    </div>
  )
}

function fieldDefault(name: string, addrKey: string, addresses: Address[], defaults: { email: string; fullName: string } | null): string | undefined {
  const a = addresses.find((x) => x.id === addrKey)
  if (name === 'email') return defaults?.email
  if (a) return (a as unknown as Record<string, string>)[name]
  return name === 'fullName' ? defaults?.fullName : undefined
}
