import { describe, it, expect } from 'vitest'
import { analyzeFolloweeCoverage, sortFolloweesByCoverage } from './coverage'
import type { FolloweeAnalysis, UserProfile } from '../types'

describe('analyzeFolloweeCoverage', () => {
  const followeeProfile: UserProfile = {
    pubkey: 'abc123',
    name: 'test',
  }

  it('calculates coverage as count of readable relays (all match)', () => {
    const followeeWriteRelays = ['wss://relay.damus.io', 'wss://yabu.me']
    const userReadRelays = ['wss://relay.damus.io/', 'wss://yabu.me/']

    const result = analyzeFolloweeCoverage(followeeProfile, followeeWriteRelays, userReadRelays)

    expect(result.coverage).toBe(2)
    expect(result.readableRelays).toHaveLength(2)
    expect(result.unreadableRelays).toHaveLength(0)
  })

  it('calculates coverage as 0 when no relays match', () => {
    const followeeWriteRelays = ['wss://relay.damus.io', 'wss://yabu.me']
    const userReadRelays = ['wss://other.relay.com/']

    const result = analyzeFolloweeCoverage(followeeProfile, followeeWriteRelays, userReadRelays)

    expect(result.coverage).toBe(0)
    expect(result.readableRelays).toHaveLength(0)
    expect(result.unreadableRelays).toHaveLength(2)
  })

  it('calculates coverage as count when some relays match', () => {
    const followeeWriteRelays = ['wss://relay.damus.io', 'wss://yabu.me']
    const userReadRelays = ['wss://relay.damus.io/']

    const result = analyzeFolloweeCoverage(followeeProfile, followeeWriteRelays, userReadRelays)

    expect(result.coverage).toBe(1)
    expect(result.readableRelays).toHaveLength(1)
    expect(result.unreadableRelays).toHaveLength(1)
  })

  it('handles empty write relays', () => {
    const result = analyzeFolloweeCoverage(followeeProfile, [], ['wss://relay.damus.io/'])

    expect(result.coverage).toBe(0)
    expect(result.readableRelays).toHaveLength(0)
    expect(result.unreadableRelays).toHaveLength(0)
  })
})

describe('sortFolloweesByCoverage', () => {
  it('sorts by coverage ascending (lowest first)', () => {
    const followees: FolloweeAnalysis[] = [
      { profile: { pubkey: 'a' }, writeRelays: [], readableRelays: ['r1', 'r2', 'r3'], unreadableRelays: [], coverage: 3 },
      { profile: { pubkey: 'b' }, writeRelays: [], readableRelays: [], unreadableRelays: [], coverage: 0 },
      { profile: { pubkey: 'c' }, writeRelays: [], readableRelays: ['r1'], unreadableRelays: [], coverage: 1 },
    ]

    const sorted = sortFolloweesByCoverage(followees)

    expect(sorted[0].profile.pubkey).toBe('b')
    expect(sorted[1].profile.pubkey).toBe('c')
    expect(sorted[2].profile.pubkey).toBe('a')
  })

  it('does not mutate original array', () => {
    const followees: FolloweeAnalysis[] = [
      { profile: { pubkey: 'a' }, writeRelays: [], readableRelays: ['r1', 'r2'], unreadableRelays: [], coverage: 2 },
      { profile: { pubkey: 'b' }, writeRelays: [], readableRelays: [], unreadableRelays: [], coverage: 0 },
    ]

    const sorted = sortFolloweesByCoverage(followees)

    expect(followees[0].profile.pubkey).toBe('a')
    expect(sorted[0].profile.pubkey).toBe('b')
  })
})
