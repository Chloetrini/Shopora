/**
 * Admins are listed in ADMIN_EMAILS (comma separated). An admin must ALSO have a verified email: a password
 * sign-up is never verified, so nobody can become an admin by registering an admin's address. Admins sign in with Google.
 */
export function adminEmails(env: Record<string, string | undefined> = process.env): string[] {
  return (env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
}

export function isAdminUser(u: { email: string; emailVerified: boolean }, env: Record<string, string | undefined> = process.env): boolean {
  return u.emailVerified && adminEmails(env).includes(u.email.toLowerCase())
}
