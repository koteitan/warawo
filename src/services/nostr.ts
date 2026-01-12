import { createRxNostr, createRxBackwardReq, noopVerifier, type RxNostr } from 'rx-nostr'
import { nip19 } from 'nostr-tools'
import { BOOTSTRAP_RELAYS, TIMEOUT_MS, LIMIT_EVENTS } from '../constants'
import type { NostrEvent, UserProfile, RelayInfo } from '../types'

let rxNostr: RxNostr | null = null

// Track relay failure counts (use normalized URLs for consistent matching)
const relayFailureCounts = new Map<string, number>()
const MAX_RELAY_FAILURES = 3

function normalizeRelayUrlForTracking(url: string): string {
  return url.trim().toLowerCase().replace(/\/$/, '')
}

export function recordRelayFailure(relayUrl: string): void {
  const normalized = normalizeRelayUrlForTracking(relayUrl)
  const count = relayFailureCounts.get(normalized) || 0
  relayFailureCounts.set(normalized, count + 1)
  if (count + 1 >= MAX_RELAY_FAILURES) {
    // Relay excluded due to failures
  }
}

export function filterHealthyRelays(relays: string[]): string[] {
  return relays.filter((url) => {
    const normalized = normalizeRelayUrlForTracking(url)
    const failures = relayFailureCounts.get(normalized) || 0
    return failures < MAX_RELAY_FAILURES
  })
}

export function resetRelayFailures(): void {
  relayFailureCounts.clear()
}

export function dumpRelayFailures(): void {
  console.log(`=== Relay Failure Counts ===`)
  console.log(`MAX_RELAY_FAILURES: ${MAX_RELAY_FAILURES}`)
  if (relayFailureCounts.size === 0) {
    console.log('No failures recorded')
  } else {
    relayFailureCounts.forEach((count, url) => {
      const status = count >= MAX_RELAY_FAILURES ? 'EXCLUDED' : 'active'
      console.log(`  ${url}: ${count} failures [${status}]`)
    })
  }
}

// Track queue status for debugging
interface QueueStatus {
  requestedPubkeys: string[]
  receivedPubkeys: Set<string>
}

const queue10002Status: QueueStatus = {
  requestedPubkeys: [],
  receivedPubkeys: new Set(),
}

const queue0Status: QueueStatus = {
  requestedPubkeys: [],
  receivedPubkeys: new Set(),
}

// Track subscription status for debugging
interface SubStatus {
  id: string
  purpose: string
  kind: number
  relay: string
  filter: string
  status: 'working' | 'EOSE' | 'error' | 'timeout'
  errorMsg?: string
}

const subscriptionStatuses: SubStatus[] = []
let subIdCounter = 0

export function recordSubStart(id: string, purpose: string, kind: number, relay: string, authors: string[]): void {
  const filter = `authors:[${authors.map(a => a.slice(0, 8)).join(',')}]`
  subscriptionStatuses.push({
    id,
    purpose,
    kind,
    relay,
    filter,
    status: 'working',
  })
}

export function recordSubStatus(id: string, relay: string, status: 'EOSE' | 'error' | 'timeout', errorMsg?: string): void {
  const sub = subscriptionStatuses.find(s => s.id === id && s.relay === relay)
  if (sub) {
    sub.status = status
    if (errorMsg) sub.errorMsg = errorMsg
  } else {
    // Add new entry for this relay
    const existing = subscriptionStatuses.find(s => s.id === id)
    if (existing) {
      subscriptionStatuses.push({
        ...existing,
        relay,
        status,
        errorMsg,
      })
    }
  }
}

export function recordSubEOSE(id: string, relay: string): void {
  recordSubStatus(id, relay, 'EOSE')
}

export function recordSubError(id: string, relay: string, errorMsg: string): void {
  recordSubStatus(id, relay, 'error', errorMsg)
}

export function clearSubStatuses(): void {
  subscriptionStatuses.length = 0
  subIdCounter = 0
}

export function dumpsub(): void {
  console.log(`=== Subscription Status ===`)

  const finished = subscriptionStatuses.filter(s => s.status !== 'working')
  const working = subscriptionStatuses.filter(s => s.status === 'working')

  console.log(`finished subscriptions: (${finished.length})`)
  console.log(`----------------`)
  for (const sub of finished) {
    const errInfo = sub.errorMsg ? ` (${sub.errorMsg})` : ''
    console.log(`  purpose:${sub.purpose}, relay:${sub.relay}, kind:${sub.kind}, filter:${sub.filter}, status:${sub.status}${errInfo}`)
  }

  console.log(`working subscriptions: (${working.length})`)
  console.log(`----------------`)
  for (const sub of working) {
    console.log(`  purpose:${sub.purpose}, relay:${sub.relay}, kind:${sub.kind}, filter:${sub.filter}, status:${sub.status}`)
  }
}

export function dumpqueue10002(): void {
  const requested = queue10002Status.requestedPubkeys.length
  const received = queue10002Status.receivedPubkeys.size
  const pending = requested - received
  console.log(`=== kind:10002 Queue Status ===`)
  console.log(`Requested: ${requested}, Received: ${received}, Pending: ${pending}`)
  console.log(`--- Received pubkeys (${received}): ---`)
  queue10002Status.receivedPubkeys.forEach((pubkey) => {
    console.log(`  ${pubkey}`)
  })
  console.log(`--- Pending pubkeys (${pending}): ---`)
  queue10002Status.requestedPubkeys.forEach((pubkey) => {
    if (!queue10002Status.receivedPubkeys.has(pubkey)) {
      console.log(`  ${pubkey}`)
    }
  })
}

export function dumpqueue0(): void {
  const requested = queue0Status.requestedPubkeys.length
  const received = queue0Status.receivedPubkeys.size
  const pending = requested - received
  console.log(`=== kind:0 Queue Status ===`)
  console.log(`Requested: ${requested}, Received: ${received}, Pending: ${pending}`)
  console.log(`--- Received pubkeys (${received}): ---`)
  queue0Status.receivedPubkeys.forEach((pubkey) => {
    console.log(`  ${pubkey}`)
  })
  console.log(`--- Pending pubkeys (${pending}): ---`)
  queue0Status.requestedPubkeys.forEach((pubkey) => {
    if (!queue0Status.receivedPubkeys.has(pubkey)) {
      console.log(`  ${pubkey}`)
    }
  })
}

export function dumpStatus(): void {
  console.log(`\n========== WARAWO STATUS ==========`)

  // Queue status summary
  const req10002 = queue10002Status.requestedPubkeys.length
  const recv10002 = queue10002Status.receivedPubkeys.size
  const req0 = queue0Status.requestedPubkeys.length
  const recv0 = queue0Status.receivedPubkeys.size

  console.log(`\n--- Queue Summary ---`)
  console.log(`kind:10002 (relay lists): ${recv10002}/${req10002} received`)
  console.log(`kind:0 (profiles): ${recv0}/${req0} received`)

  // Relay failures
  console.log(`\n--- Relay Failures ---`)
  console.log(`MAX_RELAY_FAILURES: ${MAX_RELAY_FAILURES}`)
  const excludedRelays: string[] = []
  const activeRelays: string[] = []
  relayFailureCounts.forEach((count, url) => {
    if (count >= MAX_RELAY_FAILURES) {
      excludedRelays.push(`${url} (${count})`)
    } else {
      activeRelays.push(`${url} (${count})`)
    }
  })
  console.log(`Excluded relays (${excludedRelays.length}): ${excludedRelays.join(', ') || 'none'}`)
  console.log(`Active relays with failures (${activeRelays.length}): ${activeRelays.join(', ') || 'none'}`)

  // Connection states
  if (rxNostr) {
    console.log(`\n--- Connection States ---`)
    const states = rxNostr.getAllRelayStatus()
    for (const [url, state] of Object.entries(states)) {
      // state is an object with connection property
      const stateStr = typeof state === 'object' ? JSON.stringify(state) : state
      console.log(`  ${url}: ${stateStr}`)
    }
  }

  console.log(`\n====================================\n`)
}

export function getRxNostr(): RxNostr {
  if (!rxNostr) {
    rxNostr = createRxNostr({ verifier: noopVerifier })
    // Monitor connection state changes to track failures
    rxNostr.createConnectionStateObservable().subscribe({
      next: (state) => {
        if (state.state === 'error' || state.state === 'rejected') {
          recordRelayFailure(state.from)
        }
      },
    })
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

function isLocalRelay(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    return host === '127.0.0.1' || host === 'localhost' || host.startsWith('192.168.') || host.startsWith('10.')
  } catch {
    return false
  }
}

export function parseRelayList(event: NostrEvent): RelayInfo[] {
  const relays: RelayInfo[] = []
  for (const tag of event.tags) {
    if (tag[0] === 'r' && tag[1]) {
      // Normalize URL on load
      const url = normalizeRelayUrlForTracking(tag[1])
      // Skip local relays
      if (isLocalRelay(url)) {
        continue
      }
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
  const healthyRelays = filterHealthyRelays(relays)
  if (healthyRelays.length === 0) {
    return null
  }
  client.setDefaultRelays(healthyRelays)

  // Track subscription for each relay
  const subId = `fetch-10002-${pubkey.slice(0, 8)}`
  for (const relay of healthyRelays) {
    recordSubStart(subId, 'user relay list', 10002, relay, [pubkey])
  }
  const relaysResponded = new Set<string>()

  return new Promise((resolve) => {
    let resolved = false
    const req = createRxBackwardReq()

    const subscription = client.use(req).subscribe({
      next: (packet) => {
        relaysResponded.add(packet.from)
        if (!resolved) {
          resolved = true
          req.over()
          subscription.unsubscribe()
          // Mark all relays as EOSE
          for (const relay of healthyRelays) {
            recordSubEOSE(subId, relay)
          }
          resolve(packet.event as NostrEvent)
        }
      },
      complete: () => {
        if (!resolved) {
          resolved = true
          for (const relay of healthyRelays) {
            recordSubEOSE(subId, relay)
          }
          resolve(null)
        }
      },
    })

    req.emit([{
      kinds: [10002],
      authors: [pubkey],
      limit: LIMIT_EVENTS,
    }])
    req.over()

    setTimeout(() => {
      if (!resolved) {
        resolved = true
        subscription.unsubscribe()
        for (const relay of healthyRelays) {
          if (!relaysResponded.has(relay)) {
            recordSubStatus(subId, relay, 'timeout')
          } else {
            recordSubEOSE(subId, relay)
          }
        }
        resolve(null)
      }
    }, timeoutMs)
  })
}

export async function fetchKind3(
  pubkey: string,
  relays: string[] = BOOTSTRAP_RELAYS,
  timeoutMs: number = TIMEOUT_MS
): Promise<NostrEvent | null> {
  const client = getRxNostr()
  const healthyRelays = filterHealthyRelays(relays)
  if (healthyRelays.length === 0) {
    return null
  }
  client.setDefaultRelays(healthyRelays)

  // Track subscription for each relay
  const subId = `fetch-3-${pubkey.slice(0, 8)}`
  for (const relay of healthyRelays) {
    recordSubStart(subId, 'user contact list', 3, relay, [pubkey])
  }
  const relaysResponded = new Set<string>()

  return new Promise((resolve) => {
    let resolved = false
    const req = createRxBackwardReq()

    const subscription = client.use(req).subscribe({
      next: (packet) => {
        relaysResponded.add(packet.from)
        if (!resolved) {
          resolved = true
          req.over()
          subscription.unsubscribe()
          for (const relay of healthyRelays) {
            recordSubEOSE(subId, relay)
          }
          resolve(packet.event as NostrEvent)
        }
      },
      complete: () => {
        if (!resolved) {
          resolved = true
          for (const relay of healthyRelays) {
            recordSubEOSE(subId, relay)
          }
          resolve(null)
        }
      },
    })

    req.emit([{
      kinds: [3],
      authors: [pubkey],
      limit: LIMIT_EVENTS,
    }])
    req.over()

    setTimeout(() => {
      if (!resolved) {
        resolved = true
        subscription.unsubscribe()
        for (const relay of healthyRelays) {
          if (!relaysResponded.has(relay)) {
            recordSubStatus(subId, relay, 'timeout')
          } else {
            recordSubEOSE(subId, relay)
          }
        }
        resolve(null)
      }
    }, timeoutMs)
  })
}

export async function fetchKind0(
  pubkey: string,
  relays: string[] = BOOTSTRAP_RELAYS,
  timeoutMs: number = TIMEOUT_MS
): Promise<NostrEvent | null> {
  const client = getRxNostr()
  const healthyRelays = filterHealthyRelays(relays)
  if (healthyRelays.length === 0) {
    return null
  }
  client.setDefaultRelays(healthyRelays)

  // Track subscription for each relay
  const subId = `fetch-0-${pubkey.slice(0, 8)}`
  for (const relay of healthyRelays) {
    recordSubStart(subId, 'user profile', 0, relay, [pubkey])
  }
  const relaysResponded = new Set<string>()

  return new Promise((resolve) => {
    let resolved = false
    const req = createRxBackwardReq()

    const subscription = client.use(req).subscribe({
      next: (packet) => {
        relaysResponded.add(packet.from)
        if (!resolved) {
          resolved = true
          req.over()
          subscription.unsubscribe()
          for (const relay of healthyRelays) {
            recordSubEOSE(subId, relay)
          }
          resolve(packet.event as NostrEvent)
        }
      },
      complete: () => {
        if (!resolved) {
          resolved = true
          for (const relay of healthyRelays) {
            recordSubEOSE(subId, relay)
          }
          resolve(null)
        }
      },
    })

    req.emit([{
      kinds: [0],
      authors: [pubkey],
      limit: LIMIT_EVENTS,
    }])
    req.over()

    setTimeout(() => {
      if (!resolved) {
        resolved = true
        subscription.unsubscribe()
        for (const relay of healthyRelays) {
          if (!relaysResponded.has(relay)) {
            recordSubStatus(subId, relay, 'timeout')
          } else {
            recordSubEOSE(subId, relay)
          }
        }
        resolve(null)
      }
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
  batchSize: number = 3
): () => void {
  const client = getRxNostr()
  const healthyRelays = filterHealthyRelays(relays)
  if (healthyRelays.length === 0) {
    return () => {}
  }
  client.setDefaultRelays(healthyRelays)

  // Track queue status
  queue10002Status.requestedPubkeys = [...pubkeys]
  queue10002Status.receivedPubkeys.clear()

  const latestEvents = new Map<string, NostrEvent>()
  let cancelled = false
  let currentSubscription: { unsubscribe: () => void } | null = null

  const totalBatches = Math.ceil(pubkeys.length / batchSize)

  const processBatch = (batchIndex: number) => {
    if (cancelled || batchIndex >= totalBatches) {
      return
    }

    const start = batchIndex * batchSize
    const batch = pubkeys.slice(start, start + batchSize)
    const req = createRxBackwardReq()

    // Record subscription start for each relay
    const subId = `10002-batch-${batchIndex}`
    for (const relay of healthyRelays) {
      recordSubStart(subId, 'followee relay list', 10002, relay, batch)
    }

    const relaysResponded = new Set<string>()

    currentSubscription = client.use(req).subscribe({
      next: (packet) => {
        const event = packet.event as NostrEvent
        relaysResponded.add(packet.from)
        const existing = latestEvents.get(event.pubkey)
        if (!existing || event.created_at > existing.created_at) {
          latestEvents.set(event.pubkey, event)
          queue10002Status.receivedPubkeys.add(event.pubkey)
          callbacks.onEvent(event.pubkey, event)
        }
      },
      error: (err) => {
        for (const relay of healthyRelays) {
          recordSubError(subId, relay, String(err))
        }
        processBatch(batchIndex + 1)
      },
      complete: () => {
        // Mark relays that responded as EOSE, others as no response
        for (const relay of healthyRelays) {
          if (relaysResponded.has(relay)) {
            recordSubEOSE(subId, relay)
          } else {
            recordSubStatus(subId, relay, 'EOSE')
          }
        }
        processBatch(batchIndex + 1)
      },
    })

    req.emit([{
      kinds: [10002],
      authors: batch,
    }])
    req.over()
  }

  // Start processing first batch
  processBatch(0)

  return () => {
    cancelled = true
    if (currentSubscription) {
      currentSubscription.unsubscribe()
    }
  }
}

export function subscribeFolloweesKind0(
  pubkeys: string[],
  relays: string[],
  callbacks: ProfileCallback,
  batchSize: number = 3
): () => void {
  const client = getRxNostr()
  const healthyRelays = filterHealthyRelays(relays)
  if (healthyRelays.length === 0) {
    return () => {}
  }
  client.setDefaultRelays(healthyRelays)

  // Track queue status
  queue0Status.requestedPubkeys = [...pubkeys]
  queue0Status.receivedPubkeys.clear()

  const latestEvents = new Map<string, NostrEvent>()
  let cancelled = false
  let currentSubscription: { unsubscribe: () => void } | null = null

  const totalBatches = Math.ceil(pubkeys.length / batchSize)

  const processBatch = (batchIndex: number) => {
    if (cancelled || batchIndex >= totalBatches) {
      return
    }

    const start = batchIndex * batchSize
    const batch = pubkeys.slice(start, start + batchSize)
    const req = createRxBackwardReq()

    // Record subscription start for each relay
    const subId = `0-batch-${batchIndex}`
    for (const relay of healthyRelays) {
      recordSubStart(subId, 'followee profile', 0, relay, batch)
    }
    const relaysResponded = new Set<string>()

    currentSubscription = client.use(req).subscribe({
      next: (packet) => {
        const event = packet.event as NostrEvent
        relaysResponded.add(packet.from)
        const existing = latestEvents.get(event.pubkey)
        if (!existing || event.created_at > existing.created_at) {
          latestEvents.set(event.pubkey, event)
          queue0Status.receivedPubkeys.add(event.pubkey)
          callbacks.onProfile(event.pubkey, event)
        }
      },
      error: (err) => {
        for (const relay of healthyRelays) {
          recordSubError(subId, relay, String(err))
        }
        processBatch(batchIndex + 1)
      },
      complete: () => {
        for (const relay of healthyRelays) {
          recordSubEOSE(subId, relay)
        }
        processBatch(batchIndex + 1)
      },
    })

    req.emit([{
      kinds: [0],
      authors: batch,
    }])
    req.over()
  }

  // Start processing first batch
  processBatch(0)

  return () => {
    cancelled = true
    if (currentSubscription) {
      currentSubscription.unsubscribe()
    }
  }
}
