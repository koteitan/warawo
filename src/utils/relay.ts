export function formatRelayName(url: string): string {
  return url.replace(/^wss?:\/\//, '')
}

export function formatRelayNameFolded(url: string): string {
  const name = formatRelayName(url)
  const sqrtLen = Math.ceil(Math.sqrt(name.length))
  const lines: string[] = []
  for (let i = 0; i < name.length; i += sqrtLen) {
    lines.push(name.slice(i, i + sqrtLen))
  }
  return lines.join('\n')
}

export function normalizeRelayUrl(url: string): string {
  let normalized = url.trim().toLowerCase()
  if (!normalized.endsWith('/')) {
    normalized += '/'
  }
  return normalized
}
