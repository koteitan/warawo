export type RelayStatus = 'wait' | 'connecting' | 'loading' | 'eose' | 'timeout' | 'error'

export interface RelayInfo {
  url: string
  status: RelayStatus
  read: boolean
  write: boolean
}

export interface UserProfile {
  pubkey: string
  name?: string
  display_name?: string
  picture?: string
  nip05?: string
}

export interface FolloweeAnalysis {
  profile: UserProfile
  writeRelays: string[]
  readableRelays: string[]
  unreadableRelays: string[]
  coverage: number
}

export interface RelayStatusItem {
  url: string
  status: RelayStatus
}

export interface NostrEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}
