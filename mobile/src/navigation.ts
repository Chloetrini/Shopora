export type RootStack = {
  Tabs: undefined
  Product: { slug: string; name?: string }
  Checkout: undefined
  Order: { id: string }
  Profile: undefined
  Login: { mode?: 'login' | 'register' } | undefined
}
