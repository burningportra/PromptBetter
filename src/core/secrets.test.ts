import { describe, it, expect } from 'vitest'
import { detectSecrets, MAX_INPUT_LENGTH } from './secrets'
import type { AppError } from '../shared/types'

describe('detectSecrets', () => {
  it('returns empty array for empty string', () => {
    expect(detectSecrets('')).toEqual([])
  })

  it('detects AWS Access Key', () => {
    const text = 'export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE12'
    const matches = detectSecrets(text)
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].name).toBe('AWS Access Key')
    expect(matches[0].match).toMatch(/^AKIA/)
  })

  it('detects GitHub token (ghs_ prefix)', () => {
    const text = `token: ghs_${'a'.repeat(36)}`
    const matches = detectSecrets(text)
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].name).toBe('GitHub Token')
  })

  it('detects GitHub token (ghp_ prefix)', () => {
    const text = `token: ghp_${'b'.repeat(36)}`
    const matches = detectSecrets(text)
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].name).toBe('GitHub Token')
  })

  it('detects OpenAI key', () => {
    const text = `OPENAI_KEY=sk-${'a'.repeat(25)}`
    const matches = detectSecrets(text)
    const openAiMatches = matches.filter((m) => m.name === 'OpenAI Key')
    expect(openAiMatches.length).toBeGreaterThan(0)
  })

  it('does NOT flag OpenRouter keys as OpenAI keys', () => {
    const text = `OPENROUTER_KEY=sk-or-v1-${'a'.repeat(40)}`
    const matches = detectSecrets(text)
    const openAiMatches = matches.filter((m) => m.name === 'OpenAI Key')
    expect(openAiMatches.length).toBe(0)
  })

  it('detects Stripe live key', () => {
    const text = `stripe_key=sk_live_${'x'.repeat(24)}`
    const matches = detectSecrets(text)
    const stripeMatches = matches.filter((m) => m.name === 'Stripe Key')
    expect(stripeMatches.length).toBeGreaterThan(0)
  })

  it('detects Stripe test key', () => {
    const text = `stripe_key=sk_test_${'y'.repeat(24)}`
    const matches = detectSecrets(text)
    const stripeMatches = matches.filter((m) => m.name === 'Stripe Key')
    expect(stripeMatches.length).toBeGreaterThan(0)
  })

  it('detects PEM private key header', () => {
    const text = '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----'
    const matches = detectSecrets(text)
    const pemMatches = matches.filter((m) => m.name === 'Private Key (PEM)')
    expect(pemMatches.length).toBeGreaterThan(0)
  })

  it('detects RSA private key header', () => {
    const text = '-----BEGIN RSA PRIVATE KEY-----\nMIIE...'
    const matches = detectSecrets(text)
    const pemMatches = matches.filter((m) => m.name === 'Private Key (PEM)')
    expect(pemMatches.length).toBeGreaterThan(0)
  })

  it('detects MongoDB connection string', () => {
    const text = 'mongodb://admin:supersecret@cluster.mongodb.net/mydb'
    const matches = detectSecrets(text)
    const dbMatches = matches.filter((m) => m.name === 'Connection String')
    expect(dbMatches.length).toBeGreaterThan(0)
  })

  it('detects Postgres connection string', () => {
    const text = 'postgres://user:password@localhost:5432/mydb'
    const matches = detectSecrets(text)
    const dbMatches = matches.filter((m) => m.name === 'Connection String')
    expect(dbMatches.length).toBeGreaterThan(0)
  })

  it('detects Slack token', () => {
    const text = 'slack_token=xoxb-123456789-abcdef'
    const matches = detectSecrets(text)
    const slackMatches = matches.filter((m) => m.name === 'Slack Token')
    expect(slackMatches.length).toBeGreaterThan(0)
  })

  it('throws AppError when input exceeds MAX_INPUT_LENGTH', () => {
    const oversizedInput = 'a'.repeat(MAX_INPUT_LENGTH + 1)
    let thrownError: unknown
    try {
      detectSecrets(oversizedInput)
    } catch (e) {
      thrownError = e
    }
    expect(thrownError).toBeDefined()
    const err = thrownError as AppError
    expect(err.code).toBe('IMPROVEMENT_FAILED')
    expect(err.message).toContain('10000')
  })

  it('does not flag plain text or UUIDs', () => {
    const text =
      'The UUID is 550e8400-e29b-41d4-a716-446655440000 and the base64 is SGVsbG8gV29ybGQ='
    const matches = detectSecrets(text)
    expect(matches).toEqual([])
  })

  it('returns match position (index) correctly', () => {
    const prefix = 'key='
    const text = `${prefix}AKIAIOSFODNN7EXAMPLE12`
    const matches = detectSecrets(text)
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].index).toBe(prefix.length)
  })

  it('MAX_INPUT_LENGTH is 10000', () => {
    expect(MAX_INPUT_LENGTH).toBe(10_000)
  })
})
