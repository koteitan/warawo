import { describe, it, expect } from 'vitest'
import { normalizePubkey, parseRelayList, parseContactList, parseProfile } from './nostr'
import type { NostrEvent } from '../types'

describe('normalizePubkey', () => {
  it('normalizes hex pubkey', () => {
    const hex = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
    expect(normalizePubkey(hex)).toBe(hex)
  })

  it('normalizes uppercase hex pubkey to lowercase', () => {
    const hex = 'ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789'
    expect(normalizePubkey(hex)).toBe(hex.toLowerCase())
  })

  it('normalizes npub to hex', () => {
    // Use a well-known valid npub (Jack Dorsey's)
    const npub = 'npub1sg6plzptd64u62a878hep2kev88swjh3tw00gjsfl8f237lmu63q0uf63m'
    const result = normalizePubkey(npub)
    expect(result).toBeTruthy()
    expect(result).toHaveLength(64)
  })

  it('returns null for invalid input', () => {
    expect(normalizePubkey('invalid')).toBeNull()
    expect(normalizePubkey('tooshort')).toBeNull()
    expect(normalizePubkey('')).toBeNull()
  })

  it('trims whitespace', () => {
    const hex = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
    expect(normalizePubkey(`  ${hex}  `)).toBe(hex)
  })
})

describe('parseRelayList', () => {
  it('parses relay list from kind:10002 event', () => {
    const event: NostrEvent = {
      id: 'test',
      pubkey: 'test',
      created_at: 0,
      kind: 10002,
      tags: [
        ['r', 'wss://relay.damus.io'],
        ['r', 'wss://yabu.me', 'read'],
        ['r', 'wss://nos.lol', 'write'],
      ],
      content: '',
      sig: 'test',
    }

    const relays = parseRelayList(event)

    expect(relays).toHaveLength(3)
    expect(relays[0]).toEqual({ url: 'wss://relay.damus.io', read: true, write: true, status: 'wait' })
    expect(relays[1]).toEqual({ url: 'wss://yabu.me', read: true, write: false, status: 'wait' })
    expect(relays[2]).toEqual({ url: 'wss://nos.lol', read: false, write: true, status: 'wait' })
  })

  it('ignores non-relay tags', () => {
    const event: NostrEvent = {
      id: 'test',
      pubkey: 'test',
      created_at: 0,
      kind: 10002,
      tags: [
        ['p', 'somepubkey'],
        ['r', 'wss://relay.damus.io'],
        ['e', 'someeventid'],
      ],
      content: '',
      sig: 'test',
    }

    const relays = parseRelayList(event)

    expect(relays).toHaveLength(1)
  })
})

describe('parseContactList', () => {
  it('parses pubkeys from kind:3 event', () => {
    const event: NostrEvent = {
      id: 'test',
      pubkey: 'test',
      created_at: 0,
      kind: 3,
      tags: [
        ['p', 'pubkey1'],
        ['p', 'pubkey2'],
        ['p', 'pubkey3'],
      ],
      content: '',
      sig: 'test',
    }

    const pubkeys = parseContactList(event)

    expect(pubkeys).toEqual(['pubkey1', 'pubkey2', 'pubkey3'])
  })

  it('ignores non-p tags', () => {
    const event: NostrEvent = {
      id: 'test',
      pubkey: 'test',
      created_at: 0,
      kind: 3,
      tags: [
        ['p', 'pubkey1'],
        ['e', 'eventid'],
        ['r', 'relay'],
      ],
      content: '',
      sig: 'test',
    }

    const pubkeys = parseContactList(event)

    expect(pubkeys).toEqual(['pubkey1'])
  })
})

describe('parseProfile', () => {
  it('parses profile from kind:0 event', () => {
    const event: NostrEvent = {
      id: 'test',
      pubkey: 'test',
      created_at: 0,
      kind: 0,
      tags: [],
      content: JSON.stringify({
        name: 'testuser',
        display_name: 'Test User',
        picture: 'https://example.com/pic.jpg',
        nip05: 'test@example.com',
      }),
      sig: 'test',
    }

    const profile = parseProfile(event)

    expect(profile.name).toBe('testuser')
    expect(profile.display_name).toBe('Test User')
    expect(profile.picture).toBe('https://example.com/pic.jpg')
    expect(profile.nip05).toBe('test@example.com')
  })

  it('returns empty object for invalid JSON', () => {
    const event: NostrEvent = {
      id: 'test',
      pubkey: 'test',
      created_at: 0,
      kind: 0,
      tags: [],
      content: 'not json',
      sig: 'test',
    }

    const profile = parseProfile(event)

    expect(profile).toEqual({})
  })
})
