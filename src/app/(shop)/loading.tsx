/** Shown while a shop page is fetching its data: grey blocks in the shape of the page, pulsing. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-2/3 max-w-sm rounded-lg bg-border/70" />
        <div className="h-4 w-1/2 max-w-xs rounded bg-border/50" />
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="animate-pulse overflow-hidden rounded-lg bg-surface">
            <div className="aspect-[4/5] bg-border/70" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-1/3 rounded bg-border/50" />
              <div className="h-5 w-4/5 rounded bg-border/70" />
              <div className="h-4 w-1/2 rounded bg-border/50" />
              <div className="mt-3 h-10 rounded-full bg-border/60" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
