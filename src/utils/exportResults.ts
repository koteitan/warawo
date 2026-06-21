import type { FolloweeAnalysis, UserProfile } from '../types'
import { hexToNpub } from './pubkey'
import { VERSION_NAME } from '../version'

interface ExportOptions {
  userProfile: UserProfile | null
  followeeAnalyses: FolloweeAnalysis[]
  useKind10002: boolean
  useKind3: boolean
}

interface ExportRelay {
  url: string
  readable: boolean
}

interface ExportFollowee {
  npub: string
  display_name: string | null
  name: string | null
  connections: number | null
  relays: ExportRelay[]
}

interface ExportResult {
  app: string
  version: string
  generated_at: string
  user_npub: string | null
  kinds: number[]
  followee_count: number
  followees: ExportFollowee[]
}

export function buildExportResult({
  userProfile,
  followeeAnalyses,
  useKind10002,
  useKind3,
}: ExportOptions): ExportResult {
  const kinds: number[] = []
  if (useKind10002) kinds.push(10002)
  if (useKind3) kinds.push(3)

  const followees: ExportFollowee[] = followeeAnalyses.map((a) => {
    const isAnalyzed = a.coverage !== -1
    const relays: ExportRelay[] = isAnalyzed
      ? [
          ...a.readableRelays.map((url) => ({ url, readable: true })),
          ...a.unreadableRelays.map((url) => ({ url, readable: false })),
        ]
      : []
    return {
      npub: hexToNpub(a.profile.pubkey),
      display_name: a.profile.display_name ?? null,
      name: a.profile.name ?? null,
      connections: isAnalyzed ? a.coverage : null,
      relays,
    }
  })

  return {
    app: 'warawo',
    version: VERSION_NAME,
    generated_at: new Date().toISOString(),
    user_npub: userProfile ? hexToNpub(userProfile.pubkey) : null,
    kinds,
    followee_count: followees.length,
    followees,
  }
}

export function downloadResults(options: ExportOptions): void {
  const result = buildExportResult(options)
  const json = JSON.stringify(result, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `warawo-${result.generated_at.replace(/[:.]/g, '-')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
