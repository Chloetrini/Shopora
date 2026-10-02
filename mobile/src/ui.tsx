import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, type ImageStyle, type TextInputProps, type ViewStyle } from 'react-native'
import { imageUri } from './api'
import { useTheme } from './theme'

export function Button({ label, onPress, disabled, busy, variant = 'primary', style }: {
  label: string; onPress: () => void; disabled?: boolean; busy?: boolean; variant?: 'primary' | 'outline'; style?: ViewStyle
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
        <Text style={{ color: variant === 'primary' ? c.primaryForeground : c.foreground, fontWeight: '600', fontSize: 15 }}>{label}</Text>
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
