import { useState, useEffect } from 'react'
import type { FolloweeAnalysis } from '../types'
import { RelayList } from './RelayList'
import { hexToNpub } from '../utils/pubkey'

interface FolloweeRowProps {
  rank: number | null
  analysis: FolloweeAnalysis
}

export function FolloweeRow({ rank, analysis }: FolloweeRowProps) {
  const { profile, coverage, readableRelays, unreadableRelays } = analysis
  const isAnalyzed = coverage !== -1
  const npub = hexToNpub(profile.pubkey)
  const nostterUrl = `https://nostter.app/${npub}`
  const [imgError, setImgError] = useState(false)

  // Reset error state when picture URL changes
  useEffect(() => {
    setImgError(false)
  }, [profile.picture])

  return (
    <tr className="followee-row">
      <td className="rank-cell">{rank !== null ? rank : '-'}</td>
      <td className="icon-cell">
        <a href={nostterUrl} target="_blank" rel="noopener noreferrer">
          {profile.picture && !imgError ? (
            <img
              src={profile.picture}
              alt=""
              className="followee-icon"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="followee-icon-placeholder" />
          )}
        </a>
      </td>
      <td className="name-cell">
        <a href={nostterUrl} target="_blank" rel="noopener noreferrer">
          {profile.name || '-'}
        </a>
      </td>
      <td className="display-name-cell">
        <a href={nostterUrl} target="_blank" rel="noopener noreferrer">
          {profile.display_name || '-'}
        </a>
      </td>
      <td className="coverage-cell">
        {isAnalyzed ? (
          <span className={coverage === 0 ? 'coverage-zero' : ''}>
            {coverage}
          </span>
        ) : (
          '-'
        )}
      </td>
      <td className="relays-cell">
        {isAnalyzed && (
          <RelayList readableRelays={readableRelays} unreadableRelays={unreadableRelays} />
        )}
      </td>
    </tr>
  )
}
