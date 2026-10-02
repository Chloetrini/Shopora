import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { API_URL } from '../config'
import { useAuth } from '../auth'
import type { RootStack } from '../navigation'
import { useTheme } from '../theme'
import { Avatar, Button, Center, Field, Note } from '../ui'

type Nav = NativeStackNavigationProp<RootStack>

export function AccountScreen() {
  const c = useTheme()
  const nav = useNavigation<Nav>()
  const { user, logout } = useAuth()
  if (!user) {
    return (
      <Center>
        <Text style={{ color: c.foreground, fontSize: 20, fontWeight: '700' }}>Your account</Text>
        <Note text="Log in once and your cart follows you between the website and this app." />
        <View style={{ gap: 10, width: '100%', maxWidth: 320 }}>
          <Button label="Log in" onPress={() => nav.navigate('Login', { mode: 'login' })} />
          <Button label="Create an account" variant="outline" onPress={() => nav.navigate('Login', { mode: 'register' })} />
        </View>
      </Center>
    )
  }
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 }}>
        <Avatar name={user.fullName} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.foreground, fontSize: 20, fontWeight: '700' }}>{user.fullName}</Text>
          <Text style={{ color: c.muted }}>{user.email}</Text>
        </View>
      </View>
      <Button label="Open the website" variant="outline" onPress={() => WebBrowser.openBrowserAsync(API_URL)} />
      <Button label="Log out" variant="outline" onPress={logout} />
    </ScrollView>
  )
}

export function LoginScreen({ route }: { route: { params?: RootStack['Login'] } }) {
  const c = useTheme()
  const nav = useNavigation<Nav>()
  const { login, register, loginWithGoogle } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>(route.params?.mode ?? 'login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') await login(email.trim(), password)
      else await register(fullName.trim(), email.trim(), password)
      nav.goBack()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function google() {
    setBusy(true)
    setError('')
    try {
      await loginWithGoogle()
      nav.goBack()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: c.foreground, fontSize: 24, fontWeight: '700', marginBottom: 16 }}>{mode === 'login' ? 'Log in' : 'Create your account'}</Text>
      {mode === 'register' && <Field label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" />}
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      {error ? <Note text={error} error /> : null}
      <Button label={mode === 'login' ? 'Log in' : 'Create account'} onPress={submit} busy={busy} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        <Text style={{ color: c.muted }}>or</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      </View>
      <Button label={mode === 'login' ? 'Continue with Google' : 'Sign up with Google'} variant="outline" onPress={google} disabled={busy} />
      <Text onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} style={{ color: c.primary, textAlign: 'center', marginTop: 20 }}>
        {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
      </Text>
      <Text style={{ color: c.muted, textAlign: 'center', marginTop: 16, fontSize: 12 }}>Same account as the website, so signing up there with Google works here too.</Text>
    </ScrollView>
  )
}
