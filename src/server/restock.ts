import 'server-only'
import { takeStockAlerts } from './db/features'
import { backInStockEmail } from './email-templates'
import { sendEmail } from './email.service'

/** Emails everyone waiting on a product that has just come back into stock. Never throws. */
export async function notifyBackInStock(p: { productId: string; slug: string; name: string }): Promise<number> {
  try {
    const emails = await takeStockAlerts(p.productId)
    let sent = 0
    for (const to of emails) {
      try {
        await sendEmail({ to, ...backInStockEmail(p.name, p.slug) })
        sent++
      } catch (e) {
        console.error('Back in stock email failed', e instanceof Error ? e.message : e)
      }
    }
    return sent
  } catch (e) {
    console.error('notifyBackInStock failed', e instanceof Error ? e.message : e)
    return 0
  }
}
