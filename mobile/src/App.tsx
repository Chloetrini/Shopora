import { Ionicons } from '@expo/vector-icons'
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { Pressable, Text, useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from './auth'
import { CartProvider, useCart } from './cart'
import type { RootStack } from './navigation'
import { AccountScreen, LoginScreen } from './screens/account'
import { AdminScreen } from './screens/admin'
import { ProfileScreen } from './screens/profile'
import { CartScreen } from './screens/cart'
import { CheckoutScreen } from './screens/checkout'
import { OrderScreen, OrdersScreen } from './screens/orders'
import { ProductScreen, ShopScreen } from './screens/shop'
import { useTheme } from './theme'
import { Avatar } from './ui'

const Stack = createNativeStackNavigator<RootStack>()
const Tab = createBottomTabNavigator()

/** Top right on every tab: your initial when signed in, "Log in" when not. */
function HeaderAccount({ onPress }: { onPress: () => void }) {
  const c = useTheme()
  const { user } = useAuth()
  return (
    <Pressable onPress={onPress} accessibilityLabel={user ? `Account of ${user.fullName}` : 'Log in'} style={{ marginRight: 14 }}>
      {user ? <Avatar name={user.fullName} uri={user.avatarUrl} size={32} /> : <Text style={{ color: c.primary, fontWeight: '600' }}>Log in</Text>}
    </Pressable>
  )
}

function Tabs() {
  const c = useTheme()
  const cart = useCart()
  const { user } = useAuth()
  const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: string; size: number }) => <Ionicons name={name} color={color} size={size} />
  return (
    <Tab.Navigator screenOptions={({ navigation }) => ({ headerRight: () => <HeaderAccount onPress={() => navigation.navigate('Account')} />, tabBarActiveTintColor: c.primary, tabBarInactiveTintColor: c.muted, tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border }, headerStyle: { backgroundColor: c.surface }, headerTintColor: c.foreground })}>
      <Tab.Screen name="Shop" component={ShopScreen} options={{ title: 'Shopora', tabBarIcon: icon('storefront-outline') }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ title: 'Your cart', tabBarIcon: icon('bag-outline'), tabBarBadge: cart.count > 0 ? cart.count : undefined }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: 'Your orders', tabBarIcon: icon('receipt-outline') }} />
      {user?.isAdmin && <Tab.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin', tabBarIcon: icon('construct-outline') }} />}
      <Tab.Screen name="Account" component={AccountScreen} options={{ tabBarIcon: icon('person-outline') }} />
    </Tab.Navigator>
  )
}

function Root() {
  const c = useTheme()
  const dark = useColorScheme() === 'dark'
  const base = dark ? DarkTheme : DefaultTheme
  return (
    <NavigationContainer theme={{ ...base, colors: { ...base.colors, background: c.background, card: c.surface, text: c.foreground, border: c.border, primary: c.primary } }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerTintColor: c.foreground, headerStyle: { backgroundColor: c.surface } }}>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Product" component={ProductScreen} options={({ route }) => ({ title: route.params.name ?? 'Product' })} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
        <Stack.Screen name="Order" component={OrderScreen} options={{ title: 'Your order' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Your profile' }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: '', presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <Root />
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
