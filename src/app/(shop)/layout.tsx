import { CartProvider } from '@/hooks/use-cart'
import { SiteFooter } from '@/components/layout/site-footer'
import { cookies } from 'next/headers'
import { WelcomeBanner } from '@/components/layout/welcome-banner'
import { VerifyBanner } from '@/components/layout/verify-banner'
import { AppTabBar } from '@/components/layout/app-tab-bar'
import { SiteHeader } from '@/components/layout/site-header'
import { getSessionUser } from '@/server/current-user'
import { getCart } from '@/server/db/cart'
import { WELCOME_COOKIE } from '@/server/session'

function safeDecode(v: string | undefined): string {
  try {
    return v ? decodeURIComponent(v).slice(0, 40) : ''
  } catch {
    return ''
  }
}

// The shop pages: navbar on top, footer at the bottom. Login and sign up live in (auth) and have neither.
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  const welcome = user ? safeDecode((await cookies()).get(WELCOME_COOKIE)?.value) : ''
  // A signed-in buyer's cart comes from the server, so the first paint already shows what the phone added.
  const items = user ? await getCart(user.id).catch(() => []) : []
  return (
    <CartProvider signedIn={!!user} initialItems={items}>
      {welcome && <WelcomeBanner name={welcome} />}
      {user && !user.emailVerified && <VerifyBanner email={user.email} />}
      <SiteHeader user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <SiteFooter />
      <AppTabBar signedIn={!!user} isAdmin={!!user?.isAdmin} />
    </CartProvider>
  )
}
