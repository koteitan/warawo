import type { FolloweeAnalysis } from '../types'
import { normalizeRelayUrl } from './relay'

export interface RecommendedRelay {
  url: string
  // recovery[k] = number of followees whose current coverage is k and who
  // write to this relay (which the user does not currently read). Adding this
  // relay to the user's read set would recover those followees.
  recovery: number[]
}

export interface RecommendedRelaysResult {
  relays: RecommendedRelay[]
  maxCoverage: number
}

/**
 * Compute recommended relays from the current analysis.
 *
 * For each analyzed followee, their `unreadableRelays` are the relays they
 * write to but the user does not read. Grouping those by relay and bucketing
 * by the followee's current coverage gives, per relay, how many followees at
 * each coverage level the user would recover by reading that relay.
 *
 * Relays are sorted lexicographically by recovery count at coverage 0, then 1,
 * then 2, ... (descending at each level).
 */
export function computeRecommendedRelays(
  analyses: FolloweeAnalysis[]
): RecommendedRelaysResult {
  const analyzed = analyses.filter((a) => a.coverage !== -1)
  const maxCoverage = analyzed.reduce((m, a) => Math.max(m, a.coverage), 0)

  // normalized url -> recovery counts by coverage
  const recoveryMap = new Map<string, number[]>()

  for (const a of analyzed) {
    const cov = a.coverage
    // de-duplicate within a followee so one followee counts once per relay
    const seen = new Set<string>()
    for (const url of a.unreadableRelays) {
      const norm = normalizeRelayUrl(url)
      if (seen.has(norm)) continue
      seen.add(norm)
      let counts = recoveryMap.get(norm)
      if (!counts) {
        counts = []
        recoveryMap.set(norm, counts)
      }
      counts[cov] = (counts[cov] || 0) + 1
    }
  }

  const relays: RecommendedRelay[] = [...recoveryMap.entries()].map(
    ([url, counts]) => {
      const recovery: number[] = []
      for (let k = 0; k <= maxCoverage; k++) recovery[k] = counts[k] || 0
      return { url, recovery }
    }
  )

  relays.sort((a, b) => {
    for (let k = 0; k <= maxCoverage; k++) {
      if (b.recovery[k] !== a.recovery[k]) return b.recovery[k] - a.recovery[k]
    }
    return 0
  })

  return { relays, maxCoverage }
}
