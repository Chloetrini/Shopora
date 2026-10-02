import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { ApiError } from './api'
import { API_URL } from './config'

const MESSAGES: Record<string, string> = {
  google_cancelled: 'Google sign-in was cancelled.',
  google_unverified: 'Google says that email address isn’t verified, so we can’t use it.',
  google_unavailable: 'Google sign-in isn’t available right now. Use your email and password.',
  too_many_attempts: 'Too many attempts. Try again in a few minutes.',
}

/**
 * Runs the website's Google sign-in in the phone's secure browser sheet. We keep a secret `verifier` on the phone and
 * send only its hash; Google's result comes back as a one-time code that is worthless without the verifier.
 */
export async function googleSignIn(): Promise<{ code: string; verifier: string }> {
  const verifier = [...Crypto.getRandomBytes(32)].map((b) => b.toString(16).padStart(2, '0')).join('')
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 })
  const challenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const redirect = Linking.createURL('google')

  const start = `${API_URL}/api/auth/google?app_redirect=${encodeURIComponent(redirect)}&app_challenge=${challenge}`
  const result = await WebBrowser.openAuthSessionAsync(start, redirect)
  if (result.type !== 'success') throw new ApiError(MESSAGES.google_cancelled, 0)

  const params = Linking.parse(result.url).queryParams ?? {}
  const error = typeof params.error === 'string' ? params.error : null
  if (error) throw new ApiError(MESSAGES[error] ?? 'Google sign-in didn’t work. Try again.', 0)
  if (typeof params.code !== 'string') throw new ApiError('Google sign-in didn’t work. Try again.', 0)
  return { code: params.code, verifier }
}
