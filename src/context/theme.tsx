'use client'

import { Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'

const KEY = 'shopora-theme' // must match the pre-paint script in app/layout.tsx

const subscribe = (cb: () => void) => {
  const obs = new MutationObserver(cb)
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => obs.disconnect()
}
const isDark = () => document.documentElement.classList.contains('dark')

/**
 * Both icons are always rendered and CSS picks one, so the server HTML never disagrees with the client
 * (a hydration mismatch otherwise). The label is neutral for the same reason.
 */
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false)
  function toggle() {
    const next = !isDark()
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem(KEY, next ? 'dark' : 'light')
    } catch {
      /* private mode: the choice just won't persist */
    }
  }
  return (
    <button type="button" onClick={toggle} aria-label="Switch between light and dark mode" aria-pressed={dark}
      className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground">
      <Sun className="hidden size-[18px] dark:block" aria-hidden />
      <Moon className="size-[18px] dark:hidden" aria-hidden />
    </button>
  )
}
