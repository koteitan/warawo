import { normalizeRelayUrl } from './relay'
import type { FolloweeAnalysis, UserProfile, RelayInfo } from '../types'

export function analyzeFolloweeCoverage(
  followeeProfile: UserProfile,
  followeeWriteRelays: string[],
  userReadRelays: string[]
): FolloweeAnalysis {
  const normalizedUserReadRelays = new Set(userReadRelays.map(normalizeRelayUrl))

  const readableRelays: string[] = []
  const unreadableRelays: string[] = []

  for (const relay of followeeWriteRelays) {
    const normalized = normalizeRelayUrl(relay)
    if (normalizedUserReadRelays.has(normalized)) {
      readableRelays.push(relay)
    } else {
      unreadableRelays.push(relay)
    }
  }

  return {
    profile: followeeProfile,
    writeRelays: followeeWriteRelays,
    readableRelays,
    unreadableRelays,
    coverage: readableRelays.length,
  }
}

export function sortFolloweesByCoverage(followees: FolloweeAnalysis[]): FolloweeAnalysis[] {
  return [...followees].sort((a, b) => {
    // -1 means not analyzed, put them at the bottom
    if (a.coverage === -1 && b.coverage === -1) return 0
    if (a.coverage === -1) return 1
    if (b.coverage === -1) return -1
    // Sort analyzed items by coverage ascending (0, 1, 2, ...)
    return a.coverage - b.coverage
  })
}

export function getWriteRelaysFromRelayInfo(relays: RelayInfo[]): string[] {
  return relays.filter((r) => r.write).map((r) => r.url)
}

export function getReadRelaysFromRelayInfo(relays: RelayInfo[]): string[] {
  return relays.filter((r) => r.read).map((r) => r.url)
}
