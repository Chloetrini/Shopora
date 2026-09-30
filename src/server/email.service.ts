import 'server-only'

export type EmailMessage = { to: string; subject: string; text: string; html: string }
/** sent = Mailgun accepted it; logged = printed to the terminal (dev, no keys); skipped = production without keys. */
export type EmailResult = 'sent' | 'logged' | 'skipped'

export class EmailError extends Error {}

function config() {
  const { MAILGUN_API_KEY: key, MAILGUN_DOMAIN: domain, MAILGUN_FROM: from } = process.env
  if (!key || !domain || !from) return null
  const base = (process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net').replace(/\/+$/, '')
  return { key, domain, from, base }
}

export const emailConfigured = () => config() !== null

/**
 * Mailgun's HTTP API over fetch (no SDK). Needs MAILGUN_API_KEY, MAILGUN_DOMAIN and MAILGUN_FROM.
 * Without them: development prints the email, production skips it (checkout must never fail because of email).
 * Throws EmailError if Mailgun rejects the message; the message never includes the API key.
 */
export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const cfg = config()
  if (!cfg) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Email not configured (MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM); skipped:', msg.subject)
      return 'skipped'
    }
    console.log(`\n--- email (not sent: Mailgun not configured) ---\nTo: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n---\n`)
    return 'logged'
  }
  const res = await fetch(`${cfg.base}/v3/${encodeURIComponent(cfg.domain)}/messages`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`api:${cfg.key}`).toString('base64')}` },
    body: new URLSearchParams({ from: cfg.from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const detail = ((await res.json().catch(() => null)) as { message?: string } | null)?.message
    throw new EmailError(`Mailgun responded ${res.status}${detail ? `: ${detail}` : ''}`)
  }
  return 'sent'
}
