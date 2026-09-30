import { SITE } from '@/constants/site'
import { ProductCard } from '@/components/shop/product-card'
import { listProducts } from '@/server/db/products'

// Reads the database on every request so new products show up without a rebuild.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const products = await listProducts()
  return (
    <>
      <h1 className="text-3xl font-semibold sm:text-4xl">{SITE.tagline}</h1>
      {products.length === 0 ? (
        <p className="mt-8 text-muted-foreground">No products yet. Check back soon.</p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </ul>
      )}
    </>
  )
}
