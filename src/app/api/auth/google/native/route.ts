import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { sendWelcome } from '@/server/account-email'
import { claimGuestOrders } from '@/server/db/orders'
import { toPublicUser } from '@/server/db/users'
import { googleConfigured, verifyGoogleIdToken } from '@/server/google'
import { resolveGoogleAccount } from '@/server/google-account'
import { fail, ok, parseJson, tooMany } from '@/server/http'
import { allow, AUTH_LIMIT, clientIp } from '@/server/rate-limit'
import { sealSession } from '@/server/session'

const bodySchema = z.object({ idToken: z.string().min(20).max(4000) }).strict()

/** The web client id is public; the phone app asks for it so it never has to be copied into the app. */
export async function GET() {
  if (!googleConfigured()) return fail('Google sign-in isn’t available right now.', 503)
  return ok('Google client', { clientId: process.env.GOOGLE_CLIENT_ID })
}

/** Phone app, Android: Google's own account sheet gives the app an ID token; we verify it and sign the person in. */
export async function POST(req: NextRequest) {
  if (!googleConfigured()) return fail('Google sign-in isn’t available right now. Use your email and password.', 503)
  if (!allow(`google-native:${clientIp(req)}`, AUTH_LIMIT.limit, AUTH_LIMIT.windowMs)) return tooMany()
  const parsed = await parseJson(req, bodySchema)
  if ('res' in parsed) return parsed.res
  try {
    const profile = await verifyGoogleIdToken(parsed.data.idToken)
    // Only a verified Google email is trusted, exactly as on the website.
    if (!profile.email_verified) return fail('Google says that email address isn’t verified, so we can’t use it.', 403)
    const { user, created } = await resolveGoogleAccount(profile)
    if (created) await sendWelcome(user)
    await claimGuestOrders(user.id, user.email).catch((e) => console.error('claimGuestOrders failed', e))
    return ok('Logged in', { user: toPublicUser(user), token: await sealSession({ uid: user.id, v: user.sessionVersion }), created })
  } catch (e) {
    console.error('google native sign-in failed', e instanceof Error ? e.message : e)
    return fail('That sign-in didn’t work. Try again.', 401)
  }
}
