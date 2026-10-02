import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { api, ApiError, apiUpload } from '../api'
import { useAuth } from '../auth'
import { formatMoney } from '../money'
import type { RootStack } from '../navigation'
import { useTheme } from '../theme'
import { STATUS_LABEL, type AdminOrder, type AdminProduct, type DiscountRow } from '../types'
import { Button, Center, Field, Note, Photo } from '../ui'

type Tab = 'orders' | 'products' | 'codes'
const CATEGORIES = ['bags', 'accessories', 'tech', 'home', 'stationery', 'outdoors', 'clothing']
const msg = (e: unknown) => (e instanceof ApiError ? `${e.message} (${e.status || 'no connection'})` : e instanceof Error ? e.message : 'Something went wrong. Try again.')

export function AdminScreen() {
  const c = useTheme()
  const [tab, setTab] = useState<Tab>('orders')
  const { user } = useAuth()
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Text style={{ color: c.muted, textAlign: 'center', paddingTop: 8, fontSize: 12 }}>
        Signed in as {user?.email ?? 'nobody'}{user?.isAdmin ? ' (admin)' : ' (not an admin)'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
        {(['orders', 'products', 'codes'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: 'center', borderWidth: 1, borderColor: tab === t ? c.primary : c.border, backgroundColor: tab === t ? c.primary : c.surface }}>
            <Text style={{ color: tab === t ? c.primaryForeground : c.foreground, fontWeight: '600', textTransform: 'capitalize' }}>{t === 'codes' ? 'Discounts' : t}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'orders' ? <AdminOrders /> : tab === 'products' ? <AdminProducts /> : <AdminCodes />}
    </View>
  )
}

/** One shared way to load a list from the admin API and reload it after a change. */
function useAdminList<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    try {
      setData(await api<T>(path))
      setError('')
    } catch (e) {
      setError(msg(e))
    }
  }, [path])
  useFocusEffect(useCallback(() => { void reload() }, [reload]))
  return { data, error, reload }
}

function Card({ children }: { children: React.ReactNode }) {
  const c = useTheme()
  return <View style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 12, gap: 8 }}>{children}</View>
}

function AdminOrders() {
  const c = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>()
  const { data, error, reload } = useAdminList<{ orders: AdminOrder[]; unsent: number }>('/api/admin/orders')
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')

  async function move(id: string, status: string) {
    setBusy(id + status)
    setNote('')
    try {
      await api(`/api/admin/orders/${id}/status`, { method: 'POST', body: { status } })
      await reload()
    } catch (e) {
      setNote(msg(e))
    }
    setBusy('')
  }
  async function resend(id: string) {
    setBusy(id + 'mail')
    try {
      await api(`/api/admin/orders/${id}/resend`, { method: 'POST' })
      setNote('Confirmation email sent.')
    } catch (e) {
      setNote(msg(e))
    }
    setBusy('')
  }
  async function resendMissing() {
    setBusy('missing')
    try {
      await api('/api/admin/orders/resend-missing', { method: 'POST' })
      setNote('Missing emails sent.')
      await reload()
    } catch (e) {
      setNote(msg(e))
    }
    setBusy('')
  }

  if (!data) return <Center><Note text={error || 'Loading orders…'} error={!!error} />{error ? <Button label="Try again" variant="outline" onPress={reload} /> : null}</Center>
  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }}>
      {note ? <Note text={note} /> : null}
      {data.unsent > 0 && <Button label={`Send ${data.unsent} missing confirmation emails`} variant="outline" onPress={resendMissing} busy={busy === 'missing'} />}
      {data.orders.length === 0 && <Note text="No orders yet." />}
      {data.orders.map((o) => (
        <Card key={o.id}>
          <Pressable onPress={() => nav.navigate('Order', { id: o.id })} style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: c.foreground, fontWeight: '700' }}>Order {o.id.slice(0, 8)}</Text>
              <Text style={{ color: c.foreground, fontWeight: '600' }}>{formatMoney(o.totalCents, o.currency)}</Text>
            </View>
            <Text style={{ color: c.muted }}>{o.fullName}, {o.email}</Text>
            <Text style={{ color: c.primary, fontWeight: '600' }}>{STATUS_LABEL[o.status] ?? o.status}</Text>
            {o.refundNeeded && <Text style={{ color: c.danger, fontWeight: '600' }}>Paid after cancel: refund needed</Text>}
          </Pressable>
          {o.next.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {o.next.map((s) => (
                <Button key={s} label={s === 'cancelled' ? 'Cancel order' : `Mark ${(STATUS_LABEL[s] ?? s).toLowerCase()}`} variant={s === 'cancelled' ? 'outline' : 'primary'}
                  busy={busy === o.id + s}
                  onPress={() => (s === 'cancelled' ? Alert.alert('Cancel this order?', 'The buyer is emailed.', [{ text: 'Keep it' }, { text: 'Cancel order', style: 'destructive', onPress: () => move(o.id, s) }]) : move(o.id, s))}
                  style={{ minHeight: 38, paddingHorizontal: 14 }} />
              ))}
            </View>
          )}
          {o.status !== 'pending' && o.status !== 'cancelled' && <Text onPress={() => resend(o.id)} style={{ color: c.primary }}>{busy === o.id + 'mail' ? 'Sending…' : 'Resend confirmation email'}</Text>}
        </Card>
      ))}
    </ScrollView>
  )
}

/** Opens the gallery, shrinks the picture to at most 1400 px as a JPEG, and uploads it for a product. */
async function pickAndUpload(productId: string): Promise<void> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) throw new Error('Allow photo access in your phone settings to add pictures.')
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
  if (picked.canceled || !picked.assets[0]) return
  const asset = picked.assets[0]
  const resize = asset.width >= asset.height ? { width: Math.min(1400, asset.width) } : { height: Math.min(1400, asset.height) }
  const out = await ImageManipulator.manipulateAsync(asset.uri, [{ resize }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG })
  const blob = await (await fetch(out.uri)).blob()
  await apiUpload(`/api/admin/products/${productId}/image`, 'PUT', blob)
}

function AdminProducts() {
  const c = useTheme()
  const { data, error, reload } = useAdminList<{ products: AdminProduct[] }>('/api/admin/products')
  const [adding, setAdding] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [stock, setStock] = useState<Record<string, string>>({})
  const [f, setF] = useState({ name: '', priceNaira: '', stock: '10', category: 'bags', description: '' })

  async function run(key: string, job: () => Promise<unknown>, done: string) {
    setBusy(key)
    setNote('')
    try {
      await job()
      setNote(done)
      await reload()
    } catch (e) {
      setNote(msg(e))
    }
    setBusy('')
  }

  if (!data) return <Center><Note text={error || 'Loading products…'} error={!!error} />{error ? <Button label="Try again" variant="outline" onPress={reload} /> : null}</Center>
  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} keyboardShouldPersistTaps="handled">
      {note ? <Note text={note} /> : null}
      <Button label={adding ? 'Close' : 'Add a product'} variant={adding ? 'outline' : 'primary'} onPress={() => setAdding(!adding)} />
      {adding && (
        <Card>
          <Field label="Name" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
          <Field label="Price (naira)" value={f.priceNaira} onChangeText={(v) => setF({ ...f, priceNaira: v.replace(/\D/g, '') })} keyboardType="number-pad" />
          <Field label="Stock" value={f.stock} onChangeText={(v) => setF({ ...f, stock: v.replace(/\D/g, '') })} keyboardType="number-pad" />
          <Text style={{ color: c.foreground, fontSize: 13 }}>Category</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.map((cat) => (
              <Pressable key={cat} onPress={() => setF({ ...f, category: cat })} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: f.category === cat ? c.primary : c.border, backgroundColor: f.category === cat ? c.primary : c.surface }}>
                <Text style={{ color: f.category === cat ? c.primaryForeground : c.foreground, textTransform: 'capitalize' }}>{cat}</Text>
              </Pressable>
            ))}
          </View>
          <Field label="Description (optional)" value={f.description} onChangeText={(v) => setF({ ...f, description: v })} multiline />
          <Button label="Add product" busy={busy === 'add'} onPress={() => run('add', async () => {
            await api('/api/admin/products', { method: 'POST', body: { name: f.name, description: f.description, priceNaira: Number(f.priceNaira), stock: Number(f.stock), category: f.category } })
            setF({ name: '', priceNaira: '', stock: '10', category: 'bags', description: '' })
            setAdding(false)
          }, 'Product added. Add its photo from the list below.')} />
        </Card>
      )}
      {data.products.map((p) => (
        <Card key={p.id}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Photo uri={p.imageUrl} style={{ width: 64, height: 64, borderRadius: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.foreground, fontWeight: '600' }}>{p.name}</Text>
              <Text style={{ color: c.muted }}>{formatMoney(p.priceCents, p.currency)}{p.active ? '' : ', hidden'}{p.stock === 0 ? ', sold out' : ''}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <View style={{ width: 90 }}><Field label="Stock" value={stock[p.id] ?? String(p.stock)} onChangeText={(v) => setStock({ ...stock, [p.id]: v.replace(/\D/g, '') })} keyboardType="number-pad" /></View>
            <Button label="Save stock" variant="outline" busy={busy === p.id + 'stock'} style={{ marginBottom: 12, minHeight: 42 }}
              onPress={() => run(p.id + 'stock', () => api(`/api/admin/products/${p.id}`, { method: 'PATCH', body: { stock: Number(stock[p.id] ?? p.stock) } }), 'Stock saved.')} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label={p.active ? 'Hide from shop' : 'Show in shop'} variant="outline" style={{ flex: 1, minHeight: 42 }} busy={busy === p.id + 'vis'}
              onPress={() => run(p.id + 'vis', () => api(`/api/admin/products/${p.id}`, { method: 'PATCH', body: { active: !p.active } }), p.active ? 'Hidden from the shop.' : 'Now showing in the shop.')} />
            <Button label={p.hasUploadedImage ? 'Replace photo' : 'Upload photo'} variant="outline" style={{ flex: 1, minHeight: 42 }} busy={busy === p.id + 'img'}
              onPress={() => run(p.id + 'img', () => pickAndUpload(p.id), 'Photo saved.')} />
          </View>
          <Text onPress={() => Alert.alert(`Delete ${p.name}?`, 'It disappears from the shop and from this list. A product that is in past orders is archived instead of erased, so those orders stay intact.', [
            { text: 'Keep it' },
            { text: 'Delete', style: 'destructive', onPress: () => run(p.id + 'del', async () => { await api(`/api/admin/products/${p.id}`, { method: 'DELETE' }) }, 'Product deleted.') },
          ])} style={{ color: c.danger, textAlign: 'center', paddingVertical: 4 }}>{busy === p.id + 'del' ? 'Deleting…' : 'Delete product'}</Text>
        </Card>
      ))}
    </ScrollView>
  )
}

function AdminCodes() {
  const c = useTheme()
  const { data, error, reload } = useAdminList<{ codes: DiscountRow[] }>('/api/admin/discounts')
  const [f, setF] = useState({ code: '', percent: '', amount: '', max: '' })
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')

  async function create() {
    setBusy('new')
    setNote('')
    try {
      await api('/api/admin/discounts', { method: 'POST', body: {
        code: f.code, percentOff: f.percent ? Number(f.percent) : undefined, amountOffNaira: f.amount ? Number(f.amount) : undefined, maxUses: f.max ? Number(f.max) : undefined,
      } })
      setF({ code: '', percent: '', amount: '', max: '' })
      setNote('Code created.')
      await reload()
    } catch (e) {
      setNote(msg(e))
    }
    setBusy('')
  }
  async function toggle(code: string, active: boolean) {
    setBusy(code)
    try {
      await api(`/api/admin/discounts/${encodeURIComponent(code)}`, { method: 'PATCH', body: { active } })
      await reload()
    } catch (e) {
      setNote(msg(e))
    }
    setBusy('')
  }

  if (!data) return <Center><Note text={error || 'Loading codes…'} error={!!error} />{error ? <Button label="Try again" variant="outline" onPress={reload} /> : null}</Center>
  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={{ color: c.foreground, fontWeight: '700' }}>New discount code</Text>
        <Field label="Code" value={f.code} onChangeText={(v) => setF({ ...f, code: v.toUpperCase() })} autoCapitalize="characters" placeholder="WELCOME10" />
        <Field label="Percent off (1 to 90)" value={f.percent} onChangeText={(v) => setF({ ...f, percent: v.replace(/\D/g, ''), amount: '' })} keyboardType="number-pad" />
        <Field label="OR amount off (naira)" value={f.amount} onChangeText={(v) => setF({ ...f, amount: v.replace(/\D/g, ''), percent: '' })} keyboardType="number-pad" />
        <Field label="Max uses (optional)" value={f.max} onChangeText={(v) => setF({ ...f, max: v.replace(/\D/g, '') })} keyboardType="number-pad" />
        {note ? <Note text={note} /> : null}
        <Button label="Create code" onPress={create} busy={busy === 'new'} />
      </Card>
      {data.codes.map((d) => (
        <Card key={d.code}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: c.foreground, fontWeight: '700' }}>{d.code}</Text>
              <Text style={{ color: c.muted }}>{d.percentOff ? `${d.percentOff}% off` : `${formatMoney(d.amountOffCents ?? 0)} off`}, used {d.usedCount}{d.maxUses ? ` of ${d.maxUses}` : ''}</Text>
            </View>
            <Button label={d.active ? 'Turn off' : 'Turn on'} variant="outline" busy={busy === d.code} onPress={() => toggle(d.code, !d.active)} style={{ minHeight: 38 }} />
          </View>
        </Card>
      ))}
    </ScrollView>
  )
}
