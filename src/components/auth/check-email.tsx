'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AuthShell } from '@/components/auth/auth-shell'

/** After sign-up, and when a login is refused because the email isn't confirmed yet. */
export function CheckEmail({ email, sent = true, title = 'Check your email' }: { email: string; sent?: boolean; title?: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')
  async function resend() {
    setState('busy')
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      setState(res.ok ? 'sent' : 'error')
    } catch {
      setState('error')
    }
  }
  return (
    <AuthShell title={title}>
      <p className="text-center text-muted-foreground">
        {sent ? <>We sent a link to <strong className="text-foreground">{email}</strong>. </> : <>We couldn’t send the email just now, so press resend. </>}
        Open it and tap <strong className="text-foreground">Confirm your email</strong>; that logs you in. You can’t log in before that.
      </p>
      <p className="text-center text-sm text-muted-foreground">Nothing there? Look in spam. The link works once and lasts 24 hours.</p>
      <button type="button" onClick={resend} disabled={state === 'busy' || state === 'sent'} className="w-full rounded-md border border-border px-4 py-2.5 font-medium hover:border-primary disabled:opacity-60">
        {state === 'busy' ? 'Sending…' : state === 'sent' ? 'Sent. Check your inbox' : 'Resend the email'}
      </button>
      {state === 'error' && <p role="alert" className="text-center text-sm text-red-600 dark:text-red-400">Couldn’t send it. Try again in a few minutes.</p>}
      <p className="text-center text-sm text-muted-foreground"><Link href="/login" className="text-primary underline">Back to log in</Link></p>
    </AuthShell>
  )
}
