import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { FolloweeAnalysis } from '../types'
import { computeRecommendedRelays } from '../utils/recommendedRelays'

interface RecommendedRelaysProps {
  followeeAnalyses: FolloweeAnalysis[]
  // Maximum number of recommended relays (ranks) to show
  limit?: number
}

// Bar colors: cf = bright green fill, cb = dark gray remainder
const CF = '#4ade80'
const CB = '#3f3f46'

function RecoveryBar({ value, max }: { value: number; max: number }) {
  const p = max > 0 ? (value / max) * 100 : 0
  // Place the number to the right of the fill boundary by default; once the
  // bar is more than half full, place it to the left so it stays on the bar.
  const onLeft = p > 50
  const labelStyle = onLeft
    ? { right: `${100 - p}%`, color: CB }
    : { left: `${p}%`, color: CF }

  return (
    <div
      className="recovery-bar"
      style={{ background: `linear-gradient(to right, ${CF} ${p}%, ${CB} ${p}%)` }}
    >
      <span className={`recovery-bar-label ${onLeft ? 'on-left' : 'on-right'}`} style={labelStyle}>
        {value}
      </span>
    </div>
  )
}

export function RecommendedRelays({ followeeAnalyses, limit = 10 }: RecommendedRelaysProps) {
  const { t } = useTranslation()
  const { relays, maxCoverage } = useMemo(
    () => computeRecommendedRelays(followeeAnalyses),
    [followeeAnalyses]
  )

  if (relays.length === 0) return null

  const shown = relays.slice(0, limit)
  // Coverage columns: 0..min(3, maxCoverage)
  const lastCol = Math.min(3, maxCoverage)
  const coverageCols = Array.from({ length: lastCol + 1 }, (_, k) => k)

  // Per-row total recovery across ALL coverage levels (not just shown columns)
  const totals = shown.map((r) => r.recovery.reduce((s, x) => s + (x || 0), 0))

  // Each column's bar max = max recovery at that coverage among shown relays
  const coverageMax = coverageCols.map((k) =>
    Math.max(0, ...shown.map((r) => r.recovery[k] || 0))
  )
  const totalMax = Math.max(0, ...totals)

  return (
    <table className="recommended-table">
      <colgroup>
        <col style={{ width: '4.2rem' }} />
        <col />
        {coverageCols.map((k) => (
          <col key={k} style={{ width: '5.5rem' }} />
        ))}
        <col style={{ width: '5.5rem' }} />
      </colgroup>
      <thead>
        <tr>
          <th rowSpan={2}>{t('table.rank')}</th>
          <th rowSpan={2}>{t('recommended.recommendedRelay')}</th>
          <th colSpan={coverageCols.length + 1}>{t('recommended.recoveryCount')}</th>
        </tr>
        <tr>
          {coverageCols.map((k) => (
            <th key={k}>{k === 0 ? `${t('table.coverage')}0` : k}</th>
          ))}
          <th>{t('recommended.all')}</th>
        </tr>
      </thead>
      <tbody>
        {shown.map((relay, index) => (
          <tr key={relay.url}>
            <td className="rank-cell">{index + 1}</td>
            <td className="recommended-relay-cell" title={relay.url}>
              {relay.url}
            </td>
            {coverageCols.map((k) => (
              <td key={k} className="recovery-cell">
                <RecoveryBar value={relay.recovery[k] || 0} max={coverageMax[k]} />
              </td>
            ))}
            <td className="recovery-cell">
              <RecoveryBar value={totals[index]} max={totalMax} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
