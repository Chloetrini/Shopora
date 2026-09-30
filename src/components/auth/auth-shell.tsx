export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-surface p-6">
      <h1 className="text-center text-2xl font-semibold">{title}</h1>
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  )
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground" role="separator">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
