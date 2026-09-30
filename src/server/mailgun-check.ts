type Env = Record<string, string | undefined>

export type MailgunCheck = {
  apiKey: 'valid' | 'rejected' | 'unchecked'
  domain: 'found' | 'not found' | 'unchecked'
  kind: 'sandbox' | 'custom' | 'unknown'
  state: string
  sender: 'matches the domain' | 'different domain' | 'missing'
  hint: string
}

/**
 * Read-only: asks Mailgun about the domain (nothing is sent) and explains the result in plain words.
 * Never returns the key or any part of it. `fetchImpl` is injectable for tests.
 */
export async function checkMailgun(env: Env, fetchImpl: typeof fetch = fetch): Promise<MailgunCheck> {
  const key = env.MAILGUN_API_KEY
  const domain = env.MAILGUN_DOMAIN?.trim()
  const from = env.MAILGUN_FROM?.trim()
  const base = (env.MAILGUN_BASE_URL || 'https://api.mailgun.net').replace(/\/+$/, '')
  const missing = [!key && 'MAILGUN_API_KEY', !domain && 'MAILGUN_DOMAIN', !from && 'MAILGUN_FROM'].filter(Boolean)
  const kind = !domain ? 'unknown' : /^sandbox[0-9a-f]+\.mailgun\.org$/i.test(domain) ? 'sandbox' : 'custom'
  const sender = !from ? 'missing' : domain && from.toLowerCase().includes(`@${domain.toLowerCase()}`) ? 'matches the domain' : 'different domain'

  if (missing.length > 0 || !key || !domain) {
    return { apiKey: 'unchecked', domain: 'unchecked', kind, state: 'unknown', sender, hint: `Not set in Vercel: ${missing.join(', ')}. Add them and redeploy.` }
  }
  let res: Response
  try {
    res = await fetchImpl(`${base}/v3/domains/${encodeURIComponent(domain)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`api:${key}`).toString('base64')}` },
      cache: 'no-store',
    })
  } catch {
    return { apiKey: 'unchecked', domain: 'unchecked', kind, state: 'unknown', sender, hint: 'Could not reach Mailgun from the server. Try again in a minute.' }
  }
  if (res.status === 401 || res.status === 403) {
    return { apiKey: 'rejected', domain: 'unchecked', kind, state: 'unknown', sender, hint: 'Mailgun rejected the API key. Create a new Private API key in Mailgun (API keys) and update MAILGUN_API_KEY in Vercel. If your account is in the EU, also set MAILGUN_BASE_URL to https://api.eu.mailgun.net.' }
  }
  if (res.status === 404) {
    return { apiKey: 'valid', domain: 'not found', kind, state: 'unknown', sender, hint: 'The key works but Mailgun has no domain with that name on this account or region. Check MAILGUN_DOMAIN spelling, or set MAILGUN_BASE_URL to https://api.eu.mailgun.net if the account is EU.' }
  }
  if (!res.ok) {
    return { apiKey: 'valid', domain: 'unchecked', kind, state: `http ${res.status}`, sender, hint: `Mailgun answered ${res.status}. Try again shortly.` }
  }
  const json = (await res.json().catch(() => null)) as { domain?: { state?: string } } | null
  const state = json?.domain?.state ?? 'unknown'
  const hints: string[] = []
  if (state !== 'active') hints.push(`The domain state is "${state}", not "active". Finish verifying it in Mailgun.`)
  if (kind === 'sandbox') hints.push('This is a sandbox domain: Mailgun only delivers to addresses listed under Authorized recipients (and each must click the confirmation link Mailgun emails them). Add the buyer’s email there, or verify your own domain to send to anyone.')
  if (sender !== 'matches the domain') hints.push(`MAILGUN_FROM should use an address on ${domain}, for example Shopora <postmaster@${domain}>.`)
  if (hints.length === 0) hints.push('Key, domain and sender look right. If emails still do not arrive, open Mailgun, Sending, Logs to see why a message was rejected.')
  return { apiKey: 'valid', domain: 'found', kind, state, sender, hint: hints.join(' ') }
}
