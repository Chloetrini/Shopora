import 'server-only'
import { createUser, findUserByEmail, findUserByGoogleId, linkGoogle, type UserRecord } from './db/users'

export type VerifiedGoogleProfile = { sub: string; email: string; name?: string }

/**
 * Which account does this Google sign-in belong to? The caller has already required `email_verified: true`.
 *  1. Known Google id: that account (even if the Google email changed).
 *  2. Same email as an existing account: link. If that account's email was never verified, whoever
 *     registered it by password never proved they own the address, so their password and sessions are discarded.
 *  3. Otherwise create a verified account with no password.
 */
export async function resolveGoogleUser(p: VerifiedGoogleProfile): Promise<UserRecord> {
  return (await resolveGoogleAccount(p)).user
}

/** Same, and says whether this sign-in just created the account (so the caller can send the welcome email). */
export async function resolveGoogleAccount(p: VerifiedGoogleProfile): Promise<{ user: UserRecord; created: boolean }> {
  const byGoogle = await findUserByGoogleId(p.sub)
  if (byGoogle) return { user: byGoogle, created: false }
  const email = p.email.toLowerCase()
  const byEmail = await findUserByEmail(email)
  if (byEmail) {
    if (byEmail.googleId && byEmail.googleId !== p.sub) throw new Error('This email is linked to a different Google account')
    return { user: await linkGoogle(byEmail.id, p.sub, !byEmail.emailVerified), created: false }
  }
  const user = await createUser({
    email,
    fullName: (p.name ?? '').trim().slice(0, 120) || email.split('@')[0],
    passwordHash: null,
    googleId: p.sub,
    emailVerified: true,
  })
  return { user, created: true }
}
