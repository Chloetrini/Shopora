import { CartProvider } from '@/hooks/use-cart'
import { SiteFooter } from '@/components/layout/site-footer'
import { VerifyBanner } from '@/components/layout/verify-banner'
import { SiteHeader } from '@/components/layout/site-header'
import { getSessionUser } from '@/server/current-user'
import { getCart } from '@/server/db/cart'

// The shop pages: navbar on top, footer at the bottom. Login and sign up live in (auth) and have neither.
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  // A signed-in buyer's cart comes from the server, so the first paint already shows what the phone added.
  const items = user ? await getCart(user.id).catch(() => []) : []
  return (
    <CartProvider signedIn={!!user} initialItems={items}>
      {user && !user.emailVerified && <VerifyBanner email={user.email} />}
      <SiteHeader user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <SiteFooter />
    </CartProvider>
  )
}
