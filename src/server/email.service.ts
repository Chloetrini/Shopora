import 'server-only'

export type EmailMessage = { to: string; subject: string; text: string; html: string }
/** sent = a provider accepted it; logged = printed to the terminal (dev, no keys); skipped = production without keys. */
export type EmailResult = 'sent' | 'logged' | 'skipped'

export class EmailError extends Error {}

type Env = Record<string, string | undefined>
type Provider = { name: 'mailgun' | 'brevo'; send: (msg: EmailMessage) => Promise<void> }

/** "Shopora <orders@x.com>" or a bare address. */
export function parseSender(from: string): { name?: string; email: string } {
  const m = /^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/.exec(from)
  return m ? { name: m[1]?.trim() || undefined, email: m[2].trim() } : { email: from.trim() }
}

async function failure(res: Response, who: string): Promise<EmailError> {
  const detail = ((await res.json().catch(() => null)) as { message?: string } | null)?.message
  // The message comes from the provider; an API key is never part of it.
  return new EmailError(`${who} responded ${res.status}${detail ? `: ${detail}` : ''}`)
}

function mailgun(env: Env): Provider | null {
  const { MAILGUN_API_KEY: key, MAILGUN_DOMAIN: domain, MAILGUN_FROM: from } = env
  if (!key || !domain || !from) return null
  const base = (env.MAILGUN_BASE_URL || 'https://api.mailgun.net').replace(/\/+$/, '')
  return {
    name: 'mailgun',
    async send(msg) {
      const res = await fetch(`${base}/v3/${encodeURIComponent(domain)}/messages`, {
        method: 'POST',
        headers: { Authorization: `Basic ${Buffer.from(`api:${key}`).toString('base64')}` },
        body: new URLSearchParams({ from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html }),
        cache: 'no-store',
      })
      if (!res.ok) throw await failure(res, 'Mailgun')
    },
  }
}

/** Backup sender. Needs BREVO_API_KEY and BREVO_FROM (an address verified in Brevo under Senders). */
function brevo(env: Env): Provider | null {
  const { BREVO_API_KEY: key, BREVO_FROM: from } = env
  if (!key || !from) return null
  return {
    name: 'brevo',
    async send(msg) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ sender: parseSender(from), to: [{ email: msg.to }], subject: msg.subject, htmlContent: msg.html, textContent: msg.text }),
        cache: 'no-store',
      })
      if (!res.ok) throw await failure(res, 'Brevo')
    },
  }
}

/** Mailgun first (the course requirement), Brevo as the backup. Only the ones that are fully configured. */
export const emailProviders = (env: Env = process.env): Provider[] => [mailgun(env), brevo(env)].filter((p): p is Provider => p !== null)
export const emailConfigured = (env: Env = process.env) => emailProviders(env).length > 0

/**
 * Sends through the first provider that accepts the message; if Mailgun refuses it (an unauthorised sandbox
 * recipient, say) Brevo is tried next. Throws EmailError naming every provider's reason if all of them fail.
 * With no provider configured: development prints the email, production skips it (checkout must never fail because of email).
 */
export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const providers = emailProviders()
  if (providers.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Email not configured (Mailgun or Brevo); skipped:', msg.subject)
      return 'skipped'
    }
    console.log(`\n--- email (not sent: no provider configured) ---\nTo: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n---\n`)
    return 'logged'
  }
  const errors: string[] = []
  for (const p of providers) {
    try {
      await p.send(msg)
      if (errors.length > 0) console.warn(`Email sent through ${p.name} after: ${errors.join(' | ')}`)
      return 'sent'
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `${p.name} failed`)
    }
  }
  throw new EmailError(errors.join(' | '))
}
