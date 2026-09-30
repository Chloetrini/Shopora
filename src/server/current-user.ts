import 'server-only'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { findUserById, toPublicUser, type PublicUser } from './db/users'
import { SESSION_COOKIE, unsealSession } from './session'

async function userFromCookie(sealed: string | undefined): Promise<PublicUser | null> {
  try {
    const session = await unsealSession(sealed)
    if (!session) return null
    const user = await findUserById(session.uid)
    // A bumped session_version (Google takeover of an unverified account) invalidates older cookies.
    return user && user.sessionVersion === session.v ? toPublicUser(user) : null
  } catch (e) {
    console.error('Could not read the session', e instanceof Error ? e.message : e)
    return null
  }
}

/** For server components. The tenant/user id only ever comes from the sealed cookie. */
export async function getSessionUser(): Promise<PublicUser | null> {
  return userFromCookie((await cookies()).get(SESSION_COOKIE)?.value)
}

/** For route handlers. */
export const getRequestUser = (req: NextRequest) => userFromCookie(req.cookies.get(SESSION_COOKIE)?.value)
