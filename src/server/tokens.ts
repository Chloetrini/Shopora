import 'server-only'
import { createHash, randomBytes } from 'node:crypto'

/** 256 random bits for an emailed link. Only the hash is ever stored. */
export const newToken = () => randomBytes(32).toString('base64url')
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
