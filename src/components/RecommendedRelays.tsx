import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { FolloweeAnalysis } from '../types'
import { computeRecommendedRelays } from '../utils/recommendedRelays'
import { formatRelayName } from '../utils/relay'

interface RecommendedRelaysProps {
  followeeAnalyses: FolloweeAnalysis[]
  // Maximum number of recommended relays to show
  limit?: number
}

export function RecommendedRelays({ followeeAnalyses, limit = 20 }: RecommendedRelaysProps) {
  const { t } = useTranslation()
  const { relays, maxCoverage } = useMemo(
    () => computeRecommendedRelays(followeeAnalyses),
    [followeeAnalyses]
  )

  if (relays.length === 0) return null

  const shown = relays.slice(0, limit)
  const coverageCols = Array.from({ length: maxCoverage + 1 }, (_, k) => k)

  return (
    <table className="recommended-table">
      <colgroup>
        <col style={{ width: '4.2rem' }} />
        <col style={{ width: '14rem' }} />
        {coverageCols.map((k) => (
          <col key={k} style={{ width: '3.2rem' }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th rowSpan={2}>{t('table.rank')}</th>
          <th rowSpan={2}>{t('recommended.recommendedRelay')}</th>
          <th colSpan={maxCoverage + 1}>{t('recommended.recoveryCount')}</th>
        </tr>
        <tr>
          {coverageCols.map((k) => (
            <th key={k}>{k === 0 ? `${t('table.coverage')}0` : k}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {shown.map((relay, index) => (
          <tr key={relay.url}>
            <td className="rank-cell">{index + 1}</td>
            <td className="recommended-relay-cell" title={relay.url}>
              {formatRelayName(relay.url)}
            </td>
            {coverageCols.map((k) => (
              <td key={k} className="recovery-cell">
                {relay.recovery[k] || 0}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
