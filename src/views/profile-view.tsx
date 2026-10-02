'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { UserAvatar } from '@/components/shop/user-avatar'
import { useDismiss } from '@/hooks/use-dismiss'
import { cropSquare } from '@/lib/crop-square'
import { newPasswordField, phoneField } from '@/lib/validation'
import type { PublicUser } from '@/server/db/users'

type Result = { ok: boolean; message: string }

async function call(url: string, method: string, body?: unknown, raw?: Blob): Promise<Result> {
  try {
    const res = await fetch(url, raw ? { method, body: raw } : { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    return { ok: res.ok, message: json.details?.[0]?.message ?? json.message ?? (res.ok ? 'Saved' : 'Something went wrong. Try again.') }
  } catch {
    return { ok: false, message: 'Could not reach the server. Try again.' }
  }
}

const input = 'mt-1 w-full rounded-md border border-border bg-background px-3 py-2'
const card = 'rounded-2xl border border-border bg-surface p-5'
const primary = 'rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60'
const outline = 'rounded-full border border-border px-5 py-2 text-sm font-medium hover:border-primary disabled:opacity-60'

function Notice({ r }: { r: Result | null }) {
  return r ? <p role="status" className={`text-sm ${r.ok ? 'text-primary' : 'text-red-600 dark:text-red-400'}`}>{r.message}</p> : null
}

export function ProfileView({ user }: { user: PublicUser }) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [photoMsg, setPhotoMsg] = useState<Result | null>(null)
  const [detailsMsg, setDetailsMsg] = useState<Result | null>(null)
  const [pwMsg, setPwMsg] = useState<Result | null>(null)
  const [delMsg, setDelMsg] = useState<Result | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const delRef = useRef<HTMLDivElement>(null)
  useDismiss(delRef, confirmDelete, () => setConfirmDelete(false))

  async function upload(file: File | undefined) {
    if (!file) return
    setBusy('photo')
    const r = await call('/api/users/me/avatar', 'PUT', undefined, await cropSquare(file))
    setPhotoMsg({ ok: r.ok, message: r.ok ? 'Photo updated' : r.message })
    setBusy('')
    if (r.ok) router.refresh()
  }

  async function removePhoto() {
    setBusy('photo')
    const r = await call('/api/users/me/avatar', 'DELETE')
    setPhotoMsg({ ok: r.ok, message: r.ok ? 'Photo removed' : r.message })
    setBusy('')
    if (r.ok) router.refresh()
  }

  async function saveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const phone = phoneField.safeParse(String(f.get('phone') ?? ''))
    if (!phone.success) return setDetailsMsg({ ok: false, message: phone.error.issues[0].message })
    const fullName = String(f.get('fullName') ?? '').trim()
    if (!fullName) return setDetailsMsg({ ok: false, message: 'Enter your full name' })
    setBusy('details')
    const r = await call('/api/users/me', 'PATCH', { fullName, phone: String(f.get('phone') ?? '') })
    setDetailsMsg({ ok: r.ok, message: r.ok ? 'Profile saved' : r.message })
    setBusy('')
    if (r.ok) router.refresh()
  }

  async function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    const next = String(f.get('newPassword') ?? '')
    const check = newPasswordField.safeParse(next)
    if (!check.success) return setPwMsg({ ok: false, message: check.error.issues[0].message })
    if (next !== String(f.get('confirm') ?? '')) return setPwMsg({ ok: false, message: 'The two passwords don’t match' })
    setBusy('password')
    const r = await call('/api/users/me/password', 'PATCH', { currentPassword: user.hasPassword ? String(f.get('currentPassword') ?? '') : undefined, newPassword: next })
    setPwMsg({ ok: r.ok, message: r.ok ? `${r.message}. Your other devices were signed out.` : r.message })
    setBusy('')
    if (r.ok) { form.reset(); router.refresh() }
  }

  async function deleteAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy('delete')
    const r = await call('/api/users/me', 'DELETE', user.hasPassword ? { password: String(f.get('password') ?? '') } : { confirmEmail: String(f.get('confirmEmail') ?? '') })
    if (r.ok) {
      router.push('/')
      router.refresh()
      return
    }
    setDelMsg(r)
    setBusy('')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-3xl font-semibold">Your profile</h1>

      <section className={`${card} flex flex-wrap items-center gap-5`}>
        <UserAvatar user={user} className="size-24 text-3xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="truncate text-lg font-semibold">{user.fullName}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <p className="mt-1 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-primary-soft px-2.5 py-0.5">{user.emailVerified ? 'Email confirmed' : 'Email not confirmed yet'}</span>
              {user.googleLinked && <span className="rounded-full bg-primary-soft px-2.5 py-0.5">Google connected</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className={`${outline} cursor-pointer`}>
              {user.avatarUrl ? 'Change photo' : 'Add a photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy === 'photo'} onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            {user.avatarUrl && <button type="button" onClick={removePhoto} disabled={busy === 'photo'} className={outline}>Remove photo</button>}
          </div>
          <Notice r={photoMsg} />
        </div>
      </section>

      <form onSubmit={saveDetails} noValidate className={`${card} space-y-4`}>
        <h2 className="font-semibold">Your details</h2>
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium">Full name</label>
          <input id="fullName" name="fullName" defaultValue={user.fullName} maxLength={120} autoComplete="name" className={input} />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium">Phone number (optional)</label>
          <input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ''} maxLength={20} autoComplete="tel" placeholder="+234 801 234 5678" className={input} />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input id="email" value={user.email} disabled readOnly className={`${input} opacity-70`} />
          <p className="mt-1 text-xs text-muted-foreground">Your email is how you sign in and where order updates go, so it can’t be changed here.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy === 'details'} className={primary}>{busy === 'details' ? 'Saving…' : 'Save changes'}</button>
          <Notice r={detailsMsg} />
        </div>
      </form>

      <form onSubmit={savePassword} noValidate className={`${card} space-y-4`}>
        <h2 className="font-semibold">{user.hasPassword ? 'Change your password' : 'Add a password'}</h2>
        {!user.hasPassword && <p className="text-sm text-muted-foreground">You signed up with Google. Add a password if you’d also like to log in with your email.</p>}
        {user.hasPassword && (
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium">Current password</label>
            <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" className={input} />
          </div>
        )}
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium">New password (8 to 72 characters)</label>
          <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" className={input} />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium">Confirm new password</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" className={input} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy === 'password'} className={primary}>{busy === 'password' ? 'Saving…' : user.hasPassword ? 'Change password' : 'Add password'}</button>
          <Notice r={pwMsg} />
        </div>
      </form>

      <section className={`${card} space-y-3 border-red-300/60 dark:border-red-400/30`}>
        <h2 className="font-semibold">Delete your account</h2>
        <p className="text-sm text-muted-foreground">This removes your account, cart, wishlist and saved addresses for good. Past orders stay on record so we can still deliver and refund them.</p>
        {!confirmDelete ? (
          <button type="button" onClick={() => setConfirmDelete(true)} className={outline}>Delete my account</button>
        ) : (
          <div ref={delRef}>
            <form onSubmit={deleteAccount} className="space-y-3">
              {user.hasPassword ? (
                <div>
                  <label htmlFor="del-password" className="block text-sm font-medium">Enter your password to confirm</label>
                  <input id="del-password" name="password" type="password" autoComplete="current-password" className={input} />
                </div>
              ) : (
                <div>
                  <label htmlFor="del-email" className="block text-sm font-medium">Type your email address to confirm</label>
                  <input id="del-email" name="confirmEmail" type="email" placeholder={user.email} className={input} />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={busy === 'delete'} className="rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{busy === 'delete' ? 'Deleting…' : 'Delete account and everything in it'}</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className={outline}>Cancel</button>
              </div>
              <Notice r={delMsg} />
            </form>
          </div>
        )}
      </section>
    </div>
  )
}
