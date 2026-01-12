import { describe, it, expect } from 'vitest'
import { formatRelayName, formatRelayNameFolded, normalizeRelayUrl } from './relay'

describe('formatRelayName', () => {
  it('removes wss:// prefix', () => {
    expect(formatRelayName('wss://relay.damus.io')).toBe('relay.damus.io')
  })

  it('removes ws:// prefix', () => {
    expect(formatRelayName('ws://localhost:8080')).toBe('localhost:8080')
  })

  it('handles url without prefix', () => {
    expect(formatRelayName('relay.damus.io')).toBe('relay.damus.io')
  })
})

describe('formatRelayNameFolded', () => {
  it('folds relay name by sqrt length', () => {
    const result = formatRelayNameFolded('wss://yabu.me')
    // yabu.me has 7 chars, sqrt(7) ≈ 3, so it splits into 3-char chunks
    const lines = result.split('\n')
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join('')).toBe('yabu.me')
  })

  it('folds longer relay name', () => {
    const result = formatRelayNameFolded('wss://relay.damus.io')
    expect(result.split('\n').length).toBeGreaterThan(1)
  })
})

describe('normalizeRelayUrl', () => {
  it('adds trailing slash', () => {
    expect(normalizeRelayUrl('wss://relay.damus.io')).toBe('wss://relay.damus.io/')
  })

  it('keeps existing trailing slash', () => {
    expect(normalizeRelayUrl('wss://relay.damus.io/')).toBe('wss://relay.damus.io/')
  })

  it('lowercases the url', () => {
    expect(normalizeRelayUrl('WSS://RELAY.DAMUS.IO')).toBe('wss://relay.damus.io/')
  })

  it('trims whitespace', () => {
    expect(normalizeRelayUrl('  wss://relay.damus.io  ')).toBe('wss://relay.damus.io/')
  })
})
