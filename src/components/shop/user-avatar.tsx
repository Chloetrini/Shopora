import type { PublicUser } from '@/server/db/users'

/** The person's photo, or their first letter on the brand colour. The photo address is only served to its owner. */
export function UserAvatar({ user, className = 'size-10 text-sm' }: { user: Pick<PublicUser, 'fullName' | 'avatarUrl'>; className?: string }) {
  const base = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-primary-foreground ${className}`
  if (user.avatarUrl) {
    // A plain <img>: the address is same-origin, session-protected and versioned (?v=), so next/image adds nothing.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" className={`${base} object-cover`} />
  }
  return <span className={base} aria-hidden>{(user.fullName.trim()[0] ?? '?').toUpperCase()}</span>
}
