type Env = Record<string, string | undefined>

export type MailgunCheck = {
  apiKey: 'valid' | 'rejected' | 'unchecked'
  domain: 'found' | 'not found' | 'unchecked'
  kind: 'sandbox' | 'custom' | 'unknown'
  state: string
  sender: 'matches the domain' | 'different domain' | 'missing'
  /** What is set, so a typo is visible. The domain and the sender's domain are not secrets; the key never appears. */
  seenDomain: string
  seenSenderDomain: string
  problems: string[]
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
  const seenDomain = domain ?? ''
  const seenSenderDomain = from ? (/@([^>\s]+)/.exec(from)?.[1] ?? '(no @ found)') : ''
  const problems: string[] = []
  if (domain) {
    if (/^https?:/i.test(domain) || domain.includes('/')) problems.push('MAILGUN_DOMAIN must be only the domain name, not a web address.')
    if (/["'\s]/.test(domain)) problems.push('MAILGUN_DOMAIN contains a quote or a space. Paste it with nothing around it.')
    if (!/^[a-z0-9.-]+$/i.test(domain.replace(/["'\s]/g, ''))) problems.push('MAILGUN_DOMAIN has characters a domain cannot contain.')
    if (kind === 'custom' && /^sandbox/i.test(domain)) problems.push('This starts with "sandbox" but is not a full sandbox name. It should look like sandbox<letters and numbers>.mailgun.org.')
    if (kind === 'custom' && !/\./.test(domain)) problems.push('MAILGUN_DOMAIN has no dot. It should end in .mailgun.org for a sandbox.')
  }
  if (from && !/@/.test(from)) problems.push('MAILGUN_FROM has no email address in it.')
  const sender = !from ? 'missing' : domain && from.toLowerCase().includes(`@${domain.toLowerCase()}`) ? 'matches the domain' : 'different domain'

  if (missing.length > 0 || !key || !domain) {
    return { apiKey: 'unchecked', domain: 'unchecked', kind, state: 'unknown', sender, seenDomain, seenSenderDomain, problems, hint: `Not set in Vercel: ${missing.join(', ')}. Add them and redeploy.` }
  }
  let res: Response
  try {
    res = await fetchImpl(`${base}/v3/domains/${encodeURIComponent(domain)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`api:${key}`).toString('base64')}` },
      cache: 'no-store',
    })
  } catch {
    return { apiKey: 'unchecked', domain: 'unchecked', kind, state: 'unknown', sender, seenDomain, seenSenderDomain, problems, hint: 'Could not reach Mailgun from the server. Try again in a minute.' }
  }
  if (res.status === 401 || res.status === 403) {
    return { apiKey: 'rejected', domain: 'unchecked', kind, state: 'unknown', sender, seenDomain, seenSenderDomain, problems, hint: 'Mailgun rejected the API key. Causes, most likely first: the key was copied with a space or quote around it; it is a sending key or a different kind of key (use an account Private API key from API security); it was deleted; or the account is in the EU (then also set MAILGUN_BASE_URL to https://api.eu.mailgun.net). Create a fresh Private API key, paste it with nothing around it, and redeploy.' }
  }
  if (res.status === 404) {
    return { apiKey: 'valid', domain: 'not found', kind, state: 'unknown', sender, seenDomain, seenSenderDomain, problems, hint: 'The key works but Mailgun has no domain with that name on this account or region. Check MAILGUN_DOMAIN spelling, or set MAILGUN_BASE_URL to https://api.eu.mailgun.net if the account is EU.' }
  }
  if (!res.ok) {
    return { apiKey: 'valid', domain: 'unchecked', kind, state: `http ${res.status}`, sender, seenDomain, seenSenderDomain, problems, hint: `Mailgun answered ${res.status}. Try again shortly.` }
  }
  const json = (await res.json().catch(() => null)) as { domain?: { state?: string } } | null
  const state = json?.domain?.state ?? 'unknown'
  const hints: string[] = []
  if (state !== 'active') hints.push(`The domain state is "${state}", not "active". Finish verifying it in Mailgun.`)
  if (kind === 'sandbox') hints.push('This is a sandbox domain: Mailgun only delivers to addresses listed under Authorized recipients (and each must click the confirmation link Mailgun emails them). Add the buyer email address there, or verify your own domain to send to anyone.')
  if (sender !== 'matches the domain') hints.push(`MAILGUN_FROM should use an address on ${domain}, for example Shopora <postmaster@${domain}>.`)
  if (hints.length === 0) hints.push('Key, domain and sender look right. If emails still do not arrive, open Mailgun, Sending, Logs to see why a message was rejected.')
  return { apiKey: 'valid', domain: 'found', kind, state, sender, seenDomain, seenSenderDomain, problems, hint: hints.join(' ') }
}

export type BrevoCheck = { configured: boolean; apiKey: 'valid' | 'rejected' | 'unchecked'; sender: 'verified in Brevo' | 'not a verified Brevo sender' | 'unchecked'; hint: string }

/** Read-only: lists the account's senders and confirms BREVO_FROM is one of them. Never returns the key. */
export async function checkBrevo(env: Env, fetchImpl: typeof fetch = fetch): Promise<BrevoCheck> {
  const key = env.BREVO_API_KEY
  const from = env.BREVO_FROM?.trim()
  if (!key || !from) return { configured: false, apiKey: 'unchecked', sender: 'unchecked', hint: 'Backup sender not set. Add BREVO_API_KEY and BREVO_FROM in Vercel to have Brevo send whenever Mailgun refuses an email.' }
  let res: Response
  try {
    res = await fetchImpl('https://api.brevo.com/v3/senders', { headers: { 'api-key': key, Accept: 'application/json' }, cache: 'no-store' })
  } catch {
    return { configured: true, apiKey: 'unchecked', sender: 'unchecked', hint: 'Could not reach Brevo from the server. Try again in a minute.' }
  }
  if (res.status === 401 || res.status === 403) {
    return { configured: true, apiKey: 'rejected', sender: 'unchecked', hint: 'Brevo rejected the API key. Create a new API key in Brevo (SMTP & API, API keys, it starts with xkeysib-) and update BREVO_API_KEY. If Brevo blocks unknown IPs, turn off Authorised IPs.' }
  }
  if (!res.ok) return { configured: true, apiKey: 'valid', sender: 'unchecked', hint: `Brevo answered ${res.status}. Try again shortly.` }
  const json = (await res.json().catch(() => null)) as { senders?: { email?: string; active?: boolean }[] } | null
  const address = (/<([^>]+)>/.exec(from)?.[1] ?? from).toLowerCase()
  const match = json?.senders?.find((s) => s.email?.toLowerCase() === address && s.active)
  return match
    ? { configured: true, apiKey: 'valid', sender: 'verified in Brevo', hint: 'Brevo is ready as the backup sender.' }
    : { configured: true, apiKey: 'valid', sender: 'not a verified Brevo sender', hint: `BREVO_FROM must use an address verified in Brevo (Senders, domains & dedicated IPs). ${address} is not an active sender there.` }
}
