import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold">We can’t find that page</h1>
      <p className="mt-2 text-muted-foreground">The link may be old or mistyped.</p>
      <Link href="/" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Back to the shop</Link>
    </div>
  )
}
