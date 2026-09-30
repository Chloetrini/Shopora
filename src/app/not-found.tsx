import Link from 'next/link'
import { SITE } from '@/constants/site'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 text-center">
      <Link href="/" className="font-display text-3xl font-semibold tracking-tight">{SITE.name}</Link>
      <h1 className="font-display mt-8 text-2xl font-semibold">We can’t find that page</h1>
      <p className="mt-2 text-muted-foreground">The link may be old or mistyped.</p>
      <Link href="/" className="mt-6 inline-block self-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Back to the shop</Link>
    </main>
  )
}
