import { nip19 } from 'nostr-tools'

export function hexToNpub(hex: string): string {
  try {
    return nip19.npubEncode(hex)
  } catch {
    return hex
  }
}

export function npubToHex(npub: string): string | null {
  try {
    const decoded = nip19.decode(npub)
    if (decoded.type === 'npub') {
      return decoded.data
    }
    return null
  } catch {
    return null
  }
}
