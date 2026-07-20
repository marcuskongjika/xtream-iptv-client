import { describe, expect, it } from 'vitest'
import { formatClock, formatDuration, isValidServerUrl, normalizeBaseUrl } from './format'

describe('normalizeBaseUrl', () => {
  it('adds http:// when no scheme is present', () => {
    expect(normalizeBaseUrl('example.com:8080')).toBe('http://example.com:8080')
  })

  it('keeps an existing https scheme', () => {
    expect(normalizeBaseUrl('https://example.com')).toBe('https://example.com')
  })

  it('strips trailing slashes and whitespace', () => {
    expect(normalizeBaseUrl('  http://example.com:8080///  ')).toBe('http://example.com:8080')
  })
})

describe('isValidServerUrl', () => {
  it('accepts host:port form', () => {
    expect(isValidServerUrl('example.com:8080')).toBe(true)
  })

  it('rejects garbage', () => {
    expect(isValidServerUrl('ht tp://???')).toBe(false)
  })
})

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(3720)).toBe('1h 2m')
  })

  it('formats minutes only', () => {
    expect(formatDuration(300)).toBe('5m')
  })

  it('handles invalid input', () => {
    expect(formatDuration(Number.NaN)).toBe('')
  })
})

describe('formatClock', () => {
  it('formats mm:ss', () => {
    expect(formatClock(75)).toBe('1:15')
  })

  it('formats h:mm:ss', () => {
    expect(formatClock(3661)).toBe('1:01:01')
  })

  it('clamps invalid values', () => {
    expect(formatClock(-5)).toBe('0:00')
  })
})
