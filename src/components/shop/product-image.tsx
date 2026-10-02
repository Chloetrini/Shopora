'use client'

import { ImageOff } from 'lucide-react'
import { useState } from 'react'

/**
 * The photo, loaded normally. A grey skeleton pulses until it is ready and the photo fades in on top.
 * No drawn stand-in: a product with no photo, or one that fails to load, shows a quiet neutral box with an icon.
 */
export function ProductImage({ name, imageUrl, className = '' }: {
  slug?: string; category?: string; name: string; imageUrl: string | null; className?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!imageUrl || failed) {
    return (
      <div className={`relative flex items-center justify-center overflow-hidden bg-border/40 text-muted-foreground ${className}`} role="img" aria-label={`${name}, no photo available`}>
        <ImageOff className="size-8" aria-hidden />
      </div>
    )
  }
  return (
    <div className={`relative overflow-hidden bg-border/40 ${className}`}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-border/70" aria-hidden />}
      {/* Plain <img>: the photo is remote or uploaded, and next/image would need an allow-list for every host. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        ref={(el) => {
          // The photo may already be finished (cached) or failed before hydration; catch both.
          if (!el || !el.complete) return
          if (el.naturalWidth > 0) setLoaded(true)
          else setFailed(true)
        }}
        className={`absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
