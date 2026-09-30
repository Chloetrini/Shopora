'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AuthShell, OrDivider } from '@/components/auth/auth-shell'
import { GoogleButton } from '@/components/auth/google-button'
import { registerSchema } from '@/lib/validation'
import { Field } from './login-view'

export function RegisterView({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const router = useRouter()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError('')
    // "Confirm password" is checked here only and never sent.
    const { confirmPassword, ...data } = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    const found: Record<string, string> = {}
    const parsed = registerSchema.safeParse(data)
    if (!parsed.success) for (const i of parsed.error.issues) found[String(i.path[0])] ??= i.message
    if (!found.password && confirmPassword !== data.password) found.confirmPassword = 'The passwords don’t match'
    if (Object.keys(found).length || !parsed.success) return setErrors(found)
    setErrors({})
    setBusy(true)
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) })
      const json = await res.json()
      if (res.ok) {
        router.push(next)
        router.refresh()
        return
      }
      if (Array.isArray(json.details)) setErrors(Object.fromEntries(json.details.map((d: { path: string; message: string }) => [d.path, d.message])))
      setFormError(json.message ?? 'Could not create the account. Try again.')
    } catch {
      setFormError('Could not reach the server. Try again.')
    }
    setBusy(false)
  }

  return (
    <AuthShell title="Create your account">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field name="fullName" label="Full name" autoComplete="name" error={errors.fullName} />
        <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} />
        <Field name="password" label="Password (8 or more characters)" type="password" autoComplete="new-password" error={errors.password} />
        <Field name="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" error={errors.confirmPassword} />
        {formError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      {googleEnabled && (
        <>
          <OrDivider />
          <GoogleButton next={next} label="Sign up with Google" />
        </>
      )}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-primary underline">Log in</Link>
      </p>
    </AuthShell>
  )
}
