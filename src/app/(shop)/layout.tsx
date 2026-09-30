import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { getSessionUser } from '@/server/current-user'

// The shop pages: navbar on top, footer at the bottom. Login and sign up live in (auth) and have neither.
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  return (
    <>
      <SiteHeader user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <SiteFooter />
    </>
  )
}
