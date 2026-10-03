import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FlatList, Pressable, Text, View } from 'react-native'
import { useAuth } from '../auth'
import { useCart } from '../cart'
import { formatMoney } from '../money'
import type { RootStack } from '../navigation'
import { useTheme } from '../theme'
import { Button, Center, Note, Photo } from '../ui'

export function CartScreen() {
  const c = useTheme()
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>()
  const { user } = useAuth()
  const cart = useCart()

  if (!user) {
    return (
      <Center>
        <Text style={{ color: c.foreground, fontSize: 18, fontWeight: '600' }}>Your cart</Text>
        <Note text="Log in to see the cart you started on the website, or to start one here." />
        <Button label="Log in" onPress={() => nav.navigate('Login', { mode: 'login' })} />
      </Center>
    )
  }
  if (cart.items.length === 0) return <Center><Text style={{ color: c.foreground, fontSize: 18, fontWeight: '600' }}>Your cart is empty</Text><Note text="Things you add here or on the website show up in both places." /></Center>

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FlatList
        data={cart.items}
        keyExtractor={(i) => i.productId}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        renderItem={({ item: i }) => (
          <View style={{ flexDirection: 'row', gap: 12, backgroundColor: c.surface, borderRadius: 8, borderWidth: 1, borderColor: c.border, padding: 10, alignItems: 'center' }}>
            <Photo uri={i.imageUrl} style={{ width: 64, height: 64, borderRadius: 6 }} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={2} style={{ color: c.foreground, fontWeight: '600' }}>{i.name}</Text>
              <Text style={{ color: c.muted }}>{formatMoney(i.priceCents, i.currency)} each</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 }}>
                <Pressable accessibilityLabel={`One less ${i.name}`} onPress={() => cart.setQty(i.productId, i.quantity - 1)} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.foreground, fontSize: 18 }}>−</Text></Pressable>
                <Text style={{ color: c.foreground, minWidth: 18, textAlign: 'center' }}>{i.quantity}</Text>
                <Pressable accessibilityLabel={`One more ${i.name}`} onPress={() => cart.setQty(i.productId, i.quantity + 1)} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.foreground, fontSize: 18 }}>+</Text></Pressable>
                <Pressable onPress={() => cart.remove(i.productId)}><Text style={{ color: c.danger, marginLeft: 6 }}>Remove</Text></Pressable>
              </View>
            </View>
            <Text style={{ color: c.foreground, fontWeight: '600' }}>{formatMoney(i.priceCents * i.quantity, i.currency)}</Text>
          </View>
        )}
      />
      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: c.foreground, fontSize: 17, fontWeight: '700' }}>Total</Text>
          <Text style={{ color: c.foreground, fontSize: 17, fontWeight: '700' }}>{formatMoney(cart.totalCents, cart.items[0].currency)}</Text>
        </View>
        <Text style={{ color: c.muted, fontSize: 12 }}>Delivery and any discount are worked out at checkout.</Text>
        <Button label="Go to checkout" onPress={() => nav.navigate('Checkout')} />
      </View>
    </View>
  )
}
