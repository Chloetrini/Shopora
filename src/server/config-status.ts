type Env = Record<string, string | undefined>

/** What is configured, as words. Never returns a secret or any part of one. */
export function configStatus(env: Env) {
  const secret = env.SESSION_SECRET
  const paystack = env.PAYSTACK_SECRET_KEY
  return {
    appUrl: env.APP_URL ? 'set' : 'not set (canonical links and emailed links fall back to the Vercel URL)',
    sessionSecret: secret && secret.length >= 32 ? 'ok' : 'missing or shorter than 32 characters',
    email: (env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN && env.MAILGUN_FROM) || (env.BREVO_API_KEY && env.BREVO_FROM) ? 'configured' : 'not configured',
    emailProviders: [env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN && env.MAILGUN_FROM ? 'mailgun' : null, env.BREVO_API_KEY && env.BREVO_FROM ? 'brevo (backup)' : null].filter(Boolean),
    payments: !paystack ? 'not configured' : paystack.startsWith('sk_test_') ? 'configured (test mode)' : 'configured (LIVE mode)',
    google: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? 'configured' : 'not configured',
  }
}
