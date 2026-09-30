'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AuthShell, OrDivider } from '@/components/auth/auth-shell'
import { GoogleButton } from '@/components/auth/google-button'
import { loginSchema } from '@/lib/validation'

const GOOGLE_ERRORS: Record<string, string> = {
  google_failed: 'Google sign-in didn’t work. Try again, or use your email and password.',
  google_cancelled: 'Google sign-in was cancelled.',
  google_unverified: 'Google says that email address isn’t verified, so we can’t use it.',
  google_unavailable: 'Google sign-in isn’t set up on this site.',
  too_many_attempts: 'Too many attempts. Try again in a few minutes.',
}

export function LoginView({ next, error, googleEnabled }: { next: string; error?: string; googleEnabled: boolean }) {
  const router = useRouter()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState(error ? (GOOGLE_ERRORS[error] ?? GOOGLE_ERRORS.google_failed) : '')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError('')
    const parsed = loginSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)))
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message
      return setErrors(next)
    }
    setErrors({})
    setBusy(true)
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) })
      const json = await res.json()
      if (res.ok) {
        router.push(next)
        router.refresh()
        return
      }
      setFormError(json.message ?? 'Could not log in. Try again.')
    } catch {
      setFormError('Could not reach the server. Try again.')
    }
    setBusy(false)
  }

  return (
    <AuthShell title="Log in">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} />
        <Field name="password" label="Password" type="password" autoComplete="current-password" error={errors.password} />
        {formError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      {googleEnabled && (
        <>
          <OrDivider />
          <GoogleButton next={next} label="Continue with Google" />
        </>
      )}
      <p className="text-center text-sm text-muted-foreground">
        New here? <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-primary underline">Create an account</Link>
      </p>
    </AuthShell>
  )
}

export function Field({ name, label, type = 'text', autoComplete, error, defaultValue }: {
  name: string; label: string; type?: string; autoComplete?: string; error?: string; defaultValue?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">{label}</label>
      <input
        id={name} name={name} type={type} autoComplete={autoComplete} defaultValue={defaultValue}
        aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
      />
      {error && <p id={`${name}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
