import type { Metadata } from 'next'
import { TrackView } from '@/views/track-view'

export const metadata: Metadata = { title: 'Track an order', description: 'Follow your order with your email and order number.' }

export default function Page() {
  return <TrackView />
}
