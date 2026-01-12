import { formatRelayName } from '../utils/relay'

interface RelayListProps {
  readableRelays: string[]
  unreadableRelays: string[]
}

export function RelayList({ readableRelays, unreadableRelays }: RelayListProps) {
  const uniqueReadable = [...new Set(readableRelays)]
  const uniqueUnreadable = [...new Set(unreadableRelays)]

  return (
    <div className="relay-list">
      {uniqueReadable.map((url, index) => (
        <div key={`r-${index}-${url}`} className="relay-chip relay-readable" title={url}>
          {formatRelayName(url)}
        </div>
      ))}
      {uniqueUnreadable.map((url, index) => (
        <div key={`u-${index}-${url}`} className="relay-chip relay-unreadable" title={url}>
          {formatRelayName(url)}
        </div>
      ))}
    </div>
  )
}
