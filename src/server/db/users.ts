import 'server-only'
import { isAdminUser } from '../admin'
import { sql } from './client'

export type UserRecord = {
  id: string
  email: string
  fullName: string
  passwordHash: string | null
  googleId: string | null
  emailVerified: boolean
  sessionVersion: number
  phone: string | null
  /** When the photo last changed (epoch ms), or null when there is none. Never the picture itself. */
  avatarV: number | null
}
export type PublicUser = {
  id: string; email: string; fullName: string; isAdmin: boolean; emailVerified: boolean
  phone: string | null; avatarUrl: string | null
  /** False for a Google-only account, which may add a password but has none to type. */
  hasPassword: boolean; googleLinked: boolean
}

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
  phone: r.phone ?? null,
  avatarV: r.avatar_v ? Number(r.avatar_v) : null,
})

export const toPublicUser = (u: UserRecord): PublicUser => ({
  id: u.id, email: u.email, fullName: u.fullName, isAdmin: isAdminUser(u), emailVerified: u.emailVerified,
  phone: u.phone, avatarUrl: u.avatarV ? `/api/users/me/avatar?v=${u.avatarV}` : null,
  hasPassword: !!u.passwordHash, googleLinked: !!u.googleId,
})

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s)

export async function findUserById(id: string): Promise<UserRecord | null> {
  if (!isUuid(id)) return null
  const rows = await sql()`select id, email, full_name, password_hash, google_id, email_verified, session_version, phone, (extract(epoch from avatar_updated_at) * 1000)::bigint as avatar_v from users where id = ${id}`
  return rows[0] ? map(rows[0]) : null
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const rows = await sql()`select id, email, full_name, password_hash, google_id, email_verified, session_version, phone, (extract(epoch from avatar_updated_at) * 1000)::bigint as avatar_v from users where email = ${email.toLowerCase()}`
  return rows[0] ? map(rows[0]) : null
}

export async function findUserByGoogleId(googleId: string): Promise<UserRecord | null> {
  const rows = await sql()`select id, email, full_name, password_hash, google_id, email_verified, session_version, phone, (extract(epoch from avatar_updated_at) * 1000)::bigint as avatar_v from users where google_id = ${googleId}`
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
      returning id, email, full_name, password_hash, google_id, email_verified, session_version, phone, (extract(epoch from avatar_updated_at) * 1000)::bigint as avatar_v`
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
    returning id, email, full_name, password_hash, google_id, email_verified, session_version, phone, (extract(epoch from avatar_updated_at) * 1000)::bigint as avatar_v`
  return map(rows[0])
}



/* ---------- Profile (tenant-owned: always the session's user id) ---------- */

export async function updateProfile(id: string, patch: { fullName?: string; phone?: string | null }): Promise<UserRecord | null> {
  const rows = await sql()`
    update users set
      full_name = case when ${patch.fullName !== undefined}::boolean then ${patch.fullName ?? ''} else full_name end,
      phone = case when ${patch.phone !== undefined}::boolean then ${patch.phone ?? null} else phone end
    where id = ${id}
    returning id, email, full_name, password_hash, google_id, email_verified, session_version, phone, (extract(epoch from avatar_updated_at) * 1000)::bigint as avatar_v`
  return rows[0] ? map(rows[0]) : null
}

export async function saveAvatar(id: string, b64: string, type: string): Promise<void> {
  await sql()`update users set avatar_b64 = ${b64}, avatar_type = ${type}, avatar_updated_at = now() where id = ${id}`
}

export async function clearAvatar(id: string): Promise<void> {
  await sql()`update users set avatar_b64 = null, avatar_type = null, avatar_updated_at = null where id = ${id}`
}

export async function loadAvatar(id: string): Promise<{ bytes: Buffer; type: string } | null> {
  const rows = await sql()`select avatar_b64, avatar_type from users where id = ${id} and avatar_b64 is not null`
  return rows[0] ? { bytes: Buffer.from(rows[0].avatar_b64 as string, 'base64'), type: rows[0].avatar_type as string } : null
}

/** Sets a password. Bumps session_version (every other device is signed out) and cancels any unused reset link. Returns the new version. */
export async function changePassword(id: string, passwordHash: string): Promise<number> {
  const rows = await sql()`
    update users set password_hash = ${passwordHash}, session_version = session_version + 1, reset_token_hash = null, reset_token_expires = null
    where id = ${id} returning session_version`
  return rows[0].session_version as number
}

/** Deletes the account. The cart, wishlist and saved addresses go with it (cascade); past orders stay as records of the sale. */
export async function deleteUser(id: string): Promise<void> {
  await sql()`delete from users where id = ${id}`
}

/**
 * Someone registers an email that already has an account which never confirmed its address (and has no Google link). Whoever made that
 * account never proved they own the address, so the new sign-up takes it over: new name and password, old sessions ended. Null if the account
 * is confirmed or linked to Google (those are never touched).
 */
export async function reclaimUnverified(email: string, fullName: string, passwordHash: string): Promise<UserRecord | null> {
  const rows = await sql()`
    update users set full_name = ${fullName}, password_hash = ${passwordHash}, session_version = session_version + 1
    where email = ${email.toLowerCase()} and email_verified = false and google_id is null
    returning id, email, full_name, password_hash, google_id, email_verified, session_version, phone, (extract(epoch from avatar_updated_at) * 1000)::bigint as avatar_v`
  return rows[0] ? map(rows[0]) : null
}
