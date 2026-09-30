import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ProductCard } from '@/components/shop/product-card'
import { getSessionUser } from '@/server/current-user'
import { wishlistProducts } from '@/server/db/features'

export const metadata: Metadata = { title: 'Wishlist', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function WishlistPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/wishlist')
  const products = await wishlistProducts(user.id)
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Wishlist</h1>
      <p className="mt-1 text-muted-foreground">Things you’ve saved for later.</p>
      {products.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="font-medium">Nothing saved yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Tap the heart on any product to keep it here.</p>
          <Link href="/#shop" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Browse products</Link>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} wished signedIn />)}
        </ul>
      )}
    </div>
  )
}
