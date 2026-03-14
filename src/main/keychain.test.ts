/**
 * keychain.ts unit tests
 *
 * keytar calls are mocked to avoid OS keychain interaction in CI.
 * The actual keytar integration is verified at the system level.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock keytar before importing the module under test
// ---------------------------------------------------------------------------

const mockGetPassword = vi.fn<() => Promise<string | null>>()
const mockSetPassword = vi.fn<() => Promise<void>>()
const mockDeletePassword = vi.fn<() => Promise<boolean>>()

vi.mock('keytar', () => ({
  default: {
    getPassword: mockGetPassword,
    setPassword: mockSetPassword,
    deletePassword: mockDeletePassword,
  },
}))

// Re-import after mock is registered
const { getApiKey, setApiKey, deleteApiKey } = await import('./keychain')

describe('keychain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env['OPENROUTER_API_KEY']
  })

  afterEach(() => {
    delete process.env['OPENROUTER_API_KEY']
  })

  // -------------------------------------------------------------------------
  // getApiKey
  // -------------------------------------------------------------------------

  describe('getApiKey', () => {
    it('returns env var first when set, without calling keytar', async () => {
      process.env['OPENROUTER_API_KEY'] = 'sk-or-env-key'
      const result = await getApiKey()
      expect(result).toBe('sk-or-env-key')
      expect(mockGetPassword).not.toHaveBeenCalled()
    })

    it('trims whitespace from env var', async () => {
      process.env['OPENROUTER_API_KEY'] = '  sk-or-trimmed  '
      const result = await getApiKey()
      expect(result).toBe('sk-or-trimmed')
    })

    it('ignores blank env var and falls through to keytar', async () => {
      process.env['OPENROUTER_API_KEY'] = '   '
      mockGetPassword.mockResolvedValueOnce('sk-or-keytar-key')
      const result = await getApiKey()
      expect(result).toBe('sk-or-keytar-key')
      expect(mockGetPassword).toHaveBeenCalledWith('promptbetter', 'openrouter-api-key')
    })

    it('returns keytar value when no env var is set', async () => {
      mockGetPassword.mockResolvedValueOnce('sk-or-stored-key')
      const result = await getApiKey()
      expect(result).toBe('sk-or-stored-key')
      expect(mockGetPassword).toHaveBeenCalledWith('promptbetter', 'openrouter-api-key')
    })

    it('returns null when no key is stored and no env var', async () => {
      mockGetPassword.mockResolvedValueOnce(null)
      const result = await getApiKey()
      expect(result).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // setApiKey
  // -------------------------------------------------------------------------

  describe('setApiKey', () => {
    it('stores a valid key in the OS keychain', async () => {
      mockSetPassword.mockResolvedValueOnce(undefined)
      await setApiKey('sk-or-valid-key-123')
      expect(mockSetPassword).toHaveBeenCalledWith(
        'promptbetter',
        'openrouter-api-key',
        'sk-or-valid-key-123',
      )
    })

    it('throws for keys not starting with sk-or-', async () => {
      await expect(setApiKey('sk-openai-key')).rejects.toThrow(
        'Invalid API key format — must start with sk-or-',
      )
      expect(mockSetPassword).not.toHaveBeenCalled()
    })

    it('throws for empty string', async () => {
      await expect(setApiKey('')).rejects.toThrow('Invalid API key format')
      expect(mockSetPassword).not.toHaveBeenCalled()
    })

    it('throws for plaintext AWS key', async () => {
      await expect(setApiKey('AKIAIOSFODNN7EXAMPLE')).rejects.toThrow('Invalid API key format')
      expect(mockSetPassword).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // deleteApiKey
  // -------------------------------------------------------------------------

  describe('deleteApiKey', () => {
    it('returns true when a key existed and was deleted', async () => {
      mockDeletePassword.mockResolvedValueOnce(true)
      const result = await deleteApiKey()
      expect(result).toBe(true)
      expect(mockDeletePassword).toHaveBeenCalledWith('promptbetter', 'openrouter-api-key')
    })

    it('returns false when no key was stored', async () => {
      mockDeletePassword.mockResolvedValueOnce(false)
      const result = await deleteApiKey()
      expect(result).toBe(false)
    })
  })
})
