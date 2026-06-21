import type { RelayStatusItem } from '../types'
import { RELAY_STATUS_COLORS } from '../constants'

interface RelayStatusBarProps {
  statuses: RelayStatusItem[]
}

export function RelayStatusBar({ statuses }: RelayStatusBarProps) {
  // Render in accumulation (insertion) order so the bar grows across batches
  return (
    <div className="relay-status-bar">
      {statuses.map((item) => (
        <span
          key={item.id}
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
