import * as WebBrowser from 'expo-web-browser'
import { api } from './api'
import { API_URL } from './config'

/**
 * Opens Paystack for an order in the phone's secure browser, signed in to the website first so the pages you land on
 * afterwards show your account (not "Log in"). If the sign-in hand-off fails we still open the payment page.
 */
export async function openPayment(orderId: string, fallbackUrl?: string): Promise<void> {
  try {
    const { code } = await api<{ code: string }>('/api/auth/handoff', { method: 'POST' })
    const next = encodeURIComponent(`/api/orders/${orderId}/pay`)
    await WebBrowser.openBrowserAsync(`${API_URL}/api/auth/handoff?code=${encodeURIComponent(code)}&next=${next}`)
  } catch (e) {
    if (!fallbackUrl) throw e
    await WebBrowser.openBrowserAsync(fallbackUrl)
  }
}
