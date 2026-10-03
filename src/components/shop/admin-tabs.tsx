import Link from 'next/link'

const TABS = [
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/discounts', label: 'Discount codes' },
  { href: '/admin/delivery', label: 'Delivery' },
]

export function AdminTabs({ current }: { current: string }) {
  return (
    <nav aria-label="Admin" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.href === current ? 'page' : undefined}
          className={`shrink-0 rounded-md border px-4 py-1.5 text-sm ${t.href === current ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface hover:border-primary'}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
