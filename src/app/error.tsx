'use client'

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 text-center">
      <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">Please try again. If it keeps happening, come back in a few minutes.</p>
      <button type="button" onClick={reset} className="mt-6 self-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Try again</button>
    </main>
  )
}
