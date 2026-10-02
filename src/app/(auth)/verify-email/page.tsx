import type { Metadata } from 'next'
import { VerifyEmailView } from '@/views/account-views'

// The address holds a secret token: never index it and never send it on as a referrer.
export const metadata: Metadata = { title: 'Confirm your email', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return <VerifyEmailView token={typeof token === 'string' ? token : ''} />
}
