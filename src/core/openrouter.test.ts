import { describe, it, expect, vi, afterEach } from 'vitest'
import { canMakeRequest, buildUserMessage, callOpenRouter } from './openrouter'
import type { RateLimitState } from './openrouter'
import type { AppError } from '../shared/types'
import { RATE_LIMIT_REQUESTS_PER_MINUTE } from '../shared/constants'

afterEach(() => {
  vi.restoreAllMocks()
})

// ─── canMakeRequest ───────────────────────────────────────────────────────────

describe('canMakeRequest', () => {
  it('allows the first request (no history)', () => {
    const state: RateLimitState = {
      lastRequestTime: 0,
      requestCount: 0,
      windowStart: 0,
    }
    const result = canMakeRequest(state)
    expect(result.allowed).toBe(true)
    expect(result.waitMs).toBe(0)
  })

  it('blocks when minimum 1s interval has not elapsed', () => {
    const now = Date.now()
    const state: RateLimitState = {
      lastRequestTime: now - 500, // only 500ms ago
      requestCount: 1,
      windowStart: now - 500,
    }
    const result = canMakeRequest(state)
    expect(result.allowed).toBe(false)
    expect(result.waitMs).toBeGreaterThan(0)
    expect(result.waitMs).toBeLessThanOrEqual(500)
  })

  it('blocks when request count reaches rate limit within window', () => {
    const now = Date.now()
    const state: RateLimitState = {
      lastRequestTime: now - 2000, // 2s ago so interval is fine
      requestCount: RATE_LIMIT_REQUESTS_PER_MINUTE,
      windowStart: now - 5000, // window started 5s ago, still active
    }
    const result = canMakeRequest(state)
    expect(result.allowed).toBe(false)
    expect(result.waitMs).toBeGreaterThan(0)
  })

  it('allows request when window has expired and count was at limit', () => {
    const state: RateLimitState = {
      lastRequestTime: Date.now() - 65_000, // last request was 65s ago
      requestCount: RATE_LIMIT_REQUESTS_PER_MINUTE,
      windowStart: Date.now() - 65_000, // window expired
    }
    const result = canMakeRequest(state)
    expect(result.allowed).toBe(true)
    expect(result.waitMs).toBe(0)
  })
})

// ─── buildUserMessage ─────────────────────────────────────────────────────────

describe('buildUserMessage', () => {
  it('returns just userInput when no context provided', () => {
    const result = buildUserMessage('Fix the bug')
    expect(result).toBe('Fix the bug')
  })

  it('includes terminal context when provided', () => {
    const result = buildUserMessage('Fix the bug', 'Error: segfault at line 42')
    expect(result).toContain('Terminal Context')
    expect(result).toContain('Error: segfault at line 42')
  })

  it('omits terminal context section when undefined', () => {
    const result = buildUserMessage('Fix the bug', undefined, 'diff --git...')
    expect(result).not.toContain('Terminal Context')
    expect(result).toContain('Git Diff')
  })

  it('includes git diff section when provided', () => {
    const result = buildUserMessage('Review changes', undefined, 'diff --git a/foo b/foo')
    expect(result).toContain('Git Diff')
    expect(result).toContain('diff --git a/foo b/foo')
  })

  it('includes both sections when both provided', () => {
    const result = buildUserMessage('Review', 'terminal output', 'git diff output')
    expect(result).toContain('Terminal Context')
    expect(result).toContain('Git Diff')
    expect(result).toContain('terminal output')
    expect(result).toContain('git diff output')
  })

  it('omits empty terminal context (whitespace-only)', () => {
    const result = buildUserMessage('Fix this', '   ')
    expect(result).not.toContain('Terminal Context')
  })
})

// ─── callOpenRouter ───────────────────────────────────────────────────────────

function makeFetchMock(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    status,
    json: () => Promise.resolve(body),
  })
}

const VALID_RESPONSE = {
  choices: [
    {
      index: 0,
      finish_reason: 'stop',
      message: { role: 'assistant', content: 'Improved prompt here.' },
    },
  ],
}

describe('callOpenRouter', () => {
  it('returns message content on 200', async () => {
    vi.stubGlobal('fetch', makeFetchMock(200, VALID_RESPONSE))

    const result = await callOpenRouter('sys prompt', 'user msg', 'gpt-4', 'sk-test-key')
    expect(result).toBe('Improved prompt here.')
  })

  it('throws AppError with AUTH_FAILED on 401', async () => {
    vi.stubGlobal('fetch', makeFetchMock(401, { error: 'Unauthorized' }))

    let err: unknown
    try {
      await callOpenRouter('sys', 'user', 'model', 'bad-key')
    } catch (e) {
      err = e
    }
    expect(err).toBeDefined()
    const appErr = err as AppError
    expect(appErr.code).toBe('AUTH_FAILED')
    expect(appErr.message).toContain('Invalid API key')
  })

  it('throws AppError with RATE_LIMIT on 429', async () => {
    vi.stubGlobal('fetch', makeFetchMock(429, { error: 'Too Many Requests' }))

    let err: unknown
    try {
      await callOpenRouter('sys', 'user', 'model', 'key')
    } catch (e) {
      err = e
    }
    expect(err).toBeDefined()
    const appErr = err as AppError
    expect(appErr.code).toBe('RATE_LIMIT')
    expect(appErr.message).toContain('Rate limited')
  })

  it('throws AppError with IMPROVEMENT_FAILED on 500', async () => {
    vi.stubGlobal('fetch', makeFetchMock(500, { error: 'Internal Server Error' }))

    let err: unknown
    try {
      await callOpenRouter('sys', 'user', 'model', 'key')
    } catch (e) {
      err = e
    }
    expect(err).toBeDefined()
    const appErr = err as AppError
    expect(appErr.code).toBe('IMPROVEMENT_FAILED')
    expect(appErr.message).toContain('server error')
  })

  it('throws AppError with NETWORK_ERROR on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Failed to fetch')),
    )

    let err: unknown
    try {
      await callOpenRouter('sys', 'user', 'model', 'key')
    } catch (e) {
      err = e
    }
    expect(err).toBeDefined()
    const appErr = err as AppError
    expect(appErr.code).toBe('NETWORK_ERROR')
  })
})
