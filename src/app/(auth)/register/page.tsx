import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { safeNextPath } from '@/lib/safe-next'
import { getSessionUser } from '@/server/current-user'
import { googleConfigured } from '@/server/google'
import { RegisterView } from '@/views/register-view'

export const metadata: Metadata = { title: 'Create an account' }
// Depends on the session cookie and on env vars (the Google button), so it can't be prerendered.
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const safeNext = safeNextPath(next)
  if (await getSessionUser()) redirect(safeNext)
  return <RegisterView next={safeNext} googleEnabled={googleConfigured()} />
}
