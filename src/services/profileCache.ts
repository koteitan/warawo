import type { UserProfile } from '../types'

const PROFILE_CACHE_KEY = 'warawo-profile-cache'
const profileCache = new Map<string, UserProfile>()

// Load cache from localStorage on startup
function loadProfileCache(): void {
  try {
    const stored = localStorage.getItem(PROFILE_CACHE_KEY)
    if (stored) {
      const data = JSON.parse(stored) as Record<string, UserProfile>
      for (const [pubkey, profile] of Object.entries(data)) {
        profileCache.set(pubkey, profile)
      }
    }
  } catch {
    // Ignore errors when loading cache
  }
}

// Save cache to localStorage (debounced to avoid excessive writes)
let saveProfileCacheTimer: ReturnType<typeof setTimeout> | null = null

function saveProfileCache(): void {
  if (saveProfileCacheTimer) {
    clearTimeout(saveProfileCacheTimer)
  }
  saveProfileCacheTimer = setTimeout(() => {
    saveProfileCacheTimer = null
    try {
      const data: Record<string, UserProfile> = {}
      for (const [pubkey, profile] of profileCache) {
        data[pubkey] = profile
      }
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data))
    } catch {
      // Ignore errors when saving cache (e.g., quota exceeded)
    }
  }, 500)
}

// Initialize cache from localStorage
loadProfileCache()

/**
 * Get a cached profile by pubkey
 */
export function getCachedProfile(pubkey: string): UserProfile | undefined {
  return profileCache.get(pubkey)
}

/**
 * Save a profile to the cache and persist to localStorage
 */
export function saveProfileToCache(profile: UserProfile): void {
  profileCache.set(profile.pubkey, profile)
  saveProfileCache()
}

/**
 * Get multiple cached profiles
 */
export function getCachedProfiles(pubkeys: string[]): Map<string, UserProfile> {
  const result = new Map<string, UserProfile>()
  for (const pubkey of pubkeys) {
    const cached = profileCache.get(pubkey)
    if (cached) {
      result.set(pubkey, cached)
    }
  }
  return result
}
