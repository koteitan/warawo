export const BOOTSTRAP_RELAYS = [
  'wss://relay.damus.io',
  'wss://directory.yabu.me',
  'wss://yabu.me',
  'wss://purplepag.es',
  'wss://indexer.coracle.social',
  'wss://temp.iris.to',
  'wss://relay.snort.social',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://nostr.wine',
]

export const TIMEOUT_MS = 7000
export const LIMIT_EVENTS = 3
export const BATCH_SIZE_AUTHORS = 5

export const RELAY_STATUS_COLORS: Record<string, string> = {
  wait: '#808080',       // gray
  connecting: '#FFD700', // yellow
  loading: '#00FF00',    // green
  eose: '#0000FF',       // blue
  timeout: '#006400',    // dark green
  error: '#B8860B',      // dark yellow (dark goldenrod)
}

export const RELAY_STATUS_ORDER = ['wait', 'connecting', 'loading', 'eose', 'timeout', 'error'] as const
