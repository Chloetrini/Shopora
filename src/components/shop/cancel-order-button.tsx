'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useDismiss } from '@/hooks/use-dismiss'

/** Only shown for an unpaid order. Asks for confirmation in place (no browser confirm box). */
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useDismiss(ref, asking, () => setAsking(false))

  async function cancel() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' })
      const json = await res.json()
      if (res.ok) return router.refresh()
      setError(json.message ?? 'Could not cancel.')
    } catch {
      setError('Could not reach the server.')
    }
    setBusy(false)
  }

  return (
    <div ref={ref} className="mt-3">
      {!asking ? (
        <button type="button" onClick={() => setAsking(true)} className="text-sm text-muted-foreground underline">Cancel this order</button>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3 text-sm">
          <span>Cancel this unpaid order?</span>
          <button type="button" onClick={() => setAsking(false)} className="underline">Keep it</button>
          <button type="button" onClick={cancel} disabled={busy} className="rounded-full bg-ink px-4 py-1.5 font-medium text-ink-foreground disabled:opacity-60">{busy ? 'Cancelling…' : 'Yes, cancel'}</button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
