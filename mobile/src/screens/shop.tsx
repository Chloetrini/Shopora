import { Ionicons } from '@expo/vector-icons'
import * as SecureStore from 'expo-secure-store'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native'
import { api } from '../api'
import { useAuth } from '../auth'
import { useCart } from '../cart'
import { formatMoney } from '../money'
import type { RootStack } from '../navigation'
import { didYouMean, highlightParts, matchesQuery, pushRecent, suggest, suggestCategories } from '../search'
import { useTheme } from '../theme'
import type { Product } from '../types'
import { Button, Center, Note, Photo, VerifyNotice } from '../ui'

type Nav = NativeStackNavigationProp<RootStack>

const RECENT_KEY = 'shopora_recent_searches'

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
  const [focused, setFocused] = useState(false)
  // The last few searches, kept on the phone (SecureStore is already part of the app, so no new native code).
  const [recent, setRecent] = useState<string[]>([])
  useEffect(() => {
    SecureStore.getItemAsync(RECENT_KEY).then((v) => {
      try {
        const list = JSON.parse(v ?? '[]')
        if (Array.isArray(list)) setRecent(list.filter((x): x is string => typeof x === 'string').slice(0, 5))
      } catch { /* ignore a damaged value */ }
    }).catch(() => {})
  }, [])
  const remember = (term: string) => {
    const next = pushRecent(recent, term)
    setRecent(next)
    SecureStore.setItemAsync(RECENT_KEY, JSON.stringify(next)).catch(() => {})
  }

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
  // The list follows what you type, letter by letter.
  const shown = useMemo(() => (products ?? []).filter((p) => (!category || p.category === category) && (!search.trim() || matchesQuery(p, search))), [products, search, category])
  // The suggestion card under the box: best matches first, and a matching category.
  const hits = useMemo(() => suggest(products ?? [], search, 5), [products, search])
  const catHits = useMemo(() => suggestCategories(categories.map((c) => ({ label: c })), search, 1), [categories, search])
  const typed = search.trim().length > 0
  const showSuggestions = focused && (typed || recent.length > 0)
  const fix = useMemo(() => (typed && hits.length === 0 && catHits.length === 0 ? didYouMean(products ?? [], search) : null), [typed, hits.length, catHits.length, products, search])

  if (!products) {
    return <Center>{error ? <><Note text={error} error /><Button label="Try again" onPress={load} /></> : <Note text="Loading the shop…" />}</Center>
  }
  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      data={shown}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 14, paddingHorizontal: 14 }}
      contentContainerStyle={{ gap: 28, paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />}
      ListHeaderComponent={
        <View style={{ padding: 12, gap: 10 }}>
          <VerifyNotice />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            returnKeyType="search"
            onSubmitEditing={() => { if (search.trim()) remember(search) }}
            autoCorrect={false}
            placeholder="Search the shop"
            placeholderTextColor={c.muted}
            style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.foreground, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 }}
          />
          {showSuggestions && (
            <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8, overflow: 'hidden' }}>
              {!typed && (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 }}>
                    <Text style={{ color: c.muted, fontSize: 12 }}>Recent searches</Text>
                    <Text onPress={() => { setRecent([]); SecureStore.deleteItemAsync(RECENT_KEY).catch(() => {}) }} style={{ color: c.muted, fontSize: 12, textDecorationLine: 'underline' }}>Clear</Text>
                  </View>
                  {recent.map((term) => (
                    <Pressable key={term} onPress={() => setSearch(term)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 }}>
                      <Ionicons name="time-outline" size={16} color={c.muted} />
                      <Text style={{ color: c.muted }}>{term}</Text>
                    </Pressable>
                  ))}
                </>
              )}
              {typed && hits.length === 0 && catHits.length === 0 && (
                <View style={{ padding: 14, gap: 8 }}>
                  <Text style={{ color: c.muted }}>No products match “{search.trim()}”.</Text>
                  {fix ? <Text style={{ color: c.muted }}>Did you mean <Text onPress={() => setSearch(fix)} style={{ color: c.primary, fontWeight: '700' }}>{fix}</Text>?</Text> : null}
                  <Text style={{ color: c.muted }}>Or browse a category below.</Text>
                </View>
              )}
              {typed && hits.map((p) => (
                <Pressable key={p.id} onPress={() => { remember(p.name); setFocused(false); nav.navigate('Product', { slug: p.slug, name: p.name }) }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.border }}>
                  <Photo uri={p.imageUrl} style={{ width: 36, height: 36, borderRadius: 8 }} />
                  <Text numberOfLines={1} style={{ color: c.muted, flex: 1 }}>
                    {highlightParts(p.name, search).map((part, i) => <Text key={i} style={part.match ? { color: c.foreground, fontWeight: '700' } : undefined}>{part.text}</Text>)}
                  </Text>
                  <Text style={{ color: c.muted, fontSize: 12 }}>{formatMoney(p.priceCents, p.currency)}</Text>
                </Pressable>
              ))}
              {typed && catHits.map((cat) => (
                <Pressable key={cat.label} onPress={() => { setCategory(cat.label); setSearch(''); setFocused(false) }} style={{ paddingHorizontal: 14, paddingVertical: 11 }}>
                  <Text style={{ color: c.muted, textTransform: 'capitalize' }}>All in <Text style={{ color: c.foreground, fontWeight: '700' }}>{cat.label}</Text></Text>
                </Pressable>
              ))}
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 22, paddingRight: 12 }} style={{ borderBottomWidth: 1, borderBottomColor: c.border }}>
            {['', ...categories].map((cat) => (
              <Pressable key={cat || 'all'} onPress={() => setCategory(cat)} style={{ paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: category === cat ? c.foreground : 'transparent', marginBottom: -1 }}>
                <Text style={{ color: category === cat ? c.foreground : c.muted, fontWeight: category === cat ? '600' : '400', textTransform: 'capitalize' }}>{cat || 'All'}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        <View style={{ alignItems: 'center', gap: 6, padding: 20 }}>
          <Text style={{ color: c.foreground, fontWeight: '700', fontSize: 16 }}>{search.trim() ? `Nothing matches “${search.trim()}”` : 'Nothing here yet'}</Text>
          {fix ? <Text style={{ color: c.muted }}>Did you mean <Text onPress={() => setSearch(fix)} style={{ color: c.primary, fontWeight: '700' }}>{fix}</Text>?</Text> : null}
          <Text style={{ color: c.muted, textAlign: 'center' }}>Check the spelling, try fewer words, or pick a category above.</Text>
          <Button label="Show everything" variant="outline" onPress={() => { setSearch(''); setCategory('') }} style={{ marginTop: 6 }} />
        </View>
      }
      renderItem={({ item: p }) => (
        <View style={{ flex: 1 }}>
          <Pressable onPress={() => nav.navigate('Product', { slug: p.slug, name: p.name })}>
            <Photo uri={p.imageUrl} style={{ width: '100%', aspectRatio: 4 / 5, borderRadius: 6 }} />
            <Text numberOfLines={2} style={{ color: c.foreground, fontWeight: '500', marginTop: 10, lineHeight: 20 }}>{p.name}</Text>
            <Text style={{ color: c.foreground, marginTop: 2 }}>{formatMoney(p.priceCents, p.currency)}</Text>
            <Text style={{ color: c.muted, fontSize: 12, marginTop: 1, textTransform: 'capitalize' }}>{p.category}</Text>
          </Pressable>
          <View style={{ marginTop: 10 }}>
            {p.stock === 0 ? <Text style={{ color: c.muted, textAlign: 'center', paddingVertical: 10, borderWidth: 1, borderColor: c.border, borderRadius: 8 }}>Sold out</Text> : <Button label="Add to cart" variant="outline" onPress={() => add(p)} style={{ minHeight: 40 }} />}
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
