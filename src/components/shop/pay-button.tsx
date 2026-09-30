'use client'

import { useState } from 'react'

export function PayButton({ orderId, label }: { orderId: string; label: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function pay() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        window.location.href = json.body.paymentUrl
        return
      }
      setError(json.message ?? 'Could not start the payment.')
    } catch {
      setError('Could not reach the server. Try again.')
    }
    setBusy(false)
  }
  return (
    <div className="mt-6">
      <button type="button" onClick={pay} disabled={busy} className="rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
        {busy ? 'Opening Paystack…' : label}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
