export type RootStack = {
  Tabs: undefined
  Product: { slug: string; name?: string }
  Checkout: undefined
  Order: { id: string }
  Login: { mode?: 'login' | 'register' } | undefined
}
