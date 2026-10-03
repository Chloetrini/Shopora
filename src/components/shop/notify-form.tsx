'use client'

import { useState } from 'react'

export function NotifyForm({ slug, defaultEmail }: { slug: string; defaultEmail?: string }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(`/api/products/${slug}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: String(new FormData(e.currentTarget).get('email') ?? '') }),
      })
      const json = await res.json()
      setError(!res.ok)
      setMessage(res.ok ? json.message : (json.details?.[0]?.message ?? json.message))
    } catch {
      setError(true)
      setMessage('Could not reach the server. Try again.')
    }
    setBusy(false)
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-2">
      <label htmlFor="notify-email" className="text-sm font-medium">Email me when it’s back</label>
      <div className="flex gap-2">
        <input id="notify-email" name="email" type="email" required defaultValue={defaultEmail} autoComplete="email" className="min-w-0 flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm" />
        <button type="submit" disabled={busy} className="rounded-md bg-ink px-5 py-2 text-sm font-medium text-ink-foreground disabled:opacity-60">{busy ? '…' : 'Notify me'}</button>
      </div>
      {message && <p role="status" className={`text-sm ${error ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>{message}</p>}
    </form>
  )
}
