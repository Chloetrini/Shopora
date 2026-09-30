import { Star } from 'lucide-react'

/** Read-only stars (a rating like 4.3 fills four and a bit). `count` adds "(12)". */
export function Stars({ value, count, className = '' }: { value: number; count?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${className}`} role="img" aria-label={`${value} out of 5 stars${count != null ? `, ${count} ${count === 1 ? 'review' : 'reviews'}` : ''}`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={`size-4 ${value >= n - 0.25 ? 'fill-gold text-gold' : value >= n - 0.75 ? 'fill-gold/50 text-gold' : 'text-border'}`} aria-hidden />
        ))}
      </span>
      {count != null && <span className="text-muted-foreground">({count})</span>}
    </span>
  )
}
