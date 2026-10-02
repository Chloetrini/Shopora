import type { Metadata } from 'next'
import { ResetPasswordView } from '@/views/account-views'

// The address holds a secret token: never index it and never send it on as a referrer.
export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return <ResetPasswordView token={typeof token === 'string' ? token : ''} />
}
