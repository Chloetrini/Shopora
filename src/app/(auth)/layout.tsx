import Link from 'next/link'
import { SITE } from '@/constants/site'

// Login and sign up: no navbar, no footer. Just the name above the card, as in the design notes.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="font-display mb-6 text-center text-3xl font-semibold tracking-tight" aria-label={`${SITE.name}, back to the shop`}>
        {SITE.name}
      </Link>
      {children}
    </main>
  )
}
