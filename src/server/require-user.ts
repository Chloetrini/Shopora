import 'server-only'
import type { NextRequest } from 'next/server'
import { getRequestUser } from './current-user'
import { fail } from './http'

/** The signed-in user (id from the session cookie only) or a 401 response. */
export async function requireUser(req: NextRequest) {
  const user = await getRequestUser(req)
  return user ? { user } : { res: fail('Please log in first', 401) }
}

/** Admins only; everyone else gets a 404 so the route doesn't confirm it exists. */
export async function requireAdmin(req: NextRequest) {
  const user = await getRequestUser(req)
  return user?.isAdmin ? { user } : { res: fail('Not found', 404) }
}
