'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useDismiss } from '@/hooks/use-dismiss'
import { CATEGORIES } from '@/lib/catalog'
import { shrinkImage } from '@/lib/shrink-image'

/** Small helper: call the API, then refresh the server-rendered page. Returns the error text, or ''. */
async function send(url: string, method: string, body?: unknown, raw?: Blob): Promise<{ ok: boolean; message: string; body?: Record<string, unknown> }> {
  try {
    const res = await fetch(url, raw ? { method, body: raw } : { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    return { ok: res.ok, message: json.details?.[0]?.message ?? json.message ?? (res.ok ? 'Saved' : 'Something went wrong'), body: json.body }
  } catch {
    return { ok: false, message: 'Could not reach the server.' }
  }
}

const input = 'rounded-lg border border-border bg-background px-2 py-1.5 text-sm'
const button = 'rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60'

function Msg({ m }: { m: { ok: boolean; text: string } | null }) {
  return m ? <p role="status" className={`mt-1 w-full text-sm ${m.ok ? 'text-primary' : 'text-red-600 dark:text-red-400'}`}>{m.text}</p> : null
}

export function ProductAdminRow({ id, stock, active, hasUpload }: { id: string; stock: number; active: boolean; hasUpload: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [m, setM] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const confirmRef = useRef<HTMLSpanElement>(null)
  useDismiss(confirmRef, confirming, () => setConfirming(false))

  async function save(patch: { stock?: number; active?: boolean }) {
    setBusy(true)
    const r = await send(`/api/admin/products/${id}`, 'PATCH', patch)
    setM({ ok: r.ok, text: r.ok ? (Number(r.body?.notified) > 0 ? `Saved. ${r.body?.notified} people were emailed that it’s back.` : 'Saved') : r.message })
    setBusy(false)
    if (r.ok) router.refresh()
  }

  async function remove() {
    setBusy(true)
    const r = await send(`/api/admin/products/${id}`, 'DELETE')
    setBusy(false)
    if (r.ok) router.refresh() // the row disappears with the refreshed list
    else { setM({ ok: false, text: r.message }); setConfirming(false) }
  }

  async function upload(file: File | undefined) {
    if (!file) return
    setBusy(true)
    // Resize first so a big phone photo fits the 1.5 MB limit.
    const r = await send(`/api/admin/products/${id}/image`, 'PUT', undefined, await shrinkImage(file))
    setM({ ok: r.ok, text: r.message })
    setBusy(false)
    if (r.ok) router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); save({ stock: Number(new FormData(e.currentTarget).get('stock')) }) }}>
        <label htmlFor={`stock-${id}`} className="text-sm">Stock</label>
        <input id={`stock-${id}`} name="stock" type="number" min={0} max={100000} defaultValue={stock} className={`${input} w-24`} />
        <button type="submit" disabled={busy} className={button}>Save</button>
      </form>
      <button type="button" disabled={busy} onClick={() => save({ active: !active })} className="rounded-md border border-border px-4 py-1.5 text-sm hover:border-primary disabled:opacity-60">{active ? 'Hide from shop' : 'Show in shop'}</button>
      <label className="cursor-pointer rounded-md border border-border px-4 py-1.5 text-sm hover:border-primary">
        {hasUpload ? 'Replace photo' : 'Upload photo'}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
      </label>
      {confirming ? (
        <span ref={confirmRef} className="flex items-center gap-2 text-sm">
          Delete this product?
          <button type="button" disabled={busy} onClick={remove} className="rounded-md bg-red-600 px-4 py-1.5 font-medium text-white disabled:opacity-60">Yes, delete</button>
          <button type="button" onClick={() => setConfirming(false)} className="rounded-md border border-border px-4 py-1.5 hover:border-primary">Cancel</button>
        </span>
      ) : (
        <button type="button" disabled={busy} onClick={() => setConfirming(true)} className="rounded-md border border-red-300 px-4 py-1.5 text-sm text-red-600 hover:border-red-500 disabled:opacity-60 dark:border-red-400/40 dark:text-red-400">Delete</button>
      )}
      <Msg m={m} />
    </div>
  )
}

export function ProductForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [m, setM] = useState<{ ok: boolean; text: string } | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    const photo = f.get('photo')
    setBusy(true)
    setM(null)
    const r = await send('/api/admin/products', 'POST', {
      name: String(f.get('name') ?? ''), description: String(f.get('description') ?? ''),
      priceNaira: Number(f.get('priceNaira')), stock: Number(f.get('stock')), category: String(f.get('category') ?? ''),
    })
    if (!r.ok) {
      setM({ ok: false, text: r.message })
      setBusy(false)
      return
    }
    // The product exists now. A photo that fails to upload can be added later from its row.
    let text = 'Product added'
    if (photo instanceof File && photo.size > 0) {
      const up = await send(`/api/admin/products/${String(r.body?.id)}/image`, 'PUT', undefined, await shrinkImage(photo))
      text = up.ok ? 'Product added with its photo' : `Product added, but the photo didn’t upload: ${up.message}`
    }
    setM({ ok: true, text })
    setBusy(false)
    form.reset()
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="mb-6 grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">Add a product</h2>
      <div className="sm:col-span-2"><label htmlFor="p-name" className="block text-sm">Name</label><input id="p-name" name="name" required minLength={2} maxLength={120} className={`${input} mt-1 w-full`} /></div>
      <div><label htmlFor="p-price" className="block text-sm">Price (naira)</label><input id="p-price" name="priceNaira" type="number" required min={1} step={1} className={`${input} mt-1 w-full`} /></div>
      <div><label htmlFor="p-stock" className="block text-sm">Stock</label><input id="p-stock" name="stock" type="number" required min={0} step={1} defaultValue={10} className={`${input} mt-1 w-full`} /></div>
      <div>
        <label htmlFor="p-cat" className="block text-sm">Category</label>
        <select id="p-cat" name="category" required className={`${input} mt-1 w-full`}>
          {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
        </select>
      </div>
      <div><label htmlFor="p-photo" className="block text-sm">Photo (optional)</label><input id="p-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 w-full text-sm" /></div>
      <div className="sm:col-span-2"><label htmlFor="p-desc" className="block text-sm">Description (optional)</label><textarea id="p-desc" name="description" rows={3} maxLength={2000} className={`${input} mt-1 w-full`} /></div>
      <div className="sm:col-span-2"><button type="submit" disabled={busy} className={button}>{busy ? 'Adding…' : 'Add product'}</button></div>
      <div className="sm:col-span-2"><Msg m={m} /></div>
    </form>
  )
}

export function DiscountForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [m, setM] = useState<{ ok: boolean; text: string } | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const num = (k: string) => (String(f.get(k) ?? '').trim() === '' ? undefined : Number(f.get(k)))
    const form = e.currentTarget
    setBusy(true)
    const r = await send('/api/admin/discounts', 'POST', {
      code: String(f.get('code') ?? ''), percentOff: num('percentOff'), amountOffNaira: num('amountOffNaira'), maxUses: num('maxUses'),
      expiresAt: String(f.get('expiresAt') ?? '') || undefined,
    })
    setM({ ok: r.ok, text: r.ok ? 'Code created' : r.message })
    setBusy(false)
    if (r.ok) { form.reset(); router.refresh() }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">New discount code</h2>
      <div><label htmlFor="d-code" className="block text-sm">Code</label><input id="d-code" name="code" required maxLength={20} placeholder="WELCOME10" className={`${input} mt-1 w-full uppercase`} /></div>
      <div><label htmlFor="d-pct" className="block text-sm">Percent off (1 to 90)</label><input id="d-pct" name="percentOff" type="number" min={1} max={90} className={`${input} mt-1 w-full`} /></div>
      <div><label htmlFor="d-amt" className="block text-sm">OR amount off (naira)</label><input id="d-amt" name="amountOffNaira" type="number" min={1} className={`${input} mt-1 w-full`} /></div>
      <div><label htmlFor="d-max" className="block text-sm">Max uses (optional)</label><input id="d-max" name="maxUses" type="number" min={1} className={`${input} mt-1 w-full`} /></div>
      <div><label htmlFor="d-exp" className="block text-sm">Expires (optional)</label><input id="d-exp" name="expiresAt" type="date" className={`${input} mt-1 w-full`} /></div>
      <div className="flex items-end"><button type="submit" disabled={busy} className={button}>{busy ? 'Saving…' : 'Create code'}</button></div>
      <div className="sm:col-span-2"><Msg m={m} /></div>
    </form>
  )
}

export function DiscountToggle({ code, active }: { code: string; active: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <button type="button" disabled={busy} className="rounded-md border border-border px-4 py-1.5 text-sm hover:border-primary disabled:opacity-60"
      onClick={async () => { setBusy(true); await send(`/api/admin/discounts/${encodeURIComponent(code)}`, 'PATCH', { active: !active }); setBusy(false); router.refresh() }}>
      {active ? 'Turn off' : 'Turn on'}
    </button>
  )
}

export function ZoneForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [m, setM] = useState<{ ok: boolean; text: string } | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const form = e.currentTarget
    const free = String(f.get('freeOverNaira') ?? '').trim()
    setBusy(true)
    const r = await send('/api/admin/delivery', 'POST', {
      name: String(f.get('name') ?? ''), country: String(f.get('country') ?? ''), region: String(f.get('region') ?? '') || undefined,
      feeNaira: Number(f.get('feeNaira')), freeOverNaira: free === '' ? undefined : Number(free),
    })
    setM({ ok: r.ok, text: r.ok ? 'Zone created' : r.message })
    setBusy(false)
    if (r.ok) { form.reset(); router.refresh() }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">New delivery zone</h2>
      <div><label htmlFor="z-name" className="block text-sm">Name shown to buyers</label><input id="z-name" name="name" required maxLength={60} placeholder="Port Harcourt" className={`${input} mt-1 w-full`} /></div>
      <div><label htmlFor="z-country" className="block text-sm">Country (or * for everywhere else)</label><input id="z-country" name="country" required placeholder="Nigeria" className={`${input} mt-1 w-full`} /></div>
      <div><label htmlFor="z-region" className="block text-sm">State or region (blank = whole country)</label><input id="z-region" name="region" placeholder="Rivers" className={`${input} mt-1 w-full`} /></div>
      <div><label htmlFor="z-fee" className="block text-sm">Delivery fee (naira)</label><input id="z-fee" name="feeNaira" type="number" min={0} required className={`${input} mt-1 w-full`} /></div>
      <div><label htmlFor="z-free" className="block text-sm">Free delivery over (naira, optional)</label><input id="z-free" name="freeOverNaira" type="number" min={1} className={`${input} mt-1 w-full`} /></div>
      <div className="flex items-end"><button type="submit" disabled={busy} className={button}>{busy ? 'Saving…' : 'Add zone'}</button></div>
      <div className="sm:col-span-2"><Msg m={m} /></div>
    </form>
  )
}

export function ZoneRow({ id, feeNaira, freeOverNaira, active }: { id: string; feeNaira: number; freeOverNaira: number | null; active: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [m, setM] = useState<{ ok: boolean; text: string } | null>(null)

  async function patch(body: Record<string, unknown>) {
    setBusy(true)
    const r = await send(`/api/admin/delivery/${id}`, 'PATCH', body)
    setM({ ok: r.ok, text: r.ok ? 'Saved' : r.message })
    setBusy(false)
    if (r.ok) router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        const free = String(f.get('freeOverNaira') ?? '').trim()
        patch({ feeNaira: Number(f.get('feeNaira')), freeOverNaira: free === '' ? null : Number(free) })
      }}>
        <label htmlFor={`fee-${id}`} className="text-sm">Fee ₦</label>
        <input id={`fee-${id}`} name="feeNaira" type="number" min={0} defaultValue={feeNaira} className={`${input} w-28`} />
        <label htmlFor={`free-${id}`} className="text-sm">Free over ₦</label>
        <input id={`free-${id}`} name="freeOverNaira" type="number" min={1} defaultValue={freeOverNaira ?? ''} placeholder="never" className={`${input} w-32`} />
        <button type="submit" disabled={busy} className={button}>Save</button>
      </form>
      <button type="button" disabled={busy} onClick={() => patch({ active: !active })} className="rounded-md border border-border px-4 py-1.5 text-sm hover:border-primary disabled:opacity-60">{active ? 'Turn off' : 'Turn on'}</button>
      <Msg m={m} />
    </div>
  )
}
