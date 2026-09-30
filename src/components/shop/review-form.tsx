'use client'

import { Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ReviewForm({ slug, initialRating = 0, initialBody = '' }: { slug: string; initialRating?: number; initialBody?: string }) {
  const router = useRouter()
  const [rating, setRating] = useState(initialRating)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (rating < 1) return setError('Choose a rating from 1 to 5 stars')
    setError('')
    setBusy(true)
    try {
      const res = await fetch(`/api/products/${slug}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, body: String(new FormData(e.currentTarget).get('body') ?? '') }),
      })
      const json = await res.json()
      if (res.ok) return router.refresh()
      setError(json.details?.[0]?.message ?? json.message ?? 'Could not save your review.')
    } catch {
      setError('Could not reach the server. Try again.')
    }
    setBusy(false)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <p className="font-medium">{initialRating ? 'Update your review' : 'Write a review'}</p>
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`} onClick={() => setRating(n)} className="rounded p-0.5">
            <Star className={`size-7 ${n <= rating ? 'fill-gold text-gold' : 'text-border'}`} aria-hidden />
          </button>
        ))}
      </div>
      <label htmlFor="review-body" className="sr-only">Your review</label>
      <textarea id="review-body" name="body" rows={3} maxLength={1000} defaultValue={initialBody} placeholder="What did you think? (optional)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={busy} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{busy ? 'Saving…' : 'Post review'}</button>
    </form>
  )
}

export function DeleteReviewButton({ slug }: { slug: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <button type="button" disabled={busy} className="text-xs text-muted-foreground underline"
      onClick={async () => {
        setBusy(true)
        await fetch(`/api/products/${slug}/reviews`, { method: 'DELETE' }).catch(() => {})
        router.refresh()
        setBusy(false)
      }}>
      Delete my review
    </button>
  )
}
