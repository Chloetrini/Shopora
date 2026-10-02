import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native'
import { api } from '../api'
import { useAuth } from '../auth'
import { useCart } from '../cart'
import { formatMoney } from '../money'
import type { RootStack } from '../navigation'
import { useTheme } from '../theme'
import type { Product } from '../types'
import { Button, Center, Note, Photo, VerifyNotice } from '../ui'

type Nav = NativeStackNavigationProp<RootStack>

/** Adds to the cart, or sends a signed-out visitor to log in first (the cart is tied to the account). */
export function useAddToCart() {
  const nav = useNavigation<Nav>()
  const { user } = useAuth()
  const cart = useCart()
  return useCallback((p: Product) => {
    if (!user) return nav.navigate('Login', { mode: 'login' })
    cart.add(p)
  }, [user, cart, nav])
}

export function ShopScreen() {
  const c = useTheme()
  const nav = useNavigation<Nav>()
  const add = useAddToCart()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const load = useCallback(async () => {
    try {
      setProducts((await api<{ products: Product[] }>('/api/products')).products)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the shop.')
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const categories = useMemo(() => [...new Set((products ?? []).map((p) => p.category))].sort(), [products])
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (products ?? []).filter((p) => (!category || p.category === category) && (!q || `${p.name} ${p.description}`.toLowerCase().includes(q)))
  }, [products, search, category])

  if (!products) {
    return <Center>{error ? <><Note text={error} error /><Button label="Try again" onPress={load} /></> : <Note text="Loading the shop…" />}</Center>
  }
  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      data={shown}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12, paddingHorizontal: 12 }}
      contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />}
      ListHeaderComponent={
        <View style={{ padding: 12, gap: 10 }}>
          <VerifyNotice />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search the shop"
            placeholderTextColor={c.muted}
            style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.foreground, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 }}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {['', ...categories].map((cat) => (
              <Pressable key={cat || 'all'} onPress={() => setCategory(cat)}
                style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: category === cat ? c.primary : c.border, backgroundColor: category === cat ? c.primary : c.surface }}>
                <Text style={{ color: category === cat ? c.primaryForeground : c.foreground, textTransform: 'capitalize' }}>{cat || 'All'}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={<Note text="Nothing matches that search." />}
      renderItem={({ item: p }) => (
        <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
          <Pressable onPress={() => nav.navigate('Product', { slug: p.slug, name: p.name })}>
            <Photo uri={p.imageUrl} style={{ width: '100%', aspectRatio: 4 / 5 }} />
            <View style={{ padding: 10 }}>
              <Text numberOfLines={2} style={{ color: c.foreground, fontWeight: '600' }}>{p.name}</Text>
              <Text style={{ color: c.muted, marginTop: 2 }}>{formatMoney(p.priceCents, p.currency)}</Text>
            </View>
          </Pressable>
          <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
            {p.stock === 0 ? <Text style={{ color: c.muted, textAlign: 'center', paddingVertical: 10 }}>Sold out</Text> : <Button label="Add to cart" onPress={() => add(p)} />}
          </View>
        </View>
      )}
    />
  )
}

export function ProductScreen({ route }: { route: { params: RootStack['Product'] } }) {
  const c = useTheme()
  const add = useAddToCart()
  const cart = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ product: Product }>(`/api/products/${route.params.slug}`).then((b) => setProduct(b.product)).catch((e) => setError(e instanceof Error ? e.message : 'Could not load the product.'))
  }, [route.params.slug])

  if (!product) return <Center><Note text={error || 'Loading…'} error={!!error} /></Center>
  const inCart = cart.items.find((i) => i.productId === product.id)?.quantity ?? 0
  return (
    <ScrollView style={{ backgroundColor: c.background }}>
      <Photo uri={product.imageUrl} style={{ width: '100%', aspectRatio: 1 }} />
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ color: c.foreground, fontSize: 24, fontWeight: '700' }}>{product.name}</Text>
        <Text style={{ color: c.primary, fontSize: 20, fontWeight: '600' }}>{formatMoney(product.priceCents, product.currency)}</Text>
        <Text style={{ color: c.muted }}>{product.stock === 0 ? 'Sold out' : product.stock <= 5 ? `Only ${product.stock} left` : 'In stock'}</Text>
        {product.description ? <Text style={{ color: c.foreground, lineHeight: 22 }}>{product.description}</Text> : null}
        {product.stock > 0 && <Button label={inCart > 0 ? `Add another (${inCart} in cart)` : 'Add to cart'} onPress={() => add(product)} style={{ marginTop: 8 }} />}
      </View>
    </ScrollView>
  )
}
