import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/server/current-user'
import { ProfileView } from '@/views/profile-view'

export const metadata: Metadata = { title: 'Your profile', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/profile')
  return <ProfileView user={user} />
}
