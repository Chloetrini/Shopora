import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdminTabs } from '@/components/shop/admin-tabs'
import { DiscountForm, DiscountToggle } from '@/components/shop/admin-forms'
import { describeRule } from '@/lib/discount'
import { formatMoney } from '@/lib/money'
import { getSessionUser } from '@/server/current-user'
import { listDiscounts } from '@/server/db/features'

export const metadata: Metadata = { title: 'Discount codes', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function AdminDiscountsPage() {
  const user = await getSessionUser()
  if (!user?.isAdmin) notFound()
  const codes = await listDiscounts()
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Discount codes</h1>
      <p className="mb-5 mt-1 text-muted-foreground">Buyers enter a code at checkout. Delivery is never discounted, and an order can’t drop below ₦50.</p>
      <AdminTabs current="/admin/discounts" />
      <DiscountForm />
      <ul className="mt-6 space-y-3">
        {codes.length === 0 && <li className="text-muted-foreground">No codes yet.</li>}
        {codes.map((c) => {
          const expired = c.expiresAt && new Date(c.expiresAt) < new Date()
          const usedUp = c.maxUses != null && c.usedCount >= c.maxUses
          return (
            <li key={c.code} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
              <div>
                <p className="font-mono font-semibold">{c.code}</p>
                <p className="text-sm text-muted-foreground">
                  {describeRule(c, (k) => formatMoney(k))}, used {c.usedCount}{c.maxUses != null ? ` of ${c.maxUses}` : ''}
                  {c.expiresAt ? `, expires ${new Date(c.expiresAt).toLocaleDateString('en-NG', { dateStyle: 'medium', timeZone: 'UTC' })}` : ''}
                  {expired ? ' (expired)' : usedUp ? ' (used up)' : !c.active ? ' (off)' : ''}
                </p>
              </div>
              <DiscountToggle code={c.code} active={c.active} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
