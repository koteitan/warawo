import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { UserProfile, RelayInfo, FolloweeAnalysis } from '../types'
import { FolloweeRow } from './FolloweeRow'
import { RelayList } from './RelayList'
import { hexToNpub } from '../utils/pubkey'

interface AnalysisTableProps {
  userProfile: UserProfile | null
  userRelays: RelayInfo[]
  followeeAnalyses: FolloweeAnalysis[]
}

function UserRow({ profile, readRelays, t }: { profile: UserProfile; readRelays: string[]; t: (key: string) => string }) {
  const [imgError, setImgError] = useState(false)
  const npub = hexToNpub(profile.pubkey)
  const nostterUrl = `https://nostter.app/${npub}`

  // Reset error state when picture URL changes
  useEffect(() => {
    setImgError(false)
  }, [profile.picture])

  return (
    <tr className="user-row">
      <td className="rank-cell">{t('table.you')}</td>
      <td className="icon-cell">
        <a href={nostterUrl} target="_blank" rel="noopener noreferrer">
          {profile.picture && !imgError ? (
            <img
              src={profile.picture}
              alt=""
              className="user-table-icon"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="user-icon-placeholder" />
          )}
        </a>
      </td>
      <td className="name-cell">
        <a href={nostterUrl} target="_blank" rel="noopener noreferrer" title={profile.name || undefined}>
          {profile.name || '-'}
        </a>
      </td>
      <td className="display-name-cell">
        <a href={nostterUrl} target="_blank" rel="noopener noreferrer" title={profile.display_name || undefined}>
          {profile.display_name || '-'}
        </a>
      </td>
      <td className="coverage-cell">-</td>
      <td className="relays-cell">
        <RelayList readableRelays={readRelays} unreadableRelays={[]} />
      </td>
    </tr>
  )
}

function calculateRanks(analyses: FolloweeAnalysis[]): (number | null)[] {
  if (analyses.length === 0) return []

  const ranks: (number | null)[] = []
  let currentRank = 1
  let prevAnalyzedCoverage: number | null = null
  let prevAnalyzedRank: number | null = null
  let analyzedCount = 0

  for (let i = 0; i < analyses.length; i++) {
    // coverage === -1 means not analyzed yet
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

export function AnalysisTable({
  userProfile,
  userRelays,
  followeeAnalyses,
}: AnalysisTableProps) {
  const { t } = useTranslation()

  const userReadRelays = userRelays.filter((r) => r.read).map((r) => r.url)
  const ranks = calculateRanks(followeeAnalyses)

  return (
    <table className="analysis-table">
      <colgroup>
        <col style={{ width: '4.2rem' }} />
        <col style={{ width: '40px' }} />
        <col style={{ width: '11.2rem' }} />
        <col style={{ width: '14rem' }} />
        <col style={{ width: '4.2rem' }} />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th>{t('table.rank')}</th>
          <th></th>
          <th>{t('table.name')}</th>
          <th>{t('table.displayName')}</th>
          <th>{t('table.coverage')}</th>
          <th>{t('table.relays')}</th>
        </tr>
      </thead>
      <tbody>
        {userProfile && (
          <UserRow profile={userProfile} readRelays={userReadRelays} t={t} />
        )}
        {followeeAnalyses.map((analysis, index) => (
          <FolloweeRow
            key={analysis.profile.pubkey}
            rank={ranks[index]}
            analysis={analysis}
          />
        ))}
      </tbody>
    </table>
  )
}
