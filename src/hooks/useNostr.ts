import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchKind10002,
  fetchKind3,
  fetchKind0,
  parseRelayList,
  parseContactList,
  parseProfile,
  subscribeFolloweesKind10002,
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

  const loadUserData = useCallback(async (inputPubkey: string) => {
    // Skip if already loading (prevents React StrictMode double-call issues)
    if (isLoadingRef.current) {
      return
    }
    isLoadingRef.current = true

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
    const initialAnalyses: FolloweeAnalysis[] = followees.map((followeePubkey) => {
      const cached = getCachedProfile(followeePubkey)
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
      canAnalyze: true,
      statusMessage: t('messages.foundFollowees', { count: followees.length }),
    }))

    // Subscribe to followees' profiles in background
    const unsubscribeProfiles = subscribeFolloweesKind0(
      followees,
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

  const startAnalysis = useCallback(async () => {
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

    let analyzedCount = 0

    const unsubscribe = subscribeFolloweesKind10002(
      followees,
      allReadRelays,
      {
        onEvent: async (followeePubkey, event) => {
          followeeRelaysRef.current.set(followeePubkey, event)
          analyzedCount++

          const relays = parseRelayList(event)
          const writeRelays = relays.filter((r) => r.write).map((r) => r.url)

          // Calculate coverage (normalize URLs before comparing)
          const normalizedUserReadRelays = userReadRelays.map(normalizeRelayUrl)
          const readableRelays = writeRelays.filter((url) => normalizedUserReadRelays.includes(normalizeRelayUrl(url)))
          const unreadableRelays = writeRelays.filter((url) => !normalizedUserReadRelays.includes(normalizeRelayUrl(url)))

          // Get existing profile
          let profile: UserProfile = { pubkey: followeePubkey }
          setState((s) => {
            const existingAnalysis = s.followeeAnalyses.find(
              (a) => a.profile.pubkey === followeePubkey
            )
            if (existingAnalysis) {
              profile = existingAnalysis.profile
            }
            return s
          })

          // Check if profile is missing (no name, display_name, picture)
          const isProfileMissing = !profile.name && !profile.display_name && !profile.picture

          // If profile is missing, try to fetch from followee's write relays
          if (isProfileMissing && writeRelays.length > 0) {
            const profileEvent = await fetchKind0(followeePubkey, writeRelays)
            if (profileEvent) {
              const profileData = parseProfile(profileEvent)
              profile = { pubkey: followeePubkey, ...profileData }
              saveProfileToCache(profile)
            }
          }

          const updatedAnalysis: FolloweeAnalysis = {
            profile,
            writeRelays,
            readableRelays,
            unreadableRelays,
            coverage: readableRelays.length,
          }

          setState((s) => {
            // Update the analysis and re-sort
            const otherAnalyses = s.followeeAnalyses.filter(
              (a) => a.profile.pubkey !== followeePubkey
            )
            const allAnalyses = [...otherAnalyses, updatedAnalysis]
            const sorted = sortFolloweesByCoverage(allAnalyses)

            return {
              ...s,
              followeeAnalyses: sorted,
              statusMessage: t('messages.analyzingFollowees', { current: analyzedCount, total: followees.length }),
            }
          })
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
            statusMessage: t('messages.analysisComplete', { count: analyzedCount, total: followees.length }),
          }))
        },
      },
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
