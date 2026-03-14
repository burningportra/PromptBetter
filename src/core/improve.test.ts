import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { improvePrompt, _rateLimitState } from './improve'
import type { AppError } from '../shared/types'

// Reset module-level rate limit state before each test
function resetRateLimitState() {
  _rateLimitState.lastRequestTime = 0
  _rateLimitState.requestCount = 0
  _rateLimitState.windowStart = 0
}

const VALID_LLM_RESPONSE = {
  choices: [
    {
      index: 0,
      finish_reason: 'stop',
      message: {
        role: 'assistant',
        content: 'Improved: Review this code for security vulnerabilities.',
      },
    },
  ],
}

const ANNOTATED_LLM_RESPONSE = {
  choices: [
    {
      index: 0,
      finish_reason: 'stop',
      message: {
        role: 'assistant',
        content: `Improved: Review this code for security vulnerabilities.
---
Intent: code-review (confidence: 0.92)
Patterns: fresh-eyes, self-verification`,
      },
    },
  ],
}

function makeFetchMock(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    status,
    json: () => Promise.resolve(body),
  })
}

beforeEach(() => {
  resetRateLimitState()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ─── Basic pipeline ───────────────────────────────────────────────────────────

describe('improvePrompt — basic pipeline', () => {
  it('returns ImproveResult with improved prompt on success', async () => {
    vi.stubGlobal('fetch', makeFetchMock(200, VALID_LLM_RESPONSE))

    const result = await improvePrompt('review this code', 'sk-test-key')

    expect(result.improvedPrompt).toBe(
      'Improved: Review this code for security vulnerabilities.',
    )
    expect(result.model).toBeDefined()
    expect(result.tokensUsed).toEqual({ prompt: 0, completion: 0 })
  })

  it('returns intent and patterns when annotation mode is active', async () => {
    vi.stubGlobal('fetch', makeFetchMock(200, ANNOTATED_LLM_RESPONSE))

    const result = await improvePrompt('review this code', 'sk-test-key', {
      annotations: true,
    })

    expect(result.intent).toBe('code-review')
    expect(result.confidence).toBeCloseTo(0.92)
    expect(result.patterns).toContain('fresh-eyes')
    expect(result.patterns).toContain('self-verification')
  })

  it('respects model override in options', async () => {
    vi.stubGlobal('fetch', makeFetchMock(200, VALID_LLM_RESPONSE))

    const result = await improvePrompt('fix the bug', 'sk-test-key', {
      model: 'openai/gpt-4o',
    })

    expect(result.model).toBe('openai/gpt-4o')
  })
})

// ─── Slash command parsing ────────────────────────────────────────────────────

describe('improvePrompt — slash command parsing', () => {
  it('strips slash command prefix from prompt before calling API', async () => {
    let capturedBody = ''
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
        capturedBody = typeof init.body === 'string' ? init.body : ''
        return { status: 200, json: () => Promise.resolve(VALID_LLM_RESPONSE) }
      }),
    )

    await improvePrompt('/review check this code for issues', 'sk-test-key')

    // The user message sent to OpenRouter should contain only the remainder
    expect(capturedBody).toContain('check this code for issues')
    expect(capturedBody).not.toContain('/review')
  })

  it('uses preset system prompt when slash command is given', async () => {
    let capturedBody = ''
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
        capturedBody = typeof init.body === 'string' ? init.body : ''
        return { status: 200, json: () => Promise.resolve(VALID_LLM_RESPONSE) }
      }),
    )

    await improvePrompt('/debug why is this crashing', 'sk-test-key')

    // Preset mode system prompt should mention the intent
    const body = JSON.parse(capturedBody) as { messages: Array<{ role: string; content: string }> }
    const systemMessage = body.messages.find((m) => m.role === 'system')
    expect(systemMessage?.content).toContain('debugging')
  })

  it('uses auto mode when no slash command or preset given', async () => {
    let capturedBody = ''
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
        capturedBody = typeof init.body === 'string' ? init.body : ''
        return { status: 200, json: () => Promise.resolve(VALID_LLM_RESPONSE) }
      }),
    )

    await improvePrompt('make this prompt better', 'sk-test-key')

    const body = JSON.parse(capturedBody) as { messages: Array<{ role: string; content: string }> }
    const systemMessage = body.messages.find((m) => m.role === 'system')
    // Auto mode includes intent classification instruction
    expect(systemMessage?.content).toContain('Classify the user')
  })

  it('uses options.preset when no slash command is present', async () => {
    let capturedBody = ''
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
        capturedBody = typeof init.body === 'string' ? init.body : ''
        return { status: 200, json: () => Promise.resolve(VALID_LLM_RESPONSE) }
      }),
    )

    await improvePrompt('refactor this function', 'sk-test-key', { preset: 'refactoring' })

    const body = JSON.parse(capturedBody) as { messages: Array<{ role: string; content: string }> }
    const systemMessage = body.messages.find((m) => m.role === 'system')
    expect(systemMessage?.content).toContain('refactoring')
  })

  it('slash command takes precedence over options.preset', async () => {
    let capturedBody = ''
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
        capturedBody = typeof init.body === 'string' ? init.body : ''
        return { status: 200, json: () => Promise.resolve(VALID_LLM_RESPONSE) }
      }),
    )

    // Slash command is /plan but preset option says refactoring
    await improvePrompt('/plan migrate the DB', 'sk-test-key', { preset: 'refactoring' })

    const body = JSON.parse(capturedBody) as { messages: Array<{ role: string; content: string }> }
    const systemMessage = body.messages.find((m) => m.role === 'system')
    // Should use planning, not refactoring
    expect(systemMessage?.content).toContain('planning')
  })
})

// ─── Secret detection ─────────────────────────────────────────────────────────

describe('improvePrompt — secret detection', () => {
  it('throws SECRET_DETECTED when prompt contains AWS key', async () => {
    let err: unknown
    try {
      await improvePrompt('Use AKIAIOSFODNN7EXAMPLE to access S3', 'sk-test-key')
    } catch (e) {
      err = e
    }

    expect(err).toBeDefined()
    const appErr = err as AppError
    expect(appErr.code).toBe('SECRET_DETECTED')
    expect(appErr.message).toContain('AWS Access Key')
  })

  it('blocks before calling the API when secret is detected', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    try {
      await improvePrompt('token: ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890', 'sk-test-key')
    } catch {
      // expected
    }

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe('improvePrompt — rate limiting', () => {
  it('throws RATE_LIMIT when minimum interval has not elapsed', async () => {
    // Set lastRequestTime to just 200ms ago (< 1000ms minimum interval)
    _rateLimitState.lastRequestTime = Date.now() - 200
    _rateLimitState.requestCount = 1
    _rateLimitState.windowStart = Date.now() - 200

    let err: unknown
    try {
      await improvePrompt('a plain prompt', 'sk-test-key')
    } catch (e) {
      err = e
    }

    expect(err).toBeDefined()
    const appErr = err as AppError
    expect(appErr.code).toBe('RATE_LIMIT')
    expect(appErr.message).toContain('Rate limited')
  })

  it('blocks before calling the API when rate limited', async () => {
    _rateLimitState.lastRequestTime = Date.now() - 200
    _rateLimitState.requestCount = 1
    _rateLimitState.windowStart = Date.now() - 200

    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    try {
      await improvePrompt('a plain prompt', 'sk-test-key')
    } catch {
      // expected
    }

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('updates rate limit state after a successful request', async () => {
    vi.stubGlobal('fetch', makeFetchMock(200, VALID_LLM_RESPONSE))

    const before = Date.now()
    await improvePrompt('test prompt', 'sk-test-key')

    expect(_rateLimitState.lastRequestTime).toBeGreaterThanOrEqual(before)
    expect(_rateLimitState.requestCount).toBe(1)
  })
})

// ─── Context forwarding ───────────────────────────────────────────────────────

describe('improvePrompt — context forwarding', () => {
  it('includes terminalContext in the user message sent to API', async () => {
    let capturedBody = ''
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
        capturedBody = typeof init.body === 'string' ? init.body : ''
        return { status: 200, json: () => Promise.resolve(VALID_LLM_RESPONSE) }
      }),
    )

    await improvePrompt('fix the error', 'sk-test-key', {
      terminalContext: 'TypeError: Cannot read property of undefined',
    })

    expect(capturedBody).toContain('TypeError: Cannot read property of undefined')
    expect(capturedBody).toContain('Terminal Context')
  })

  it('includes gitDiff in the user message sent to API', async () => {
    let capturedBody = ''
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
        capturedBody = typeof init.body === 'string' ? init.body : ''
        return { status: 200, json: () => Promise.resolve(VALID_LLM_RESPONSE) }
      }),
    )

    await improvePrompt('review my changes', 'sk-test-key', {
      gitDiff: 'diff --git a/src/foo.ts b/src/foo.ts',
    })

    expect(capturedBody).toContain('diff --git a/src/foo.ts')
    expect(capturedBody).toContain('Git Diff')
  })
})

// ─── API error propagation ────────────────────────────────────────────────────

describe('improvePrompt — API error propagation', () => {
  it('propagates AUTH_FAILED from callOpenRouter', async () => {
    vi.stubGlobal('fetch', makeFetchMock(401, { error: 'Unauthorized' }))

    let err: unknown
    try {
      await improvePrompt('some prompt', 'bad-key')
    } catch (e) {
      err = e
    }

    const appErr = err as AppError
    expect(appErr.code).toBe('AUTH_FAILED')
  })

  it('propagates RATE_LIMIT from callOpenRouter (429 from API)', async () => {
    vi.stubGlobal('fetch', makeFetchMock(429, { error: 'Too Many Requests' }))

    let err: unknown
    try {
      await improvePrompt('some prompt', 'sk-test-key')
    } catch (e) {
      err = e
    }

    const appErr = err as AppError
    expect(appErr.code).toBe('RATE_LIMIT')
  })

  it('propagates NETWORK_ERROR from callOpenRouter', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')))

    let err: unknown
    try {
      await improvePrompt('some prompt', 'sk-test-key')
    } catch (e) {
      err = e
    }

    const appErr = err as AppError
    expect(appErr.code).toBe('NETWORK_ERROR')
  })
})
