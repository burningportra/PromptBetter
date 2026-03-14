import { describe, it, expect } from 'vitest'
import { maskSecret } from './useSecretDetection'

describe('maskSecret', () => {
  it('returns first 4 chars + ****', () => {
    expect(maskSecret('sk-abcdef1234')).toBe('sk-a****')
  })

  it('handles strings shorter than 4 chars', () => {
    expect(maskSecret('abc')).toBe('abc****')
    expect(maskSecret('AB')).toBe('AB****')
  })

  it('handles strings exactly 4 chars', () => {
    expect(maskSecret('AKIA')).toBe('AKIA****')
  })

  it('handles empty string', () => {
    expect(maskSecret('')).toBe('****')
  })

  it('masks OpenAI key prefix correctly', () => {
    const key = `sk-${'a'.repeat(48)}`
    expect(maskSecret(key)).toBe('sk-a****')
  })

  it('masks GitHub token prefix correctly', () => {
    const token = `ghp_${'b'.repeat(36)}`
    expect(maskSecret(token)).toBe('ghp_****')
  })

  it('masks AWS key prefix correctly', () => {
    const key = 'AKIAIOSFODNN7EXAMPLE12'
    expect(maskSecret(key)).toBe('AKIA****')
  })
})
