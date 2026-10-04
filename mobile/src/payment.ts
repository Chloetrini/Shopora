import * as Linking from 'expo-linking'
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

export type PaymentResult = 'paid' | 'failed' | 'checking' | 'cancelled'

/**
 * Pays an order on Paystack's page (card details are only ever typed on Paystack's own secure page). The page opens in
 * the phone's secure sheet over the app, and when the payment is done the website sends the phone straight back into
 * the app, which closes the sheet, so the buyer never lands on a website page and the app shows its own order screen.
 */
export async function payOrder(orderId: string): Promise<PaymentResult> {
  const back = Linking.createURL('paid') // shopora://paid in the installed app, an exp:// link in Expo Go
  const { paymentUrl } = await api<{ paymentUrl: string }>(`/api/orders/${orderId}/pay`, { method: 'POST', body: { appReturn: back } })
  const result = await WebBrowser.openAuthSessionAsync(paymentUrl, back)
  if (result.type !== 'success') return 'cancelled'
  const status = Linking.parse(result.url).queryParams?.status
  return status === 'paid' || status === 'failed' || status === 'checking' ? status : 'checking'
}
