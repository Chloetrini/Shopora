import { API_URL } from './config'

let token: string | null = null
export const setToken = (t: string | null) => { token = t }
export const getToken = () => token

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public details?: { path: string; message: string }[]) {
    super(message)
  }
}

/** One call to the shop's API. Sends the login token; throws ApiError with a readable message. */
export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-shopora-client': 'mobile', // makes login and register also return the token
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    })
  } catch {
    throw new ApiError('Could not reach the shop. Check your connection and try again.', 0)
  }
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(json?.details?.[0]?.message ?? json?.message ?? 'Something went wrong. Try again.', res.status, json?.code, json?.details)
  return json?.body as T
}

/** Product photos come back as paths on the shop's own address; others are full links. */
export const imageUri = (u: string | null | undefined) => (u ? (/^https?:/i.test(u) ? u : `${API_URL}${u}`) : null)

/** Uploads raw bytes (a product photo). The server decides the type from the bytes themselves. */
export async function apiUpload<T = unknown>(path: string, method: string, bytes: Blob): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: bytes })
  } catch {
    throw new ApiError('Could not reach the shop. Check your connection and try again.', 0)
  }
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(json?.message ?? 'Something went wrong. Try again.', res.status)
  return json?.body as T
}
