export function formatRelayName(url: string): string {
  return url.replace(/^wss?:\/\//, '').replace(/\/$/, '')
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
  return url.trim().toLowerCase().replace(/\/$/, '')
}
