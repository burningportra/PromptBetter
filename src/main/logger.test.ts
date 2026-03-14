/**
 * logger.ts unit tests — sanitization and module logger factory.
 *
 * electron-log is mocked to avoid filesystem I/O in CI.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock electron-log before importing logger
// ---------------------------------------------------------------------------

const mockLog = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  transports: {
    file: {
      resolvePathFn: undefined as unknown,
      format: '',
      level: 'info' as unknown,
    },
    console: {
      level: 'info' as unknown,
    },
  },
}

vi.mock('electron-log', () => ({ default: mockLog }))
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  statSync: vi.fn(() => ({ mtime: new Date() })),
  readdirSync: vi.fn(() => []),
  renameSync: vi.fn(),
  unlinkSync: vi.fn(),
}))

const { sanitizeString, sanitizeContext, createLogger, initLogger } = await import('./logger')

// ---------------------------------------------------------------------------
// sanitizeString
// ---------------------------------------------------------------------------

describe('sanitizeString', () => {
  it('redacts sk- tokens in strings', () => {
    const input = 'Using API key sk-abc123xyz in request'
    expect(sanitizeString(input)).toBe('Using API key [REDACTED] in request')
  })

  it('redacts sk-or- prefixed OpenRouter keys', () => {
    const input = 'key=sk-or-v1-abcdef1234567890'
    expect(sanitizeString(input)).toBe('key=[REDACTED]')
  })

  it('redacts multiple sk- tokens in one string', () => {
    const input = 'primary: sk-abc, fallback: sk-xyz-999'
    expect(sanitizeString(input)).toBe('primary: [REDACTED], fallback: [REDACTED]')
  })

  it('leaves strings without sk- tokens unchanged', () => {
    const safe = 'Model selected: anthropic/claude-3-5-sonnet'
    expect(sanitizeString(safe)).toBe(safe)
  })

  it('handles empty string', () => {
    expect(sanitizeString('')).toBe('')
  })

  it('does not redact partial matches like "task-123"', () => {
    const input = 'task-123 completed'
    // "task-123" does not start with sk-, should be untouched
    expect(sanitizeString(input)).toBe(input)
  })
})

// ---------------------------------------------------------------------------
// sanitizeContext
// ---------------------------------------------------------------------------

describe('sanitizeContext', () => {
  it('redacts sk- values in context objects', () => {
    const ctx = { apiKey: 'sk-secret-key', model: 'claude' }
    const result = sanitizeContext(ctx)
    expect(result['apiKey']).toBe('[REDACTED]')
    expect(result['model']).toBe('claude')
  })

  it('recursively sanitizes nested objects', () => {
    const ctx = { auth: { token: 'sk-nested-key', env: 'prod' }, user: 'alice' }
    const result = sanitizeContext(ctx)
    const auth = result['auth'] as Record<string, unknown>
    expect(auth['token']).toBe('[REDACTED]')
    expect(auth['env']).toBe('prod')
    expect(result['user']).toBe('alice')
  })

  it('passes through non-string values unchanged', () => {
    const ctx = { count: 42, active: true, ratio: 0.5 }
    const result = sanitizeContext(ctx)
    expect(result['count']).toBe(42)
    expect(result['active']).toBe(true)
    expect(result['ratio']).toBe(0.5)
  })

  it('handles empty context object', () => {
    expect(sanitizeContext({})).toEqual({})
  })

  it('sanitizes sk- values inside arrays', () => {
    const ctx = { keys: ['sk-first', 'sk-second', 'safe-value'] }
    const result = sanitizeContext(ctx)
    expect(result['keys']).toEqual(['[REDACTED]', '[REDACTED]', 'safe-value'])
  })

  it('sanitizes sk- values inside arrays of objects', () => {
    const ctx = { items: [{ token: 'sk-abc', name: 'prod' }] }
    const result = sanitizeContext(ctx)
    const items = result['items'] as Array<Record<string, unknown>>
    expect(items[0]?.['token']).toBe('[REDACTED]')
    expect(items[0]?.['name']).toBe('prod')
  })
})

// ---------------------------------------------------------------------------
// createLogger — module namespacing and sanitization integration
// ---------------------------------------------------------------------------

describe('createLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // initLogger is a no-op in test (fs mocked), but call it to set up transports
    initLogger('/tmp/test-logs', 'debug')
  })

  it('prefixes messages with [module] tag', () => {
    const log = createLogger('ipc')
    log.info('Handler registered')
    expect(mockLog.info).toHaveBeenCalledWith('[ipc] Handler registered')
  })

  it('calls log.error for error level', () => {
    const log = createLogger('main')
    log.error('Something failed')
    expect(mockLog.error).toHaveBeenCalledWith('[main] Something failed')
  })

  it('calls log.warn for warn level', () => {
    const log = createLogger('store')
    log.warn('Unexpected state')
    expect(mockLog.warn).toHaveBeenCalledWith('[store] Unexpected state')
  })

  it('calls log.debug for debug level', () => {
    const log = createLogger('tmux')
    log.debug('Session listed')
    expect(mockLog.debug).toHaveBeenCalledWith('[tmux] Session listed')
  })

  it('passes sanitized context as second argument', () => {
    const log = createLogger('ipc')
    log.info('Request', { key: 'sk-secret-abc', model: 'claude' })
    expect(mockLog.info).toHaveBeenCalledWith('[ipc] Request', { key: '[REDACTED]', model: 'claude' })
  })

  it('sanitizes sk- tokens in the message itself', () => {
    const log = createLogger('core')
    log.info('Using sk-abc123 for auth')
    expect(mockLog.info).toHaveBeenCalledWith('[core] Using [REDACTED] for auth')
  })

  it('does not pass context argument when context is empty', () => {
    const log = createLogger('main')
    log.info('App started')
    const call = mockLog.info.mock.calls[0]
    expect(call).toHaveLength(1) // only the message, no context argument
  })
})
