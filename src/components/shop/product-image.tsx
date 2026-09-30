'use client'

import { useState } from 'react'
import { ProductArt } from './product-art'

/**
 * The drawing is always underneath; the photo sits on top and is removed if it fails to load,
 * so a blocked or missing photo never leaves a broken-image box on a product.
 */
export function ProductImage({ slug, category, name, imageUrl, className = '' }: {
  slug: string; category: string; name: string; imageUrl: string | null; className?: string
}) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`relative overflow-hidden bg-background ${className}`}>
      <ProductArt slug={slug} category={category} className="absolute inset-0 size-full" />
      {imageUrl && !failed && (
        // Plain <img>: the photo is remote and optional, and next/image would need an allow-list for every host.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          ref={(el) => {
            // The error can fire before hydration; catch an image that has already failed.
            if (el && el.complete && el.naturalWidth === 0) setFailed(true)
          }}
          className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
        />
      )}
    </div>
  )
}
