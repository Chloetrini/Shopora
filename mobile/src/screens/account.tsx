import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Updates from 'expo-updates'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'
import { api, ApiError } from '../api'
import { openSignedIn } from '../payment'
import { API_URL } from '../config'
import { useAuth } from '../auth'
import type { RootStack } from '../navigation'
import { useTheme } from '../theme'
import { AppearanceRow } from '../appearance'
import { Avatar, Button, GoogleLogo, Center, Field, Note, VerifyNotice } from '../ui'

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
          <View style={{ marginTop: 12 }}><AppearanceRow /></View>
        </View>
      </Center>
    )
  }
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <VerifyNotice />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.surface, borderRadius: 8, borderWidth: 1, borderColor: c.border, padding: 16 }}>
        <Avatar name={user.fullName} uri={user.avatarUrl} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.foreground, fontSize: 20, fontWeight: '700' }}>{user.fullName}</Text>
          <Text style={{ color: c.muted }}>{user.email}</Text>
        </View>
      </View>
      <Button label="Edit profile" onPress={() => nav.navigate('Profile')} />
      <AppearanceRow />
      <AppVersion />
      <Button label="Open the website" variant="outline" onPress={async () => { if (!(await openSignedIn('/'))) await WebBrowser.openBrowserAsync(API_URL) }} />
      <Button label="Log out" variant="outline" onPress={logout} />
    </ScrollView>
  )
}

/** Which version of the app is running, and a button to fetch the newest one right now. */
function AppVersion() {
  const c = useTheme()
  const [state, setState] = useState<'idle' | 'checking' | 'latest' | 'error'>('idle')
  const id = Updates.updateId ? Updates.updateId.slice(0, 8) : null
  async function check() {
    setState('checking')
    try {
      const found = await Updates.checkForUpdateAsync()
      if (found.isAvailable) {
        await Updates.fetchUpdateAsync()
        await Updates.reloadAsync() // restarts the app on the new version
      } else {
        setState('latest')
      }
    } catch {
      setState('error')
    }
  }
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: c.muted, fontSize: 12, textAlign: 'center' }}>
        App version 1.0.0, {id ? `update ${id}` : 'built-in version (no update loaded yet)'}
      </Text>
      <Button label={state === 'checking' ? 'Checking…' : 'Check for updates'} variant="outline" onPress={check} disabled={state === 'checking' || !Updates.isEnabled} style={{ minHeight: 40 }} />
      {state === 'latest' ? <Note text="You have the newest version." /> : null}
      {state === 'error' ? <Note text="Couldn’t check just now. Check your connection and try again." error /> : null}
      {!Updates.isEnabled ? <Note text="Updates are off in this preview (Expo Go updates itself when you reopen the link)." /> : null}
    </View>
  )
}

export function LoginScreen({ route }: { route: { params?: RootStack['Login'] } }) {
  const c = useTheme()
  const nav = useNavigation<Nav>()
  const { login, register, loginWithGoogle } = useAuth()
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(route.params?.mode ?? 'login')
  const [info, setInfo] = useState('')
  // Set once an account was just created, or a login was refused because the email isn't confirmed yet.
  const [waiting, setWaiting] = useState<{ email: string; sent: boolean } | null>(null)
  const [resend, setResend] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setError('')
    try {
      if (mode === 'forgot') {
        const r = await api<unknown>('/api/auth/forgot-password', { method: 'POST', body: { email: email.trim() } }).then(() => 'If an account uses that email, we’ve sent a link to choose a new password. It works once and lasts 30 minutes.')
        setInfo(r)
        return
      }
      if (mode === 'login') {
        await login(email.trim(), password)
        nav.goBack()
      } else {
        const r = await register(fullName.trim(), email.trim(), password)
        setWaiting({ email: r.email, sent: r.verificationSent })
      }
    } catch (e) {
      // A correct password for an account whose email isn't confirmed yet: explain, and offer a new link.
      if (e instanceof ApiError && e.code === 'email_not_verified') setWaiting({ email: email.trim(), sent: true })
      else setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function resendLink() {
    if (!waiting) return
    setResend('busy')
    try {
      await api('/api/auth/resend-verification', { method: 'POST', body: { email: waiting.email } })
      setResend('sent')
    } catch {
      setResend('error')
    }
  }

  async function google() {
    setBusy(true)
    setError('')
    try {
      const { created } = await loginWithGoogle()
      nav.goBack()
      if (created) Alert.alert('Welcome to Shopora!', 'Your account is ready. We’ve sent you a welcome email.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (waiting) {
    return (
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Text style={{ color: c.foreground, fontSize: 24, fontWeight: '700' }}>Check your email</Text>
        <Text style={{ color: c.foreground, lineHeight: 22 }}>
          {waiting.sent ? `We sent a link to ${waiting.email}.` : 'We couldn’t send the email just now, so tap Resend.'} Open it on your phone or computer and tap “Confirm your email”. Then come back here and log in. You can’t log in before that.
        </Text>
        <Text style={{ color: c.muted }}>Nothing there? Look in spam. The link works once and lasts 24 hours.</Text>
        <Button label={resend === 'busy' ? 'Sending…' : resend === 'sent' ? 'Sent. Check your inbox' : 'Resend the email'} variant="outline" onPress={resendLink} disabled={resend === 'busy' || resend === 'sent'} />
        {resend === 'error' ? <Note text="Couldn’t send it. Try again in a few minutes." error /> : null}
        <Button label="Back to log in" onPress={() => { setWaiting(null); setMode('login'); setResend('idle'); setPassword('') }} />
      </ScrollView>
    )
  }

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: c.foreground, fontSize: 24, fontWeight: '700', marginBottom: 16 }}>{mode === 'login' ? 'Log in' : mode === 'register' ? 'Create your account' : 'Forgot your password?'}</Text>
      {mode === 'forgot' && <Text style={{ color: c.muted, marginBottom: 12 }}>Enter your email and we’ll send you a link to choose a new password. This also works if you signed up with Google and want to add a password.</Text>}
      {mode === 'register' && <Field label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" />}
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      {mode !== 'forgot' && <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />}
      {mode === 'login' && <Text onPress={() => { setMode('forgot'); setError(''); setInfo('') }} style={{ color: c.primary, textAlign: 'right', marginTop: -6, marginBottom: 12 }}>Forgot password?</Text>}
      {error ? <Note text={error} error /> : null}
      {info ? <Note text={info} /> : null}
      <Button label={mode === 'login' ? 'Log in' : mode === 'register' ? 'Create account' : 'Send me a link'} onPress={submit} busy={busy} />
      {mode === 'forgot' ? (
        <Text onPress={() => { setMode('login'); setInfo(''); setError('') }} style={{ color: c.primary, textAlign: 'center', marginTop: 20 }}>Back to log in</Text>
      ) : (<>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        <Text style={{ color: c.muted }}>or</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      </View>
      <Button label={mode === 'login' ? 'Continue with Google' : 'Sign up with Google'} variant="outline" icon={<GoogleLogo />} onPress={google} disabled={busy} />
      <Text onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} style={{ color: c.primary, textAlign: 'center', marginTop: 20 }}>
        {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
      </Text>
      <Text style={{ color: c.muted, textAlign: 'center', marginTop: 16, fontSize: 12 }}>Same account as the website, so signing up there with Google works here too.</Text>
      </>)}
    </ScrollView>
  )
}
