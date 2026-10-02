import { useColorScheme } from 'react-native'

/** The same colours as the website's tokens (globals.css), light and dark. */
const light = {
  background: '#f6f7f8', surface: '#ffffff', foreground: '#11161d', muted: '#5d6775', border: '#e2e6ea',
  primary: '#0b6b63', primaryForeground: '#ffffff', primarySoft: '#dff1ee', ink: '#0c1117', inkForeground: '#f2f5f7', danger: '#c0392b',
}
const dark: typeof light = {
  background: '#0b0f14', surface: '#121821', foreground: '#e9edf2', muted: '#8d98a8', border: '#222b37',
  primary: '#3dd0b4', primaryForeground: '#06201b', primarySoft: '#11302c', ink: '#05080c', inkForeground: '#e9edf2', danger: '#ff7b6b',
}

export type Palette = typeof light
export const useTheme = (): Palette => (useColorScheme() === 'dark' ? dark : light)
