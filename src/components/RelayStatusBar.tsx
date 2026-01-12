import type { RelayStatusItem } from '../types'
import { RELAY_STATUS_COLORS, RELAY_STATUS_ORDER } from '../constants'

interface RelayStatusBarProps {
  statuses: RelayStatusItem[]
}

export function RelayStatusBar({ statuses }: RelayStatusBarProps) {
  const sortedStatuses = [...statuses].sort((a, b) => {
    const orderA = RELAY_STATUS_ORDER.indexOf(a.status as typeof RELAY_STATUS_ORDER[number])
    const orderB = RELAY_STATUS_ORDER.indexOf(b.status as typeof RELAY_STATUS_ORDER[number])
    return orderA - orderB
  })

  return (
    <div className="relay-status-bar">
      {sortedStatuses.map((item) => (
        <span
          key={item.url}
          className="relay-status-char"
          style={{ color: RELAY_STATUS_COLORS[item.status] }}
          title={`${item.url}: ${item.status}`}
        >
          █
        </span>
      ))}
    </div>
  )
}
