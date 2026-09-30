import 'server-only'
import bcrypt from 'bcryptjs'

const COST = 12
export const hashPassword = (password: string) => bcrypt.hash(password, COST)

let dummy: Promise<string> | undefined

/**
 * Checks a password. When there is no hash (unknown email, or a Google-only account) it still runs a full
 * bcrypt compare against a dummy, so response time doesn't reveal which emails have accounts.
 */
export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (!hash) {
    dummy ??= bcrypt.hash('dummy-password-for-timing', COST)
    await bcrypt.compare(password, await dummy)
    return false
  }
  return bcrypt.compare(password, hash)
}
