/** Only same-site relative paths are honoured for ?next= (no open redirects). */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/'
  if (/[\u0000-\u001f]/.test(next)) return '/'
  return next
}
