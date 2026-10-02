'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AuthShell } from '@/components/auth/auth-shell'
import { forgotPasswordSchema, newPasswordField } from '@/lib/validation'
import { Field } from '@/views/login-view'

const primary = 'w-full rounded-md bg-primary px-4 py-2.5 text-center font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60'

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; message: string; code?: string }> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    return { ok: res.ok, message: json.details?.[0]?.message ?? json.message ?? 'Something went wrong. Try again.', code: json.code }
  } catch {
    return { ok: false, message: 'Could not reach the server. Try again.' }
  }
}

export function ForgotPasswordView() {
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)))
    if (!parsed.success) return setError(parsed.error.issues[0].message)
    setError('')
    setBusy(true)
    const r = await postJson('/api/auth/forgot-password', parsed.data)
    setBusy(false)
    if (r.ok) setDone(r.message)
    else setError(r.message)
  }

  if (done) {
    return (
      <AuthShell title="Check your email">
        <p className="text-center text-muted-foreground">{done}</p>
        <p className="text-center text-sm text-muted-foreground">The link works once and lasts 30 minutes. Nothing there? Look in spam.</p>
        <Link href="/login" className={`${primary} block`}>Back to log in</Link>
      </AuthShell>
    )
  }
  return (
    <AuthShell title="Forgot your password?">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">Enter your email and we’ll send you a link to choose a new one. This also works if you signed up with Google and want to add a password.</p>
        <Field name="email" label="Email" type="email" autoComplete="email" />
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button type="submit" disabled={busy} className={primary}>{busy ? 'Sending…' : 'Send me a link'}</button>
      </form>
      <p className="text-center text-sm text-muted-foreground"><Link href="/login" className="text-primary underline">Back to log in</Link></p>
    </AuthShell>
  )
}

export function ResetPasswordView({ token }: { token: string }) {
  const [error, setError] = useState('')
  const [broken, setBroken] = useState(!token)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const password = String(f.get('password') ?? '')
    const check = newPasswordField.safeParse(password)
    if (!check.success) return setError(check.error.issues[0].message)
    if (password !== String(f.get('confirm') ?? '')) return setError('The two passwords don’t match')
    setError('')
    setBusy(true)
    const r = await postJson('/api/auth/reset-password', { token, newPassword: password })
    setBusy(false)
    if (r.ok) setDone(true)
    else if (r.code === 'invalid_token') setBroken(true)
    else setError(r.message)
  }

  if (done) {
    return (
      <AuthShell title="Password changed">
        <p className="text-center text-muted-foreground">You’ve been signed out everywhere for safety. Log in with your new password.</p>
        <Link href="/login" className={`${primary} block`}>Log in</Link>
      </AuthShell>
    )
  }
  if (broken) {
    return (
      <AuthShell title="This link didn’t work">
        <p className="text-center text-muted-foreground">It may have expired or already been used. Reset links last 30 minutes and work once.</p>
        <Link href="/forgot-password" className={`${primary} block`}>Send me a new link</Link>
      </AuthShell>
    )
  }
  return (
    <AuthShell title="Choose a new password">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field name="password" label="New password (8 to 72 characters)" type="password" autoComplete="new-password" />
        <Field name="confirm" label="Confirm new password" type="password" autoComplete="new-password" />
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button type="submit" disabled={busy} className={primary}>{busy ? 'Saving…' : 'Change password'}</button>
      </form>
    </AuthShell>
  )
}

/** One button, not "confirm on load": mail scanners and link previews open links before the person does. */
export function VerifyEmailView({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'broken'>(token ? 'idle' : 'broken')
  async function confirm() {
    setState('busy')
    const r = await postJson('/api/auth/verify-email', { token })
    setState(r.ok ? 'done' : 'broken')
  }
  if (state === 'done') {
    return (
      <AuthShell title="Email confirmed">
        <p className="text-center text-muted-foreground">Thanks! Your email address is confirmed.</p>
        <Link href="/" className={`${primary} block`}>Continue shopping</Link>
      </AuthShell>
    )
  }
  if (state === 'broken') {
    return (
      <AuthShell title="This link didn’t work">
        <p className="text-center text-muted-foreground">It may have expired or already been used. Log in and press “Resend” on the banner to get a new one.</p>
        <Link href="/login" className={`${primary} block`}>Log in</Link>
      </AuthShell>
    )
  }
  return (
    <AuthShell title="Confirm your email">
      <p className="text-center text-muted-foreground">One tap and your email address is confirmed.</p>
      <button type="button" onClick={confirm} disabled={state === 'busy'} className={primary}>{state === 'busy' ? 'Confirming…' : 'Confirm my email'}</button>
    </AuthShell>
  )
}
