import type { FolloweeAnalysis, UserProfile, RelayInfo } from '../types'
import { formatRelayName } from './relay'

function calculateRanks(analyses: FolloweeAnalysis[]): (number | null)[] {
  if (analyses.length === 0) return []

  const ranks: (number | null)[] = []
  let currentRank = 1
  let prevAnalyzedCoverage: number | null = null
  let prevAnalyzedRank: number | null = null
  let analyzedCount = 0

  for (let i = 0; i < analyses.length; i++) {
    if (analyses[i].coverage === -1) {
      ranks.push(null)
    } else {
      analyzedCount++
      if (prevAnalyzedCoverage !== null && analyses[i].coverage === prevAnalyzedCoverage) {
        ranks.push(prevAnalyzedRank)
      } else {
        currentRank = analyzedCount
        ranks.push(currentRank)
        prevAnalyzedRank = currentRank
      }
      prevAnalyzedCoverage = analyses[i].coverage
    }
  }

  return ranks
}

export function dump(
  userProfile: UserProfile | null,
  userRelays: RelayInfo[],
  followeeAnalyses: FolloweeAnalysis[]
): void {
  // Output user info first
  if (userProfile) {
    const iconUrl = userProfile.picture || '-'
    const name = userProfile.name || '-'
    const displayName = userProfile.display_name || '-'
    const userReadRelays = userRelays.filter((r) => r.read).map((r) => formatRelayName(r.url))
    const relayList = userReadRelays.join(', ') || '-'
    console.log(`, user, -, ${iconUrl}, ${name}, ${displayName}, , ${relayList}`)
  }

  // Output followee info
  const ranks = calculateRanks(followeeAnalyses)

  for (let i = 0; i < followeeAnalyses.length; i++) {
    const analysis = followeeAnalyses[i]
    const seq = i + 1
    const rank = ranks[i] !== null ? ranks[i] : '-'
    const iconUrl = analysis.profile.picture || '-'
    const name = analysis.profile.name || '-'
    const displayName = analysis.profile.display_name || '-'
    const coverage = analysis.coverage === -1 ? '-' : analysis.coverage

    // Build relay list with R/N markers
    const relayResults: string[] = []
    for (const relay of analysis.readableRelays) {
      relayResults.push(`${formatRelayName(relay)}:R`)
    }
    for (const relay of analysis.unreadableRelays) {
      relayResults.push(`${formatRelayName(relay)}:N`)
    }
    const relayList = relayResults.join(', ') || '-'

    console.log(`${seq}, ${rank}, ${iconUrl}, ${name}, ${displayName}, ${coverage}, ${relayList}`)
  }
}
