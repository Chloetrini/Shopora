import * as WebBrowser from 'expo-web-browser'
import { api } from './api'
import { API_URL } from './config'

/**
 * Opens a page of the website in the phone's secure browser, signed in as the person using the app. The browser has
 * no cookie of its own, so we first trade our login token for a 60-second hand-off link that sets one.
 * Returns false if the hand-off failed (the caller can then open the page signed out).
 */
export async function openSignedIn(path: string): Promise<boolean> {
  try {
    const { code } = await api<{ code: string }>('/api/auth/handoff', { method: 'POST' })
    await WebBrowser.openBrowserAsync(`${API_URL}/api/auth/handoff?code=${encodeURIComponent(code)}&next=${encodeURIComponent(path)}`)
    return true
  } catch {
    return false
  }
}

/**
 * Opens Paystack for an order, signed in to the website first so the pages you land on afterwards show your account
 * (not "Log in"). If the hand-off fails we still open the payment page.
 */
export async function openPayment(orderId: string, fallbackUrl?: string): Promise<void> {
  if (await openSignedIn(`/api/orders/${orderId}/pay`)) return
  if (!fallbackUrl) throw new Error('Could not start the payment. Try again.')
  await WebBrowser.openBrowserAsync(fallbackUrl)
}
