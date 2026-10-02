import { useState } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, type ImageStyle, type TextInputProps, type ViewStyle } from 'react-native'
import { api, getToken, imageUri } from './api'
import { API_URL } from './config'
import { useAuth } from './auth'
import { useTheme } from './theme'

export function Button({ label, onPress, disabled, busy, variant = 'primary', style, icon }: {
  label: string; onPress: () => void; disabled?: boolean; busy?: boolean; variant?: 'primary' | 'outline'; style?: ViewStyle; icon?: React.ReactNode
}) {
  const c = useTheme()
  const off = disabled || busy
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={off}
      style={[
        s.button,
        variant === 'primary' ? { backgroundColor: c.primary } : { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
        off && { opacity: 0.6 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={variant === 'primary' ? c.primaryForeground : c.foreground} /> : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {icon}
          <Text style={{ color: variant === 'primary' ? c.primaryForeground : c.foreground, fontWeight: '600', fontSize: 15 }}>{label}</Text>
        </View>
      )}
    </Pressable>
  )
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const c = useTheme()
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: c.foreground, fontSize: 13, marginBottom: 4 }}>{label}</Text>
      <TextInput
        placeholderTextColor={c.muted}
        {...props}
        style={[s.input, { borderColor: error ? c.danger : c.border, backgroundColor: c.surface, color: c.foreground }]}
      />
      {error ? <Text style={{ color: c.danger, fontSize: 12, marginTop: 3 }}>{error}</Text> : null}
    </View>
  )
}

/** A product photo, or a quiet grey box when there is none. */
export function Photo({ uri, style }: { uri: string | null | undefined; style?: ImageStyle }) {
  const c = useTheme()
  const src = imageUri(uri)
  return src ? <Image source={{ uri: src }} style={[{ backgroundColor: c.border }, style]} resizeMode="cover" /> : <View style={[{ backgroundColor: c.border }, style as ViewStyle]} />
}

/** The Google "G" in Google's four colours (a picture, so it needs no extra native code in the app). */
export function GoogleLogo({ size = 20 }: { size?: number }) {
  return <Image source={require('../assets/google-g.png')} style={{ width: size, height: size }} />
}

/** A round badge with the person's first letter, like the one on the website. */
export function Avatar({ name, uri, size = 36 }: { name: string; uri?: string | null; size?: number }) {
  const c = useTheme()
  const token = getToken()
  // The photo is only served to its owner, so the request carries the login token.
  if (uri && token) {
    return <Image source={{ uri: `${API_URL}${uri}`, headers: { Authorization: `Bearer ${token}` } }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.border }} />
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.primaryForeground, fontWeight: '700', fontSize: size * 0.42 }}>{(name.trim()[0] ?? '?').toUpperCase()}</Text>
    </View>
  )
}

/** "Please confirm your email" for a signed-in person who hasn't yet. It never blocks anything. */
export function VerifyNotice() {
  const c = useTheme()
  const { user } = useAuth()
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')
  if (!user || user.emailVerified !== false) return null
  async function resend() {
    setState('busy')
    try {
      await api('/api/auth/resend-verification', { method: 'POST' })
      setState('sent')
    } catch {
      setState('error')
    }
  }
  return (
    <View style={{ backgroundColor: c.primarySoft, padding: 12, borderRadius: 12, margin: 12, gap: 6 }}>
      <Text style={{ color: c.foreground }}>
        {state === 'sent' ? `We’ve sent a new link to ${user.email}. Check your inbox and spam.` : `Please confirm your email ${user.email}. We sent you a link.`}
      </Text>
      {state !== 'sent' && (
        <Text onPress={resend} style={{ color: c.primary, fontWeight: '600' }}>{state === 'busy' ? 'Sending…' : state === 'error' ? 'Couldn’t send it. Tap to try again.' : 'Resend the link'}</Text>
      )}
    </View>
  )
}

export function Center({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>{children}</View>
}

export function Note({ text, error }: { text: string; error?: boolean }) {
  const c = useTheme()
  return <Text style={{ color: error ? c.danger : c.muted, textAlign: 'center', marginVertical: 8 }}>{text}</Text>
}

const s = StyleSheet.create({
  button: { minHeight: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
})
