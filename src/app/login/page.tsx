import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { safeNextPath } from '@/lib/safe-next'
import { getSessionUser } from '@/server/current-user'
import { googleConfigured } from '@/server/google'
import { LoginView } from '@/views/login-view'

export const metadata: Metadata = { title: 'Log in' }
// Depends on the session cookie and on env vars (the Google button), so it can't be prerendered.
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams
  const safeNext = safeNextPath(next)
  if (await getSessionUser()) redirect(safeNext)
  return <LoginView next={safeNext} error={error} googleEnabled={googleConfigured()} />
}
