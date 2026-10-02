'use client'

import { useState } from 'react'

/** Shown to a signed-in person whose email isn't confirmed. It never blocks anything. */
export function VerifyBanner({ email }: { email: string }) {
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
    <div role="status" className="bg-primary-soft px-4 py-2 text-center text-sm">
      {state === 'sent' ? (
        <>We’ve sent a new link to <strong>{email}</strong>. Check your inbox (and spam).</>
      ) : (
        <>
          Please confirm your email <strong>{email}</strong>.{' '}
          <button type="button" onClick={resend} disabled={state === 'busy'} className="font-medium text-primary underline disabled:opacity-60">
            {state === 'busy' ? 'Sending…' : 'Resend the link'}
          </button>
          {state === 'error' && <span className="ml-2 text-red-600 dark:text-red-400">Couldn’t send it. Try again soon.</span>}
        </>
      )}
    </div>
  )
}
