import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'
import { api, ApiError } from './api'
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

type NativeGoogle = typeof import('@react-native-google-signin/google-signin')

/** Google's own sign-in library is native code. It only exists in the installed Android app, not in Expo Go. */
function nativeModule(): NativeGoogle | null {
  if (Platform.OS !== 'android') return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin') as NativeGoogle
  } catch {
    return null
  }
}

/**
 * Android: Google's account sheet slides up over the app, the person taps their account, and Google hands back an ID
 * token that the server verifies. Returns null when this phone's app doesn't have the native piece (Expo Go, an older
 * install), so the caller can use the browser sign-in instead. Throws if the person closes the sheet.
 */
export async function nativeGoogleSignIn(): Promise<{ idToken: string } | null> {
  const mod = nativeModule()
  if (!mod) return null
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = mod
  try {
    const { clientId } = await api<{ clientId: string }>('/api/auth/google/native')
    GoogleSignin.configure({ webClientId: clientId })
    await GoogleSignin.hasPlayServices()
    // Always show the account list (not the last account silently), like the website's "select account".
    await GoogleSignin.signOut().catch(() => {})
    const res = await GoogleSignin.signIn()
    if (!isSuccessResponse(res) || !res.data.idToken) throw new ApiError(MESSAGES.google_cancelled, 0)
    return { idToken: res.data.idToken }
  } catch (e) {
    if (e instanceof ApiError) throw e
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) throw new ApiError(MESSAGES.google_cancelled, 0)
    // Anything else (no Play services, the Android client isn't set up yet): use the browser sign-in instead.
    return null
  }
}
