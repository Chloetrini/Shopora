import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { api, ApiError } from '../api'
import { useAuth } from '../auth'
import { useCart } from '../cart'
import { formatMoney } from '../money'
import type { RootStack } from '../navigation'
import { useTheme } from '../theme'
import type { Address } from '../types'
import { Button, Center, Field, Note } from '../ui'

type Form = { fullName: string; email: string; addressLine1: string; addressLine2: string; city: string; region: string; postalCode: string; country: string }

export function CheckoutScreen() {
  const c = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>()
  const { user } = useAuth()
  const cart = useCart()
  const [f, setF] = useState<Form>({ fullName: user?.fullName ?? '', email: user?.email ?? '', addressLine1: '', addressLine2: '', city: '', region: '', postalCode: '', country: 'Nigeria' })
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState<{ code: string; percentOff: number | null; amountOffCents: number | null } | null>(null)
  const [codeMsg, setCodeMsg] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  // Start from the saved default address, if there is one.
  useEffect(() => {
    api<{ addresses: Address[] }>('/api/addresses').then(({ addresses }) => {
      const a = addresses.find((x) => x.isDefault) ?? addresses[0]
      if (a) setF((p) => ({ ...p, fullName: a.fullName, addressLine1: a.addressLine1, addressLine2: a.addressLine2, city: a.city, region: a.region, postalCode: a.postalCode, country: a.country }))
    }).catch(() => {})
  }, [])

  const set = (k: keyof Form) => (v: string) => setF((p) => ({ ...p, [k]: v }))

  if (cart.items.length === 0) return <Center><Note text="Your cart is empty." /></Center>

  async function applyCode() {
    setCodeMsg('')
    try {
      setApplied(await api('/api/discounts/check', { method: 'POST', body: { code } }))
    } catch (e) {
      setApplied(null)
      setCodeMsg(e instanceof Error ? e.message : 'That code isn’t valid.')
    }
  }

  async function submit() {
    setBusy(true)
    setErrors({})
    setFormError('')
    try {
      const { id, paymentUrl } = await api<{ id: string; paymentUrl: string | null }>('/api/orders', {
        method: 'POST',
        body: {
          items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          ...f,
          discountCode: applied?.code,
          saveAddress: true,
        },
      })
      void cart.refresh() // the server emptied the cart when the order was placed
      nav.replace('Order', { id })
      if (paymentUrl) await WebBrowser.openBrowserAsync(paymentUrl) // pay on Paystack's page; the order screen picks up the result
    } catch (e) {
      if (e instanceof ApiError && e.details) setErrors(Object.fromEntries(e.details.map((d) => [d.path, d.message])))
      setFormError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const subtotal = cart.totalCents
  const off = applied ? (applied.percentOff ? Math.round((subtotal * applied.percentOff) / 100) : Math.min(subtotal, applied.amountOffCents ?? 0)) : 0
  const currency = cart.items[0].currency
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Field label="Full name" value={f.fullName} onChangeText={set('fullName')} error={errors.fullName} autoComplete="name" />
      <Field label="Email" value={f.email} onChangeText={set('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Field label="Address" value={f.addressLine1} onChangeText={set('addressLine1')} error={errors.addressLine1} />
      <Field label="Apartment, suite (optional)" value={f.addressLine2} onChangeText={set('addressLine2')} />
      <Field label="City" value={f.city} onChangeText={set('city')} error={errors.city} />
      <Field label="State or region (optional)" value={f.region} onChangeText={set('region')} />
      <Field label="Postal code" value={f.postalCode} onChangeText={set('postalCode')} error={errors.postalCode} />
      <Field label="Country" value={f.country} onChangeText={set('country')} error={errors.country} />

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}><Field label="Discount code (optional)" value={code} onChangeText={(v) => { setCode(v); setApplied(null) }} autoCapitalize="characters" error={codeMsg} /></View>
        <Button label="Apply" variant="outline" onPress={applyCode} disabled={!code.trim()} style={{ marginBottom: 12 }} />
      </View>

      <View style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14, gap: 6, marginVertical: 8 }}>
        <Row label="Subtotal" value={formatMoney(subtotal, currency)} />
        {applied && <Row label={`Code ${applied.code}`} value={`−${formatMoney(off, currency)}`} />}
        <Text style={{ color: c.muted, fontSize: 12 }}>Delivery to your location is added when the order is placed; the exact total is shown on the next screen.</Text>
      </View>

      {formError ? <Note text={formError} error /> : null}
      <Button label="Place order and pay" onPress={submit} busy={busy} />
    </ScrollView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const c = useTheme()
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: c.foreground }}>{label}</Text><Text style={{ color: c.foreground }}>{value}</Text></View>
}
