'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function TrackView() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      })
      const json = await res.json()
      if (res.ok) return router.push(`/orders/${json.body.id}`)
      setError(json.details?.[0]?.message ?? json.message ?? 'Something went wrong. Try again.')
    } catch {
      setError('Could not reach the server. Try again.')
    }
    setBusy(false)
  }

  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-surface p-6">
      <h1 className="font-display text-3xl font-semibold">Track an order</h1>
      <p className="mt-2 text-sm text-muted-foreground">No account needed. Use the email you ordered with and the order number from your confirmation email (the first 8 characters are enough).</p>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
        </div>
        <div>
          <label htmlFor="reference" className="block text-sm font-medium">Order number</label>
          <input id="reference" name="reference" required minLength={8} placeholder="e.g. 4f0ecb8e" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
        </div>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? 'Looking…' : 'Track order'}
        </button>
      </form>
    </div>
  )
}
