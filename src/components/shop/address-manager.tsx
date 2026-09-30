'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { addressSchema } from '@/lib/validation'
import type { Address } from '@/server/db/features'

const FIELDS = [
  { name: 'label', label: 'Name this address (optional)', autoComplete: 'off' },
  { name: 'fullName', label: 'Full name', autoComplete: 'name' },
  { name: 'addressLine1', label: 'Address', autoComplete: 'address-line1' },
  { name: 'addressLine2', label: 'Apartment, suite (optional)', autoComplete: 'address-line2' },
  { name: 'city', label: 'City', autoComplete: 'address-level2' },
  { name: 'region', label: 'State or region (optional)', autoComplete: 'address-level1' },
  { name: 'postalCode', label: 'Postal code', autoComplete: 'postal-code' },
  { name: 'country', label: 'Country', autoComplete: 'country-name' },
] as const

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const router = useRouter()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true)
    setFormError('')
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      const json = await res.json()
      if (!res.ok) {
        setFormError(json.message ?? 'Something went wrong.')
        if (Array.isArray(json.details)) setErrors(Object.fromEntries(json.details.map((d: { path: string; message: string }) => [d.path, d.message])))
        return false
      }
      router.refresh()
      return true
    } catch {
      setFormError('Could not reach the server. Try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>
    const parsed = addressSchema.safeParse({ ...data, isDefault: data.isDefault === 'on' })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message
      return setErrors(next)
    }
    setErrors({})
    if (await call('/api/addresses', 'POST', parsed.data)) form.reset()
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        {addresses.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-6 text-muted-foreground">No saved addresses yet. Add one and checkout will fill it in for you.</p>
        ) : (
          <ul className="space-y-3">
            {addresses.map((a) => (
              <li key={a.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{a.label || a.fullName}</p>
                  {a.isDefault && <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium">Default</span>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {a.fullName}, {[a.addressLine1, a.addressLine2, a.city, a.region, a.postalCode, a.country].filter(Boolean).join(', ')}
                </p>
                <div className="mt-3 flex gap-3 text-sm">
                  {!a.isDefault && <button type="button" disabled={busy} onClick={() => call(`/api/addresses/${a.id}/default`, 'POST')} className="text-primary underline">Make default</button>}
                  <button type="button" disabled={busy} onClick={() => call(`/api/addresses/${a.id}`, 'DELETE')} className="text-muted-foreground underline">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {formError && addresses.length > 0 && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{formError}</p>}
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Add an address</h2>
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label htmlFor={`addr-${f.name}`} className="block text-sm font-medium">{f.label}</label>
            <input id={`addr-${f.name}`} name={f.name} autoComplete={f.autoComplete} aria-invalid={!!errors[f.name]} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
            {errors[f.name] && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors[f.name]}</p>}
          </div>
        ))}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDefault" /> Make this my default address</label>
        {formError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
        <button type="submit" disabled={busy} className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">{busy ? 'Saving…' : 'Save address'}</button>
      </form>
    </div>
  )
}
