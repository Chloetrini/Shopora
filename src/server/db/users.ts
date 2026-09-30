import 'server-only'
import { sql } from './client'

export type UserRecord = {
  id: string
  email: string
  fullName: string
  passwordHash: string | null
  googleId: string | null
  emailVerified: boolean
  sessionVersion: number
}
export type PublicUser = { id: string; email: string; fullName: string }

export class EmailTakenError extends Error {
  constructor() {
    super('An account with this email already exists')
  }
}


/* eslint-disable @typescript-eslint/no-explicit-any */
const map = (r: any): UserRecord => ({
  id: r.id,
  email: r.email,
  fullName: r.full_name,
  passwordHash: r.password_hash,
  googleId: r.google_id,
  emailVerified: r.email_verified,
  sessionVersion: r.session_version,
})

export const toPublicUser = (u: UserRecord): PublicUser => ({ id: u.id, email: u.email, fullName: u.fullName })

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s)

export async function findUserById(id: string): Promise<UserRecord | null> {
  if (!isUuid(id)) return null
  const rows = await sql()`select id, email, full_name, password_hash, google_id, email_verified, session_version from users where id = ${id}`
  return rows[0] ? map(rows[0]) : null
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const rows = await sql()`select id, email, full_name, password_hash, google_id, email_verified, session_version from users where email = ${email.toLowerCase()}`
  return rows[0] ? map(rows[0]) : null
}

export async function findUserByGoogleId(googleId: string): Promise<UserRecord | null> {
  const rows = await sql()`select id, email, full_name, password_hash, google_id, email_verified, session_version from users where google_id = ${googleId}`
  return rows[0] ? map(rows[0]) : null
}

export async function createUser(u: {
  email: string
  fullName: string
  passwordHash: string | null
  googleId: string | null
  emailVerified: boolean
}): Promise<UserRecord> {
  try {
    const rows = await sql()`
      insert into users (email, full_name, password_hash, google_id, email_verified)
      values (${u.email.toLowerCase()}, ${u.fullName}, ${u.passwordHash}, ${u.googleId}, ${u.emailVerified})
      returning id, email, full_name, password_hash, google_id, email_verified, session_version`
    return map(rows[0])
  } catch (e) {
    if (typeof e === 'object' && e && 'code' in e && e.code === '23505') throw new EmailTakenError()
    throw e
  }
}

/**
 * Links Google to an account. With `discardPassword` (the account's email was never verified) it also removes the
 * password and bumps session_version, so whoever registered the address by password, and any cookie they hold, is locked out.
 */
export async function linkGoogle(id: string, googleId: string, discardPassword: boolean): Promise<UserRecord> {
  const rows = await sql()`
    update users set
      google_id = ${googleId},
      email_verified = true,
      password_hash = case when ${discardPassword}::boolean then null else password_hash end,
      session_version = session_version + case when ${discardPassword}::boolean then 1 else 0 end
    where id = ${id}
    returning id, email, full_name, password_hash, google_id, email_verified, session_version`
  return map(rows[0])
}

