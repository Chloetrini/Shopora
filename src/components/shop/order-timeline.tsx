import { Check } from 'lucide-react'
import { STATUS_LABEL, TRACK_STEPS, stepIndex, type OrderStatus } from '@/lib/order-status'

type Event = { status: OrderStatus; note: string | null; createdAt: string }

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'

/** Where an order is, step by step, plus the log of what happened and when. */
export function OrderTimeline({ status, events }: { status: OrderStatus; events: Event[] }) {
  if (status === 'cancelled') {
    return <p className="rounded-lg border border-border bg-surface p-4 text-sm">This order was cancelled. If you paid, a refund will be arranged and you will be emailed.</p>
  }
  const current = stepIndex(status) ?? -1
  const at = (s: OrderStatus) => events.find((e) => e.status === s)
  return (
    <div>
      <ol className="space-y-0" aria-label="Order progress">
        {TRACK_STEPS.map((step, i) => {
          const done = i <= current
          const ev = at(step.status)
          return (
            <li key={step.status} className="relative flex gap-3 pb-6 last:pb-0" aria-current={i === current ? 'step' : undefined}>
              {i < TRACK_STEPS.length - 1 && <span className={`absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-0.5 ${i < current ? 'bg-primary' : 'bg-border'}`} aria-hidden />}
              <span className={`relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 ${done ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-muted-foreground'}`}>
                {done ? <Check className="size-4" aria-hidden /> : <span className="size-2 rounded-full bg-border" />}
              </span>
              <div>
                <p className={`font-medium ${done ? '' : 'text-muted-foreground'}`}>{step.label}</p>
                <p className="text-sm text-muted-foreground">{ev ? when(ev.createdAt) : i === current + 1 ? 'Next' : step.hint}</p>
                {ev?.note && <p className="mt-1 text-sm">{ev.note}</p>}
              </div>
            </li>
          )
        })}
      </ol>
      {current < 0 && <p className="mt-4 text-sm text-muted-foreground">{STATUS_LABEL[status]}. Tracking starts once payment is received.</p>}
    </div>
  )
}
