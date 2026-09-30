'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ResendMissingButton({ count }: { count: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function go() {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/orders/resend-missing', { method: 'POST' })
      const json = await res.json()
      setMsg({ ok: res.ok, text: json.message ?? 'No answer' })
      if (res.ok) router.refresh()
    } catch {
      setMsg({ ok: false, text: 'Could not reach the server.' })
    }
    setBusy(false)
  }

  return (
    <div className="mb-5 rounded-2xl border border-border bg-primary-soft p-4">
      <p className="font-medium">{count} paid {count === 1 ? 'order has' : 'orders have'} no confirmation email</p>
      <p className="mt-1 text-sm text-muted-foreground">Press the button to send them now. If any fail, the reason from the email provider is shown here.</p>
      <button type="button" onClick={go} disabled={busy} className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{busy ? 'Sending…' : 'Send the missing emails'}</button>
      {msg && <p role="status" className={`mt-2 text-sm ${msg.ok ? 'text-primary' : 'text-red-600 dark:text-red-400'}`}>{msg.text}</p>}
    </div>
  )
}
