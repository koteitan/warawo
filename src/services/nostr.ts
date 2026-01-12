import { createRxNostr, createRxBackwardReq, createRxForwardReq, noopVerifier, type RxNostr } from 'rx-nostr'
import { nip19 } from 'nostr-tools'
import { BOOTSTRAP_RELAYS, TIMEOUT_MS, LIMIT_EVENTS } from '../constants'
import type { NostrEvent, UserProfile, RelayInfo } from '../types'

let rxNostr: RxNostr | null = null

export function getRxNostr(): RxNostr {
  if (!rxNostr) {
    rxNostr = createRxNostr({ verifier: noopVerifier })
  }
  return rxNostr
}

export function normalizePubkey(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed.startsWith('npub1')) {
    try {
      const decoded = nip19.decode(trimmed)
      if (decoded.type === 'npub') {
        return decoded.data
      }
    } catch {
      return null
    }
  }
  if (/^[0-9a-f]{64}$/i.test(trimmed)) {
    return trimmed.toLowerCase()
  }
  return null
}

export function parseRelayList(event: NostrEvent): RelayInfo[] {
  const relays: RelayInfo[] = []
  for (const tag of event.tags) {
    if (tag[0] === 'r' && tag[1]) {
      const url = tag[1]
      const marker = tag[2]
      let read = true
      let write = true
      if (marker === 'read') {
        write = false
      } else if (marker === 'write') {
        read = false
      }
      relays.push({ url, read, write, status: 'wait' })
    }
  }
  return relays
}

export function parseContactList(event: NostrEvent): string[] {
  const pubkeys: string[] = []
  for (const tag of event.tags) {
    if (tag[0] === 'p' && tag[1]) {
      pubkeys.push(tag[1])
    }
  }
  return pubkeys
}

export function parseProfile(event: NostrEvent): Partial<UserProfile> {
  try {
    const content = JSON.parse(event.content)
    return {
      name: content.name,
      display_name: content.display_name,
      picture: content.picture,
      nip05: content.nip05,
    }
  } catch {
    return {}
  }
}

export async function fetchKind10002(
  pubkey: string,
  relays: string[] = BOOTSTRAP_RELAYS,
  timeoutMs: number = TIMEOUT_MS
): Promise<NostrEvent | null> {
  const client = getRxNostr()
  client.setDefaultRelays(relays)

  return new Promise((resolve) => {
    let latestEvent: NostrEvent | null = null
    const req = createRxBackwardReq()

    const subscription = client.use(req).subscribe({
      next: (packet) => {
        const event = packet.event as NostrEvent
        if (!latestEvent || event.created_at > latestEvent.created_at) {
          latestEvent = event
        }
      },
      complete: () => {
        resolve(latestEvent)
      },
    })

    req.emit([{
      kinds: [10002],
      authors: [pubkey],
      limit: LIMIT_EVENTS,
    }])

    setTimeout(() => {
      req.over()
      subscription.unsubscribe()
      resolve(latestEvent)
    }, timeoutMs)
  })
}

export async function fetchKind3(
  pubkey: string,
  relays: string[] = BOOTSTRAP_RELAYS,
  timeoutMs: number = TIMEOUT_MS
): Promise<NostrEvent | null> {
  const client = getRxNostr()
  client.setDefaultRelays(relays)

  return new Promise((resolve) => {
    let latestEvent: NostrEvent | null = null
    const req = createRxBackwardReq()

    const subscription = client.use(req).subscribe({
      next: (packet) => {
        const event = packet.event as NostrEvent
        if (!latestEvent || event.created_at > latestEvent.created_at) {
          latestEvent = event
        }
      },
      complete: () => {
        resolve(latestEvent)
      },
    })

    req.emit([{
      kinds: [3],
      authors: [pubkey],
      limit: LIMIT_EVENTS,
    }])

    setTimeout(() => {
      req.over()
      subscription.unsubscribe()
      resolve(latestEvent)
    }, timeoutMs)
  })
}

export async function fetchKind0(
  pubkey: string,
  relays: string[] = BOOTSTRAP_RELAYS,
  timeoutMs: number = TIMEOUT_MS
): Promise<NostrEvent | null> {
  const client = getRxNostr()
  client.setDefaultRelays(relays)

  return new Promise((resolve) => {
    let latestEvent: NostrEvent | null = null
    const req = createRxBackwardReq()

    const subscription = client.use(req).subscribe({
      next: (packet) => {
        const event = packet.event as NostrEvent
        if (!latestEvent || event.created_at > latestEvent.created_at) {
          latestEvent = event
        }
      },
      complete: () => {
        resolve(latestEvent)
      },
    })

    req.emit([{
      kinds: [0],
      authors: [pubkey],
      limit: LIMIT_EVENTS,
    }])

    setTimeout(() => {
      req.over()
      subscription.unsubscribe()
      resolve(latestEvent)
    }, timeoutMs)
  })
}

export interface FolloweeRelayCallback {
  onEvent: (pubkey: string, event: NostrEvent) => void
  onRelayStatus: (relay: string, status: 'connecting' | 'loading' | 'eose' | 'timeout' | 'error') => void
}

export interface ProfileCallback {
  onProfile: (pubkey: string, event: NostrEvent) => void
}

export function subscribeFolloweesKind10002(
  pubkeys: string[],
  relays: string[],
  callbacks: FolloweeRelayCallback,
  batchSize: number = 50
): () => void {
  const client = getRxNostr()
  client.setDefaultRelays(relays)

  const subscriptions: Array<{ unsubscribe: () => void }> = []
  const latestEvents = new Map<string, NostrEvent>()

  for (let i = 0; i < pubkeys.length; i += batchSize) {
    const batch = pubkeys.slice(i, i + batchSize)
    const req = createRxForwardReq()

    const subscription = client.use(req).subscribe({
      next: (packet) => {
        const event = packet.event as NostrEvent
        const existing = latestEvents.get(event.pubkey)
        if (!existing || event.created_at > existing.created_at) {
          latestEvents.set(event.pubkey, event)
          callbacks.onEvent(event.pubkey, event)
        }
      },
    })

    subscriptions.push(subscription)

    req.emit([{
      kinds: [10002],
      authors: batch,
    }])
  }

  return () => {
    subscriptions.forEach((s) => s.unsubscribe())
  }
}

export function subscribeFolloweesKind0(
  pubkeys: string[],
  relays: string[],
  callbacks: ProfileCallback,
  batchSize: number = 50
): () => void {
  const client = getRxNostr()
  client.setDefaultRelays(relays)

  const subscriptions: Array<{ unsubscribe: () => void }> = []
  const latestEvents = new Map<string, NostrEvent>()

  for (let i = 0; i < pubkeys.length; i += batchSize) {
    const batch = pubkeys.slice(i, i + batchSize)
    const req = createRxForwardReq()

    const subscription = client.use(req).subscribe({
      next: (packet) => {
        const event = packet.event as NostrEvent
        const existing = latestEvents.get(event.pubkey)
        if (!existing || event.created_at > existing.created_at) {
          latestEvents.set(event.pubkey, event)
          callbacks.onProfile(event.pubkey, event)
        }
      },
    })

    subscriptions.push(subscription)

    req.emit([{
      kinds: [0],
      authors: batch,
    }])
  }

  return () => {
    subscriptions.forEach((s) => s.unsubscribe())
  }
}
