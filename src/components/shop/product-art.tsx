import { artKind, toneFor, type ArtKind } from '@/lib/catalog'

/** Drawn product illustrations (viewBox 200x200). Shown when a product has no photo, or its photo fails to load. */
function Shape({ kind, c1, c2 }: { kind: ArtKind; c1: string; c2: string }) {
  const light = '#ffffffb3'
  switch (kind) {
    case 'tote':
      return (
        <>
          <path d="M70 78c0-34 60-34 60 0" fill="none" stroke={c2} strokeWidth="7" strokeLinecap="round" />
          <path d="M52 76h96l8 92a6 6 0 0 1-6 6H50a6 6 0 0 1-6-6z" fill={c1} />
          <rect x="74" y="112" width="52" height="38" rx="5" fill={c2} opacity=".35" />
          <path d="M52 76h96" stroke={light} strokeWidth="3" />
        </>
      )
    case 'mug':
      return (
        <>
          <path d="M146 92c26-4 30 34 2 38" fill="none" stroke={c2} strokeWidth="9" strokeLinecap="round" />
          <path d="M54 76h96l-6 82a14 14 0 0 1-14 13H74a14 14 0 0 1-14-13z" fill={c1} />
          <ellipse cx="102" cy="76" rx="48" ry="8" fill={c2} />
          <path d="M84 52c-8-10 8-14 0-24M106 52c-8-10 8-14 0-24M128 52c-8-10 8-14 0-24" fill="none" stroke={light} strokeWidth="4" strokeLinecap="round" />
        </>
      )
    case 'lamp':
      return (
        <>
          <path d="M100 62 136 40l22 40-36 22z" fill={c1} />
          <path d="M122 100 106 138l-30 6" fill="none" stroke={c2} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="68" cy="166" rx="34" ry="8" fill={c2} />
          <path d="M76 98 52 150M146 92l18 6" stroke={light} strokeWidth="0" />
          <path d="M112 106l14 36" stroke={light} strokeWidth="3" strokeLinecap="round" opacity=".7" />
        </>
      )
    case 'notebook':
      return (
        <>
          <rect x="56" y="58" width="92" height="116" rx="8" fill={c2} transform="rotate(-8 100 116)" />
          <rect x="60" y="48" width="92" height="116" rx="8" fill={c1} transform="rotate(4 106 106)" />
          <rect x="70" y="38" width="92" height="120" rx="8" fill={light} stroke={c1} strokeWidth="3" />
          <path d="M84 70h64M84 86h64M84 102h44" stroke={c1} strokeWidth="4" strokeLinecap="round" opacity=".5" />
          <rect x="146" y="38" width="10" height="120" fill={c2} />
        </>
      )
    case 'bottle':
      return (
        <>
          <rect x="84" y="24" width="32" height="20" rx="5" fill={c2} />
          <path d="M88 44h24v12c14 8 18 20 18 36v68a10 10 0 0 1-10 10H80a10 10 0 0 1-10-10V92c0-16 4-28 18-36z" fill={c1} />
          <rect x="70" y="104" width="60" height="30" fill={light} opacity=".75" />
          <path d="M82 62c-4 22-4 70 0 96" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".4" fill="none" />
        </>
      )
    case 'beanie':
      return (
        <>
          <circle cx="100" cy="42" r="15" fill={c2} />
          <path d="M44 122c0-50 28-74 56-74s56 24 56 74z" fill={c1} />
          <rect x="38" y="118" width="124" height="34" rx="10" fill={c2} />
          <path d="M60 118v34M80 118v34M100 118v34M120 118v34M140 118v34" stroke={light} strokeWidth="3" opacity=".5" />
          <path d="M66 100c8-26 22-38 34-40" stroke={light} strokeWidth="4" strokeLinecap="round" opacity=".4" fill="none" />
        </>
      )
    case 'backpack':
      return (
        <>
          <path d="M82 50c0-22 36-22 36 0" fill="none" stroke={c2} strokeWidth="8" strokeLinecap="round" />
          <rect x="52" y="48" width="96" height="124" rx="26" fill={c1} />
          <rect x="68" y="100" width="64" height="50" rx="10" fill={c2} opacity=".55" />
          <path d="M68 100h64" stroke={light} strokeWidth="3" />
          <path d="M52 92c-14 6-14 46 0 52M148 92c14 6 14 46 0 52" fill="none" stroke={c2} strokeWidth="8" strokeLinecap="round" />
          <circle cx="100" cy="74" r="6" fill={light} />
        </>
      )
    case 'sunglasses':
      return (
        <>
          <path d="M30 88l22 4M170 88l-22 4" stroke={c2} strokeWidth="8" strokeLinecap="round" />
          <rect x="44" y="82" width="52" height="42" rx="18" fill={c2} />
          <rect x="104" y="82" width="52" height="42" rx="18" fill={c2} />
          <path d="M96 94c4-6 4-6 8 0" stroke={c1} strokeWidth="6" fill="none" strokeLinecap="round" />
          <rect x="49" y="87" width="42" height="32" rx="14" fill={c1} opacity=".75" />
          <rect x="109" y="87" width="42" height="32" rx="14" fill={c1} opacity=".75" />
          <path d="M56 96c6-6 14-6 20-4M116 96c6-6 14-6 20-4" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".6" fill="none" />
        </>
      )
    case 'watch':
      return (
        <>
          <rect x="82" y="16" width="36" height="168" rx="12" fill={c2} />
          <circle cx="100" cy="100" r="50" fill={c1} />
          <circle cx="100" cy="100" r="41" fill={light} />
          <path d="M100 100V72M100 100l22 12" stroke={c2} strokeWidth="5" strokeLinecap="round" />
          <path d="M100 64v6M100 130v6M64 100h6M130 100h6" stroke={c1} strokeWidth="3" strokeLinecap="round" />
          <rect x="150" y="94" width="8" height="12" rx="3" fill={c1} />
        </>
      )
    case 'headphones':
      return (
        <>
          <path d="M46 116V104c0-40 22-62 54-62s54 22 54 62v12" fill="none" stroke={c2} strokeWidth="9" strokeLinecap="round" />
          <rect x="34" y="104" width="34" height="62" rx="16" fill={c1} />
          <rect x="132" y="104" width="34" height="62" rx="16" fill={c1} />
          <rect x="40" y="116" width="10" height="38" rx="5" fill={light} opacity=".6" />
          <rect x="150" y="116" width="10" height="38" rx="5" fill={light} opacity=".6" />
        </>
      )
    case 'candle':
      return (
        <>
          <path d="M100 26c14 16 14 26 0 34-14-8-14-18 0-34z" fill="#f4b23a" />
          <path d="M100 38c6 8 6 12 0 16-6-4-6-8 0-16z" fill="#fff" opacity=".8" />
          <path d="M100 60v12" stroke={c2} strokeWidth="3" strokeLinecap="round" />
          <path d="M58 76h84v82a16 16 0 0 1-16 16H74a16 16 0 0 1-16-16z" fill={c1} />
          <rect x="58" y="76" width="84" height="12" fill={c2} opacity=".5" />
          <rect x="72" y="106" width="56" height="34" rx="4" fill={light} />
          <path d="M82 122h36M88 130h24" stroke={c1} strokeWidth="3" strokeLinecap="round" />
        </>
      )
    case 'plant':
      return (
        <>
          <path d="M100 100c-2-30-22-44-44-44 0 26 18 44 44 44z" fill={c1} />
          <path d="M100 100c2-34 24-52 50-50-2 30-20 50-50 50z" fill={c2} opacity=".85" />
          <path d="M100 100c-4-24 0-44 0-58 10 14 14 34 0 58z" fill={c1} />
          <path d="M56 104h88l-12 62a10 10 0 0 1-10 8H78a10 10 0 0 1-10-8z" fill={light} stroke={c2} strokeWidth="3" />
          <rect x="52" y="96" width="96" height="14" rx="6" fill={c2} />
        </>
      )
  }
}

export function ProductArt({ slug, category, className = '' }: { slug: string; category: string; className?: string }) {
  const t = toneFor(slug)
  const gid = `g-${slug}`
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={`Illustration of ${slug.replace(/-/g, ' ')}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.bg1} />
          <stop offset="1" stopColor={t.bg2} />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${gid})`} />
      <circle cx="160" cy="36" r="46" fill="#fff" opacity=".3" />
      <ellipse cx="100" cy="178" rx="52" ry="7" fill="#000" opacity=".12" />
      <Shape kind={artKind(slug, category)} c1={t.c1} c2={t.c2} />
    </svg>
  )
}
