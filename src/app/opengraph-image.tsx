import { ImageResponse } from 'next/og'
import { SITE } from '@/constants/site'

export const alt = `${SITE.name}: ${SITE.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// The picture that appears when the link is shared on WhatsApp, Twitter and similar.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 96, background: 'linear-gradient(135deg, #0b6b63, #0c1117)', color: '#ffffff' }}>
        <div style={{ fontSize: 108, fontWeight: 700, letterSpacing: -2 }}>{SITE.name}</div>
        <div style={{ marginTop: 24, fontSize: 48, opacity: 0.9 }}>{SITE.tagline}</div>
        <div style={{ marginTop: 56, fontSize: 30, opacity: 0.7 }}>Secure checkout. Order tracking. Email updates.</div>
      </div>
    ),
    size,
  )
}
