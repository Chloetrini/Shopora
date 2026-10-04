import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useState } from 'react'
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native'
import { api } from '../api'
import { useAuth } from '../auth'
import { ORDER_POLL_MS } from '../config'
import { formatMoney } from '../money'
import type { RootStack } from '../navigation'
import { payOrder } from '../payment'
import { useTheme } from '../theme'
import { isPaid, STATUS_LABEL, type OrderSummary, type OrderView } from '../types'
import { Button, Center, Field, Note } from '../ui'

type Nav = NativeStackNavigationProp<RootStack>
const when = (iso: string) => new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })

export function OrdersScreen() {
  const c = useTheme()
  const nav = useNavigation<Nav>()
  const { user } = useAuth()
  const [orders, setOrders] = useState<OrderSummary[] | null>(null)
  const [error, setError] = useState('')

  useFocusEffect(useCallback(() => {
    if (!user) return
    api<{ orders: OrderSummary[] }>('/api/orders').then((b) => { setOrders(b.orders); setError('') }).catch((e) => setError(e instanceof Error ? e.message : 'Could not load your orders.'))
  }, [user]))

  if (!user) return <Center><Note text="Log in to see your orders." /><View style={{ gap: 10, width: '100%', maxWidth: 320 }}><Button label="Log in" onPress={() => nav.navigate('Login', { mode: 'login' })} /><Button label="Track an order" variant="outline" onPress={() => nav.navigate('Track')} /></View></Center>
  if (error) return <Center><Note text={error} error /></Center>
  if (!orders) return <Center><Note text="Loading your orders…" /></Center>
  if (orders.length === 0) return <Center><Note text="No orders yet. When you place one it shows up here." /><View style={{ width: '100%', maxWidth: 320 }}><Button label="Track an order" variant="outline" onPress={() => nav.navigate('Track')} /></View></Center>
  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      data={orders}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: 12, gap: 10 }}
      ListHeaderComponent={<Button label="Track an order" variant="outline" onPress={() => nav.navigate('Track')} />}
      renderItem={({ item: o }) => (
        <Pressable onPress={() => nav.navigate('Order', { id: o.id })} style={{ backgroundColor: c.surface, borderRadius: 8, borderWidth: 1, borderColor: c.border, padding: 14, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: c.foreground, fontWeight: '600' }}>Order {o.id.slice(0, 8)}</Text>
            <Text style={{ color: c.foreground, fontWeight: '600' }}>{formatMoney(o.totalCents, o.currency)}</Text>
          </View>
          <Text style={{ color: c.muted }}>{STATUS_LABEL[o.status] ?? o.status}</Text>
          <Text style={{ color: c.muted, fontSize: 12 }}>{when(o.createdAt)}, {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}</Text>
        </Pressable>
      )}
    />
  )
}

export function OrderScreen({ route }: { route: { params: RootStack['Order'] } }) {
  const c = useTheme()
  const [order, setOrder] = useState<OrderView | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const id = route.params.id

  const load = useCallback(() => api<{ order: OrderView }>(`/api/orders/${id}`).then((b) => { setOrder(b.order); setError('') }).catch((e) => setError(e instanceof Error ? e.message : 'Could not load the order.')), [id])
  // Re-read while it is open: payment confirmation and the shop's status changes show up by themselves.
  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), ORDER_POLL_MS)
    return () => clearInterval(t)
  }, [load])

  async function pay() {
    setBusy(true)
    try {
      const r = await payOrder(id)
      await load()
      if (r === 'failed') setError('The payment didn’t go through. You can try again.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the payment.')
    } finally {
      setBusy(false)
    }
  }

  if (!order) return <Center><Note text={error || 'Loading…'} error={!!error} /></Center>
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View>
        <Text style={{ color: c.muted }}>Order {order.id.slice(0, 8)}</Text>
        <Text style={{ color: c.foreground, fontSize: 24, fontWeight: '700' }}>{STATUS_LABEL[order.status] ?? order.status}</Text>
        <Text style={{ color: c.muted }}>We’ll email {order.email} as it moves.</Text>
      </View>
      {order.status === 'pending' && <Button label="Pay now" onPress={pay} busy={busy} />}
      {error ? <Note text={error} error /> : null}

      <Card title="Progress">
        {order.events.map((e, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isPaid(e.status) || i === 0 ? c.primary : c.border, marginTop: 5 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.foreground }}>{STATUS_LABEL[e.status] ?? e.status}</Text>
              <Text style={{ color: c.muted, fontSize: 12 }}>{when(e.createdAt)}{e.note ? `, ${e.note}` : ''}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Card title="Items">
        {order.items.map((i, k) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: c.foreground, flex: 1 }}>{i.quantity} × {i.name}</Text>
            <Text style={{ color: c.foreground }}>{formatMoney(i.unitPriceCents * i.quantity, order.currency)}</Text>
          </View>
        ))}
        <Line label="Subtotal" value={formatMoney(order.subtotalCents, order.currency)} />
        {order.discountCents > 0 && <Line label={`Code ${order.discountCode ?? ''}`} value={`−${formatMoney(order.discountCents, order.currency)}`} />}
        <Line label={order.deliveryZone ? `Delivery (${order.deliveryZone})` : 'Delivery'} value={order.deliveryCents === 0 ? 'Free' : formatMoney(order.deliveryCents, order.currency)} />
        <Line label="Total" value={formatMoney(order.totalCents, order.currency)} bold />
      </Card>

      <Card title="Delivering to">
        <Text style={{ color: c.foreground }}>{order.fullName}</Text>
        <Text style={{ color: c.muted }}>{order.address}</Text>
      </Card>
    </ScrollView>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useTheme()
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 8, borderWidth: 1, borderColor: c.border, padding: 14, gap: 8 }}>
      <Text style={{ color: c.foreground, fontWeight: '700' }}>{title}</Text>
      {children}
    </View>
  )
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const c = useTheme()
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: c.foreground, fontWeight: bold ? '700' : '400' }}>{label}</Text><Text style={{ color: c.foreground, fontWeight: bold ? '700' : '400' }}>{value}</Text></View>
}

/** Find an order without an account: the email it was placed with plus the order number from the confirmation email. */
export function TrackScreen() {
  const c = useTheme()
  const nav = useNavigation<Nav>()
  const [email, setEmail] = useState('')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function find() {
    setBusy(true)
    setError('')
    try {
      const { id } = await api<{ id: string }>('/api/orders/track', { method: 'POST', body: { email: email.trim(), reference: reference.trim() } })
      nav.replace('Order', { id })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: c.foreground, fontSize: 28, fontWeight: '700' }}>Track an order</Text>
      <Text style={{ color: c.muted, lineHeight: 21, marginTop: 6, marginBottom: 18 }}>No account needed. Use the email you ordered with and the order number from your confirmation email (the first 8 characters are enough).</Text>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Field label="Order number" value={reference} onChangeText={setReference} autoCapitalize="none" placeholder="e.g. 4f0ecb8e" />
      {error ? <Note text={error} error /> : null}
      <Button label="Track order" onPress={find} busy={busy} disabled={!email.trim() || reference.trim().length < 8} />
    </ScrollView>
  )
}
