import * as SecureStore from 'expo-secure-store'
import { useEffect, useState } from 'react'
import { Appearance, Text, View } from 'react-native'
import { useTheme } from './theme'
import { Button } from './ui'

export type Mode = 'system' | 'light' | 'dark'
const KEY = 'shopora_appearance'

/** Applies a saved choice (or follows the phone when there is none). Call once when the app starts. */
export async function applySavedAppearance(): Promise<void> {
  try {
    const v = await SecureStore.getItemAsync(KEY)
    if (v === 'light' || v === 'dark') Appearance.setColorScheme(v)
  } catch {
    /* keep following the phone */
  }
}

/** Light, Dark or follow the phone: the same three choices as the website's theme button. */
export function AppearanceRow() {
  const c = useTheme()
  const [mode, setMode] = useState<Mode>('system')
  useEffect(() => {
    SecureStore.getItemAsync(KEY).then((v) => { if (v === 'light' || v === 'dark') setMode(v) }).catch(() => {})
  }, [])
  async function choose(next: Mode) {
    setMode(next)
    Appearance.setColorScheme(next === 'system' ? 'unspecified' : next)
    try {
      if (next === 'system') await SecureStore.deleteItemAsync(KEY)
      else await SecureStore.setItemAsync(KEY, next)
    } catch {
      /* the choice still applies until the app is closed */
    }
  }
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: c.foreground, fontWeight: '700' }}>Appearance</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['system', 'light', 'dark'] as Mode[]).map((m) => (
          <Button key={m} label={m === 'system' ? 'Auto' : m === 'light' ? 'Light' : 'Dark'} variant={mode === m ? 'primary' : 'outline'} onPress={() => choose(m)} style={{ flex: 1, minHeight: 42 }} />
        ))}
      </View>
    </View>
  )
}
