/** The token from `Authorization: Bearer <token>`, or undefined for anything else. */
export const bearerToken = (header: string | null | undefined): string | undefined => header?.match(/^Bearer\s+(\S+)$/i)?.[1]
