declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>
      signEvent(event: object): Promise<object>
      getRelays?(): Promise<Record<string, { read: boolean; write: boolean }>>
    }
  }
}

export function hasNip07Extension(): boolean {
  return typeof window !== 'undefined' && !!window.nostr
}

export async function waitForNip07Extension(timeoutMs: number = 3000): Promise<boolean> {
  if (hasNip07Extension()) {
    return true
  }

  return new Promise((resolve) => {
    const startTime = Date.now()
    const checkInterval = 100

    const check = () => {
      if (hasNip07Extension()) {
        resolve(true)
        return
      }
      if (Date.now() - startTime >= timeoutMs) {
        resolve(false)
        return
      }
      setTimeout(check, checkInterval)
    }

    check()
  })
}

export async function getPublicKeyFromExtension(): Promise<string | null> {
  const hasExtension = await waitForNip07Extension()
  if (!hasExtension) {
    return null
  }
  try {
    const pubkey = await window.nostr!.getPublicKey()
    return pubkey
  } catch {
    return null
  }
}

export async function getRelaysFromExtension(): Promise<Record<string, { read: boolean; write: boolean }> | null> {
  if (!hasNip07Extension() || !window.nostr!.getRelays) {
    return null
  }
  try {
    const relays = await window.nostr!.getRelays!()
    return relays
  } catch {
    return null
  }
}
