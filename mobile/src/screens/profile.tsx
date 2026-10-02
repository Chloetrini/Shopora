import { useNavigation } from '@react-navigation/native'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'
import { api, apiUpload } from '../api'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import type { User } from '../types'
import { Avatar, Button, Field, Note } from '../ui'

const msg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.')

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useTheme()
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14, gap: 8 }}>
      <Text style={{ color: c.foreground, fontWeight: '700', fontSize: 16 }}>{title}</Text>
      {children}
    </View>
  )
}

export function ProfileScreen() {
  const c = useTheme()
  const nav = useNavigation()
  const { user, updateUser, replaceToken, logout } = useAuth()
  const [name, setName] = useState(user?.fullName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [delSecret, setDelSecret] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState('')
  const [notes, setNotes] = useState<Record<string, { ok: boolean; text: string }>>({})
  if (!user) return null

  const say = (key: string, ok: boolean, text: string) => setNotes((n) => ({ ...n, [key]: { ok, text } }))
  const NoteFor = ({ k }: { k: string }) => (notes[k] ? <Note text={notes[k].text} error={!notes[k].ok} /> : null)

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return say('photo', false, 'Allow photo access in your phone settings to add a picture.')
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 })
    if (picked.canceled || !picked.assets[0]) return
    setBusy('photo')
    try {
      const out = await ImageManipulator.manipulateAsync(picked.assets[0].uri, [{ resize: { width: 512, height: 512 } }], { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG })
      const body = await apiUpload<{ user: User }>('/api/users/me/avatar', 'PUT', await (await fetch(out.uri)).blob())
      updateUser(body.user)
      say('photo', true, 'Photo updated.')
    } catch (e) {
      say('photo', false, msg(e))
    }
    setBusy('')
  }

  async function removePhoto() {
    setBusy('photo')
    try {
      updateUser((await api<{ user: User }>('/api/users/me/avatar', { method: 'DELETE' })).user)
      say('photo', true, 'Photo removed.')
    } catch (e) {
      say('photo', false, msg(e))
    }
    setBusy('')
  }

  async function saveDetails() {
    setBusy('details')
    try {
      updateUser((await api<{ user: User }>('/api/users/me', { method: 'PATCH', body: { fullName: name.trim(), phone: phone.trim() } })).user)
      say('details', true, 'Profile saved.')
    } catch (e) {
      say('details', false, msg(e))
    }
    setBusy('')
  }

  async function savePassword() {
    if (next !== again) return say('password', false, 'The two passwords don’t match.')
    setBusy('password')
    try {
      const body = await api<{ token?: string }>('/api/users/me/password', { method: 'PATCH', body: { currentPassword: user?.hasPassword ? current : undefined, newPassword: next } })
      if (body?.token) await replaceToken(body.token) // this phone stays signed in; other devices were signed out
      say('password', true, `${user?.hasPassword ? 'Password changed' : 'Password added'}. Your other devices were signed out.`)
      setCurrent(''); setNext(''); setAgain('')
      void api<{ user: User }>('/api/auth/me').then((b) => updateUser(b.user)).catch(() => {})
    } catch (e) {
      say('password', false, msg(e))
    }
    setBusy('')
  }

  function confirmDelete() {
    Alert.alert('Delete your account?', 'Your account, cart, wishlist and saved addresses are removed for good. Past orders stay on record so we can still deliver and refund them.', [
      { text: 'Keep my account' },
      {
        text: 'Delete everything', style: 'destructive',
        onPress: async () => {
          setBusy('delete')
          try {
            await api('/api/users/me', { method: 'DELETE', body: user?.hasPassword ? { password: delSecret } : { confirmEmail: delSecret } })
            await logout()
          } catch (e) {
            say('delete', false, msg(e))
            setBusy('')
          }
        },
      },
    ])
  }

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 14, gap: 12 }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
        <Avatar name={user.fullName} uri={user.avatarUrl} size={96} />
        <Text style={{ color: c.foreground, fontSize: 18, fontWeight: '700' }}>{user.fullName}</Text>
        <Text style={{ color: c.muted }}>{user.email}{user.emailVerified === false ? ' (not confirmed yet)' : ''}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label={user.avatarUrl ? 'Change photo' : 'Add a photo'} variant="outline" onPress={pickPhoto} busy={busy === 'photo'} style={{ minHeight: 40 }} />
          {user.avatarUrl ? <Button label="Remove" variant="outline" onPress={removePhoto} disabled={busy === 'photo'} style={{ minHeight: 40 }} /> : null}
        </View>
        <NoteFor k="photo" />
      </View>

      <Card title="Your details">
        <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" />
        <Field label="Phone number (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="+234 801 234 5678" />
        <Text style={{ color: c.muted, fontSize: 12 }}>Your email is how you sign in and where order updates go, so it can’t be changed here.</Text>
        <NoteFor k="details" />
        <Button label="Save changes" onPress={saveDetails} busy={busy === 'details'} />
      </Card>

      <Card title={user.hasPassword ? 'Change your password' : 'Add a password'}>
        {!user.hasPassword && <Text style={{ color: c.muted }}>You signed up with Google. Add a password if you’d also like to log in with your email.</Text>}
        {user.hasPassword && <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" />}
        <Field label="New password (8 to 72 characters)" value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" />
        <Field label="Confirm new password" value={again} onChangeText={setAgain} secureTextEntry autoCapitalize="none" />
        <NoteFor k="password" />
        <Button label={user.hasPassword ? 'Change password' : 'Add password'} onPress={savePassword} busy={busy === 'password'} />
      </Card>

      <Card title="Delete your account">
        <Text style={{ color: c.muted }}>This removes your account, cart, wishlist and saved addresses for good.</Text>
        {deleting ? (
          <>
            <Field label={user.hasPassword ? 'Enter your password to confirm' : 'Type your email address to confirm'} value={delSecret} onChangeText={setDelSecret} secureTextEntry={!!user.hasPassword} autoCapitalize="none" keyboardType={user.hasPassword ? 'default' : 'email-address'} />
            <NoteFor k="delete" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="Cancel" variant="outline" onPress={() => { setDeleting(false); setDelSecret('') }} style={{ flex: 1 }} />
              <Button label="Delete account" onPress={confirmDelete} busy={busy === 'delete'} disabled={!delSecret} style={{ flex: 1, backgroundColor: c.danger }} />
            </View>
          </>
        ) : (
          <Button label="Delete my account" variant="outline" onPress={() => setDeleting(true)} />
        )}
      </Card>
      <Text onPress={() => nav.goBack()} style={{ color: c.primary, textAlign: 'center', paddingVertical: 8 }}>Back to account</Text>
    </ScrollView>
  )
}
