import { describe, expect, it } from 'vitest'
import { challengeFor } from './google'
import { openAppCode, sealAppCode, validAppRedirect, validChallenge } from './app-auth'
import { sealSession, unsealSession } from './session'

process.env.SESSION_SECRET = 'y'.repeat(40)

describe('app return links', () => {
  it('accepts the app scheme and Expo Go', () => {
    expect(validAppRedirect('shopora://google')).toBe('shopora://google')
    expect(validAppRedirect('exp://192.168.1.5:8081/--/google')).toBeTruthy()
    expect(validAppRedirect('exp://u.expo.dev/abc/group/def/--/google')).toBeTruthy()
  })
  it('refuses websites and script links', () => {
    for (const bad of ['https://evil.example', 'http://evil.example', 'javascript:alert(1)', 'shopora://u:p@x', '', null, undefined, 'not a url']) {
      expect(validAppRedirect(bad)).toBeNull()
    }
  })
  it('wants a 43 character challenge', () => {
    expect(validChallenge(challengeFor('v'.repeat(43)))).toBeTruthy()
    expect(validChallenge('short')).toBeNull()
    expect(validChallenge('a'.repeat(43) + '!')).toBeNull()
  })
})

describe('one-time code', () => {
  const verifier = 'v'.repeat(43)
  const ch = challengeFor(verifier)
  it('opens with the right verifier', async () => {
    const code = await sealAppCode({ uid: 'u1', v: 2, ch })
    expect(await openAppCode(code, verifier)).toEqual({ uid: 'u1', v: 2 })
  })
  it('is useless without the verifier the app began with', async () => {
    const code = await sealAppCode({ uid: 'u1', v: 2, ch })
    expect(await openAppCode(code, 'w'.repeat(43))).toBeNull()
  })
  it('is not a session token, and a session token is not a code', async () => {
    const code = await sealAppCode({ uid: 'u1', v: 2, ch })
    expect(await unsealSession(code)).toBeNull()
    expect(await openAppCode(await sealSession({ uid: 'u1', v: 2 }), verifier)).toBeNull()
  })
  it('rejects garbage', async () => {
    expect(await openAppCode('nonsense', verifier)).toBeNull()
  })
})
