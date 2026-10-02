import 'server-only'
import { siteUrl } from '@/lib/site-url'
import { storeToken } from './db/account-tokens'
import { resetPasswordMessage, verifyEmailMessage, welcomeEmailMessage } from './email-templates'
import { sendEmail } from './email.service'
import { hashToken, newToken } from './tokens'

/*
 * Links in these emails are built from siteUrl() (APP_URL), never from the request's Host header, which a caller controls.
 * None of these functions throw: a mail problem must never undo a sign-up or reveal whether an account exists.
 */

export const VERIFY_MINUTES = 24 * 60
export const RESET_MINUTES = 30

type Person = { id: string; email: string; fullName: string }

/** A fresh confirm-email link (replacing any earlier one). True when a provider accepted the message. */
export async function sendVerification(user: Person): Promise<boolean> {
  try {
    const token = newToken()
    await storeToken(user.id, 'verify', hashToken(token), VERIFY_MINUTES)
    const result = await sendEmail({ to: user.email, ...verifyEmailMessage(user.fullName, `${siteUrl()}/verify-email?token=${token}`) })
    return result === 'sent' || result === 'logged'
  } catch (e) {
    console.error('Verification email failed', e instanceof Error ? e.message : e)
    return false
  }
}

export async function sendReset(user: Person): Promise<void> {
  try {
    const token = newToken()
    await storeToken(user.id, 'reset', hashToken(token), RESET_MINUTES)
    await sendEmail({ to: user.email, ...resetPasswordMessage(user.fullName, `${siteUrl()}/reset-password?token=${token}`) })
  } catch (e) {
    console.error('Reset email failed', e instanceof Error ? e.message : e)
  }
}

export async function sendWelcome(user: Person): Promise<void> {
  try {
    await sendEmail({ to: user.email, ...welcomeEmailMessage(user.fullName) })
  } catch (e) {
    console.error('Welcome email failed', e instanceof Error ? e.message : e)
  }
}
