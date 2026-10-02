import 'server-only'
import { sql } from './client'

export type TokenKind = 'verify' | 'reset'

/** Stores the hash of a new link for this account, replacing any earlier one of the same kind. */
export async function storeToken(userId: string, kind: TokenKind, hash: string, minutes: number): Promise<void> {
  if (kind === 'verify') {
    await sql()`update users set verify_token_hash = ${hash}, verify_token_expires = now() + make_interval(mins => ${minutes}::int) where id = ${userId}`
  } else {
    await sql()`update users set reset_token_hash = ${hash}, reset_token_expires = now() + make_interval(mins => ${minutes}::int) where id = ${userId}`
  }
}

/**
 * Confirms the email behind a valid, unexpired link. The update is conditional on the hash, so a link works once
 * even if two requests race. Returns the account's email, or null for a wrong, used or expired link.
 */
export async function consumeVerifyToken(hash: string): Promise<string | null> {
  const rows = await sql()`
    update users set email_verified = true, verify_token_hash = null, verify_token_expires = null
    where verify_token_hash = ${hash} and verify_token_expires > now() returning email`
  return rows.length === 1 ? (rows[0].email as string) : null
}

/**
 * Sets the new password behind a valid reset link. Signs the account out everywhere (session_version + 1), counts as
 * proof of the address (email_verified), and clears both links. Null for a wrong, used or expired link.
 */
export async function consumeResetToken(hash: string, passwordHash: string): Promise<string | null> {
  const rows = await sql()`
    update users set password_hash = ${passwordHash}, email_verified = true, session_version = session_version + 1,
      reset_token_hash = null, reset_token_expires = null, verify_token_hash = null, verify_token_expires = null
    where reset_token_hash = ${hash} and reset_token_expires > now() returning email`
  return rows.length === 1 ? (rows[0].email as string) : null
}
