/** "Ada Lovelace" becomes "Ada L." so reviews don't show full names. */
export function authorLabel(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Customer'
  const first = parts[0].slice(0, 20)
  return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first
}

export function averageRating(ratings: number[]): number {
  if (ratings.length === 0) return 0
  return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
}
