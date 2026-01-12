import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchKind10002,
  fetchKind3,
  fetchKind0,
  parseRelayList,
  parseRelayListFromKind3,
  parseContactList,
  parseProfile,
  subscribeFolloweesRelayList,
  subscribeFolloweesKind0,
  normalizePubkey,
  clearSubStatuses,
} from '../services/nostr'
import { getCachedProfile, saveProfileToCache } from '../services/profileCache'
import { getPublicKeyFromExtension } from '../services/nip07'
import { sortFolloweesByCoverage, getReadRelaysFromRelayInfo } from '../utils/coverage'
import { normalizeRelayUrl } from '../utils/relay'
import { BOOTSTRAP_RELAYS, BATCH_SIZE_AUTHORS } from '../constants'
import type { UserProfile, RelayInfo, FolloweeAnalysis, RelayStatusItem, NostrEvent } from '../types'

export interface UseNostrState {
  pubkey: string
  userProfile: UserProfile | null
  userRelays: RelayInfo[]
  followees: string[]
  followeeAnalyses: FolloweeAnalysis[]
  relayStatuses: RelayStatusItem[]
  isLoading: boolean
  isAnalyzing: boolean
  canAnalyze: boolean
  statusMessage: string
}

export function useNostr() {
  const { t } = useTranslation()
  const [state, setState] = useState<UseNostrState>({
    pubkey: '',
    userProfile: null,
    userRelays: [],
    followees: [],
    followeeAnalyses: [],
    relayStatuses: [],
    isLoading: false,
    isAnalyzing: false,
    canAnalyze: false,
    statusMessage: '',
  })

  const unsubscribeRelaysRef = useRef<(() => void) | null>(null)
  const unsubscribeProfilesRef = useRef<(() => void) | null>(null)
  const followeeRelaysRef = useRef<Map<string, NostrEvent>>(new Map())
  const userReadRelaysRef = useRef<string[]>([])
  const isLoadingRef = useRef(false)

  useEffect(() => {
    return () => {
      if (unsubscribeRelaysRef.current) {
        unsubscribeRelaysRef.current()
      }
      if (unsubscribeProfilesRef.current) {
        unsubscribeProfilesRef.current()
      }
    }
  }, [])

  const loadFromExtension = useCallback(async () => {
    const pk = await getPublicKeyFromExtension()
    if (pk) {
      setState((s) => ({ ...s, pubkey: pk }))
      return pk
    }
    return null
  }, [])

  const setPubkey = useCallback((pk: string) => {
    setState((s) => ({ ...s, pubkey: pk }))
  }, [])

  const loadUserData = useCallback(async (inputPubkey: string, options?: { skipProfiles?: boolean }) => {
    // Skip if already loading (prevents React StrictMode double-call issues)
    if (isLoadingRef.current) {
      return
    }
    isLoadingRef.current = true
    const skipProfiles = options?.skipProfiles ?? false

    const pubkey = normalizePubkey(inputPubkey)
    if (!pubkey) {
      isLoadingRef.current = false
      setState((s) => ({ ...s, statusMessage: 'Invalid pubkey' }))
      return
    }

    // Cleanup previous subscriptions
    if (unsubscribeRelaysRef.current) {
      unsubscribeRelaysRef.current()
      unsubscribeRelaysRef.current = null
    }
    if (unsubscribeProfilesRef.current) {
      unsubscribeProfilesRef.current()
      unsubscribeProfilesRef.current = null
    }

    // Clear subscription status tracking
    clearSubStatuses()

    followeeRelaysRef.current.clear()

    setState((s) => ({
      ...s,
      pubkey,
      isLoading: true,
      isAnalyzing: false,
      canAnalyze: false,
      statusMessage: t('messages.loadingRelays'),
      userProfile: null,
      userRelays: [],
      followees: [],
      followeeAnalyses: [],
      relayStatuses: [],
    }))

    // Fetch user's relay list and profile
    const [relayEvent, profileEvent] = await Promise.all([
      fetchKind10002(pubkey),
      fetchKind0(pubkey),
    ])

    let userRelays: RelayInfo[] = []
    if (relayEvent) {
      userRelays = parseRelayList(relayEvent)
    }

    const allRelays = [...new Set([...userRelays.map((r) => r.url), ...BOOTSTRAP_RELAYS])]
    userReadRelaysRef.current = getReadRelaysFromRelayInfo(userRelays)

    let userProfile: UserProfile = { pubkey }
    if (profileEvent) {
      userProfile = { pubkey, ...parseProfile(profileEvent) }
    }

    setState((s) => ({
      ...s,
      userProfile,
      userRelays,
      statusMessage: t('messages.loadingFollowees'),
    }))

    // Fetch followees (kind:3)
    const contactEvent = await fetchKind3(pubkey, allRelays)
    if (!contactEvent) {
      isLoadingRef.current = false
      setState((s) => ({
        ...s,
        isLoading: false,
        canAnalyze: false,
        statusMessage: t('messages.noFollowees'),
      }))
      return
    }

    const followees = parseContactList(contactEvent)

    // Initialize followeeAnalyses with cached profiles or empty profiles
    // Also collect pubkeys that need profile fetching (not in cache)
    const uncachedPubkeys: string[] = []
    const initialAnalyses: FolloweeAnalysis[] = followees.map((followeePubkey) => {
      const cached = getCachedProfile(followeePubkey)
      if (!cached) {
        uncachedPubkeys.push(followeePubkey)
      }
      const profile = cached || { pubkey: followeePubkey }
      return {
        profile,
        writeRelays: [],
        readableRelays: [],
        unreadableRelays: [],
        coverage: -1, // -1 means not analyzed yet
      }
    })

    setState((s) => ({
      ...s,
      followees,
      followeeAnalyses: initialAnalyses,
      isLoading: false,
      canAnalyze: !skipProfiles,
      statusMessage: skipProfiles
        ? t('messages.profileLoadingSkipped', { count: followees.length })
        : t('messages.foundFollowees', { count: followees.length }),
    }))

    // Skip profile loading if requested (mobile user cancelled)
    if (skipProfiles) {
      isLoadingRef.current = false
      return
    }

    // Subscribe to followees' profiles in background (only for uncached profiles)
    if (uncachedPubkeys.length === 0) {
      isLoadingRef.current = false
      return
    }

    const unsubscribeProfiles = subscribeFolloweesKind0(
      uncachedPubkeys,
      allRelays,
      {
        onProfile: (followeePubkey, event) => {
          const profileData = parseProfile(event)
          const profile: UserProfile = { pubkey: followeePubkey, ...profileData }

          // Save to cache
          saveProfileToCache(profile)

          // Update the followeeAnalyses with the new profile
          setState((s) => ({
            ...s,
            followeeAnalyses: s.followeeAnalyses.map((analysis) =>
              analysis.profile.pubkey === followeePubkey
                ? { ...analysis, profile }
                : analysis
            ),
          }))
        },
      },
      BATCH_SIZE_AUTHORS
    )

    unsubscribeProfilesRef.current = unsubscribeProfiles
    isLoadingRef.current = false
  }, [t])

  interface AnalysisOptions {
    useKind10002: boolean
    useKind3: boolean
  }

  const startAnalysis = useCallback(async (options: AnalysisOptions) => {
    const { followees, userRelays } = state
    if (followees.length === 0) {
      return
    }

    setState((s) => ({
      ...s,
      isAnalyzing: true,
      canAnalyze: false,
      statusMessage: t('messages.analyzingFollowees', { current: 0, total: followees.length }),
    }))

    const userReadRelays = getReadRelaysFromRelayInfo(userRelays)
    userReadRelaysRef.current = userReadRelays
    const allReadRelays = [...new Set([...userReadRelays, ...BOOTSTRAP_RELAYS])]

    const initialStatuses: RelayStatusItem[] = allReadRelays.map((url) => ({
      url,
      status: 'wait',
    }))
    setState((s) => ({ ...s, relayStatuses: initialStatuses }))

    // Track analyzed pubkeys (count unique pubkeys that received relay info)
    const analyzedPubkeys = new Set<string>()

    // Track relay info from both sources per pubkey
    const relayInfoMap = new Map<string, { kind10002?: NostrEvent; kind3?: NostrEvent }>()

    const updateFolloweeAnalysis = async (followeePubkey: string) => {
      const info = relayInfoMap.get(followeePubkey)
      if (!info) return

      // Use kind:10002 if available, otherwise fall back to kind:3
      let relays: RelayInfo[]
      if (info.kind10002) {
        // kind:10002 (NIP-65 format in tags) takes priority
        relays = parseRelayList(info.kind10002)
      } else if (info.kind3) {
        // kind:3 (legacy format in content) is fallback only
        relays = parseRelayListFromKind3(info.kind3)
      } else {
        relays = []
      }

      const writeRelays = relays.filter((r) => r.write).map((r) => r.url)

      // Calculate coverage (normalize URLs before comparing)
      const normalizedUserReadRelays = userReadRelays.map(normalizeRelayUrl)
      const readableRelays = writeRelays.filter((url) => normalizedUserReadRelays.includes(normalizeRelayUrl(url)))
      const unreadableRelays = writeRelays.filter((url) => !normalizedUserReadRelays.includes(normalizeRelayUrl(url)))

      // Update state, preserving existing profile if it has data
      setState((s) => {
        const existingAnalysis = s.followeeAnalyses.find(
          (a) => a.profile.pubkey === followeePubkey
        )

        // Use existing profile if it has any data (name, display_name, or picture)
        const existingProfile = existingAnalysis?.profile
        const hasProfileData = existingProfile && (existingProfile.name || existingProfile.display_name || existingProfile.picture)
        const profile = hasProfileData ? existingProfile : { pubkey: followeePubkey }

        const updatedAnalysis: FolloweeAnalysis = {
          profile,
          writeRelays,
          readableRelays,
          unreadableRelays,
          coverage: readableRelays.length,
        }

        // Update the analysis and re-sort
        const otherAnalyses = s.followeeAnalyses.filter(
          (a) => a.profile.pubkey !== followeePubkey
        )
        const allAnalyses = [...otherAnalyses, updatedAnalysis]
        const sorted = sortFolloweesByCoverage(allAnalyses)

        return {
          ...s,
          followeeAnalyses: sorted,
          statusMessage: t('messages.analyzingFollowees', { current: analyzedPubkeys.size, total: followees.length }),
        }
      })
    }

    const unsubscribe = subscribeFolloweesRelayList(
      followees,
      allReadRelays,
      {
        onEvent: async (followeePubkey, event, kind) => {
          // Store event in map
          const existing = relayInfoMap.get(followeePubkey) || {}
          if (kind === 10002) {
            existing.kind10002 = event
          } else if (kind === 3) {
            existing.kind3 = event
          }
          relayInfoMap.set(followeePubkey, existing)

          // Track unique pubkeys
          if (!analyzedPubkeys.has(followeePubkey)) {
            analyzedPubkeys.add(followeePubkey)
            followeeRelaysRef.current.set(followeePubkey, event)
          }

          // Update analysis with merged relay info
          await updateFolloweeAnalysis(followeePubkey)
        },
        onRelayStatus: (relay, status) => {
          setState((s) => ({
            ...s,
            relayStatuses: s.relayStatuses.map((r) =>
              r.url === relay ? { ...r, status } : r
            ),
          }))
        },
        onComplete: () => {
          setState((s) => ({
            ...s,
            isAnalyzing: false,
            statusMessage: t('messages.analysisComplete', { count: analyzedPubkeys.size, total: followees.length }),
          }))
        },
      },
      options,
      BATCH_SIZE_AUTHORS
    )

    unsubscribeRelaysRef.current = unsubscribe
  }, [state.followees, state.userRelays, t])

  return {
    ...state,
    loadFromExtension,
    setPubkey,
    loadUserData,
    startAnalysis,
  }
}
