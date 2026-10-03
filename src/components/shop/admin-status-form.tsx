'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { canTransition, isPaidStatus, STATUS_LABEL, type OrderStatus } from '@/lib/order-status'

const TARGETS: OrderStatus[] = ['processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']

export function AdminStatusForm({ id, status }: { id: string; status: OrderStatus }) {
  const router = useRouter()
  const options = TARGETS.filter((t) => canTransition(status, t))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mail, setMail] = useState<{ ok: boolean; text: string } | null>(null)
  async function resend() {
    setMail(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/orders/${id}/resend`, { method: 'POST' })
      const json = await res.json()
      setMail({ ok: res.ok, text: json.message ?? 'No answer' })
    } catch {
      setMail({ ok: false, text: 'Could not reach the server.' })
    }
    setBusy(false)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: data.get('status'), note: String(data.get('note') ?? '') || undefined }),
      })
      const json = await res.json()
      if (res.ok) return router.refresh()
      setError(json.message ?? 'Could not update.')
    } catch {
      setError('Could not reach the server.')
    }
    setBusy(false)
  }

  const mailButton = isPaidStatus(status) && (
    <div className="mt-2">
      <button type="button" onClick={resend} disabled={busy} className="rounded-md border border-border px-4 py-1.5 text-sm hover:border-primary disabled:opacity-60">Send confirmation email</button>
      {mail && <p role="status" className={`mt-1 text-sm ${mail.ok ? '' : 'text-red-600 dark:text-red-400'}`}>{mail.text}</p>}
    </div>
  )
  if (options.length === 0) {
    return (
      <div>
        <span className="text-sm text-muted-foreground">{status === 'pending' ? 'Waiting for payment' : 'No further steps'}</span>
        {mailButton}
      </div>
    )
  }

  return (
    <div>
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`s-${id}`}>New status</label>
      <select id={`s-${id}`} name="status" className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
        {options.map((o) => <option key={o} value={o}>{STATUS_LABEL[o]}</option>)}
      </select>
      <label className="sr-only" htmlFor={`n-${id}`}>Note for the buyer (optional)</label>
      <input id={`n-${id}`} name="note" maxLength={300} placeholder="Note, e.g. courier and tracking number" className="min-w-48 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
      <button type="submit" disabled={busy} className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60">{busy ? 'Saving…' : 'Update'}</button>
      {error && <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
    {mailButton}
    </div>
  )
}
