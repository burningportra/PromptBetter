import { describe, it, expect, vi, beforeEach } from 'vitest'

// Stub window.electronAPI before importing
const mockImprovePrompt = vi.fn()
const mockDispatchPrompt = vi.fn()

vi.stubGlobal('window', {
  electronAPI: {
    improvePrompt: mockImprovePrompt,
    dispatchPrompt: mockDispatchPrompt,
    hideWindow: vi.fn().mockResolvedValue(undefined),
  },
})

const mockClipboardWrite = vi.fn().mockResolvedValue(undefined)
vi.stubGlobal('navigator', {
  clipboard: { writeText: mockClipboardWrite },
  platform: 'MacIntel',
})

const { createPanelActions } = await import('./usePanelActions')
import { DEFAULT_MODEL, DEFAULT_PRESET } from '../../shared/constants'

// ---- Helpers ---------------------------------------------------------------

const makeStore = (overrides: Partial<{
  input: string
  output: string
  loading: boolean
}> = {}) => {
  const state = {
    input: 'test prompt',
    output: '',
    loading: false,
    ...overrides,
  }
  const setOutput = vi.fn()
  const setLoading = vi.fn()
  const setError = vi.fn()
  return { ...state, setOutput, setLoading, setError }
}

const defaultOpts = {
  activePreset: DEFAULT_PRESET,
  activeModel: DEFAULT_MODEL,
  slashCommand: null,
  tmuxSession: 'my-session',
}

// ---- Tests -----------------------------------------------------------------

describe('createPanelActions', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('handleImprove', () => {
    it('calls improvePrompt with correct args and updates output', async () => {
      mockImprovePrompt.mockResolvedValueOnce({
        improved: 'improved prompt',
        patterns: [],
        score: { overall: 90, specificity: 80, actionability: 85, contextRichness: 75, antiPatternPenalty: 0 },
        durationMs: 100,
      })

      const store = makeStore()
      const { handleImprove } = createPanelActions(defaultOpts, store)
      await handleImprove()

      expect(mockImprovePrompt).toHaveBeenCalledWith({
        prompt: 'test prompt',
        model: DEFAULT_MODEL,
        preset: DEFAULT_PRESET,
        sessionId: 'my-session',
      })
      expect(store.setOutput).toHaveBeenCalledWith('improved prompt')
      expect(store.setLoading).toHaveBeenNthCalledWith(1, true)
      expect(store.setLoading).toHaveBeenNthCalledWith(2, false)
      expect(store.setError).toHaveBeenCalledWith(null)
    })

    it('uses slashCommand preset over activePreset', async () => {
      mockImprovePrompt.mockResolvedValueOnce({
        improved: 'ok',
        patterns: [],
        score: { overall: 80, specificity: 70, actionability: 75, contextRichness: 65, antiPatternPenalty: 0 },
        durationMs: 50,
      })

      const store = makeStore()
      const { handleImprove } = createPanelActions(
        { ...defaultOpts, slashCommand: 'debugging' },
        store,
      )
      await handleImprove()

      expect(mockImprovePrompt).toHaveBeenCalledWith(
        expect.objectContaining({ preset: 'debugging' }),
      )
    })

    it('sets error and clears loading on API failure', async () => {
      mockImprovePrompt.mockRejectedValueOnce(new Error('API error'))

      const store = makeStore()
      const { handleImprove } = createPanelActions(defaultOpts, store)
      await handleImprove()

      expect(store.setError).toHaveBeenCalledWith('API error')
      expect(store.setLoading).toHaveBeenLastCalledWith(false)
      expect(store.setOutput).not.toHaveBeenCalled()
    })

    it('does nothing when input is blank', async () => {
      const store = makeStore({ input: '   ' })
      const { handleImprove } = createPanelActions(defaultOpts, store)
      await handleImprove()

      expect(mockImprovePrompt).not.toHaveBeenCalled()
      expect(store.setLoading).not.toHaveBeenCalled()
    })

    it('does nothing when already loading', async () => {
      const store = makeStore({ loading: true })
      const { handleImprove } = createPanelActions(defaultOpts, store)
      await handleImprove()

      expect(mockImprovePrompt).not.toHaveBeenCalled()
    })

    it('omits sessionId when tmuxSession is empty', async () => {
      mockImprovePrompt.mockResolvedValueOnce({
        improved: 'ok',
        patterns: [],
        score: { overall: 80, specificity: 70, actionability: 75, contextRichness: 65, antiPatternPenalty: 0 },
        durationMs: 50,
      })

      const store = makeStore()
      const { handleImprove } = createPanelActions({ ...defaultOpts, tmuxSession: '' }, store)
      await handleImprove()

      expect(mockImprovePrompt).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: undefined }),
      )
    })
  })

  describe('handleSend', () => {
    it('dispatches output when available', async () => {
      mockDispatchPrompt.mockResolvedValueOnce({ success: true, method: 'tmux' })
      const store = makeStore({ output: 'the output' })
      const { handleSend } = createPanelActions(defaultOpts, store)
      await handleSend()
      expect(mockDispatchPrompt).toHaveBeenCalledWith('the output', 'my-session')
    })

    it('falls back to input when output is empty', async () => {
      mockDispatchPrompt.mockResolvedValueOnce({ success: true, method: 'tmux' })
      const store = makeStore({ output: '' })
      const { handleSend } = createPanelActions(defaultOpts, store)
      await handleSend()
      expect(mockDispatchPrompt).toHaveBeenCalledWith('test prompt', 'my-session')
    })

    it('does nothing when both input and output are blank', async () => {
      const store = makeStore({ input: '', output: '' })
      const { handleSend } = createPanelActions(defaultOpts, store)
      await handleSend()
      expect(mockDispatchPrompt).not.toHaveBeenCalled()
    })
  })

  describe('handleImproveAndSend', () => {
    it('improves then dispatches the improved text', async () => {
      mockImprovePrompt.mockResolvedValueOnce({
        improved: 'better prompt',
        patterns: [],
        score: { overall: 95, specificity: 90, actionability: 88, contextRichness: 80, antiPatternPenalty: 0 },
        durationMs: 80,
      })
      mockDispatchPrompt.mockResolvedValueOnce({ success: true, method: 'tmux' })

      const store = makeStore()
      const { handleImproveAndSend } = createPanelActions(defaultOpts, store)
      await handleImproveAndSend()

      expect(mockImprovePrompt).toHaveBeenCalledOnce()
      expect(mockDispatchPrompt).toHaveBeenCalledWith('better prompt', 'my-session')
      expect(store.setOutput).toHaveBeenCalledWith('better prompt')
    })
  })

  describe('handleCopy', () => {
    it('copies output to clipboard', async () => {
      const store = makeStore({ output: 'copy this' })
      const { handleCopy } = createPanelActions(defaultOpts, store)
      await handleCopy()
      expect(mockClipboardWrite).toHaveBeenCalledWith('copy this')
    })

    it('falls back to input when output is empty', async () => {
      const store = makeStore({ output: '' })
      const { handleCopy } = createPanelActions(defaultOpts, store)
      await handleCopy()
      expect(mockClipboardWrite).toHaveBeenCalledWith('test prompt')
    })

    it('does nothing when both input and output are empty', async () => {
      const store = makeStore({ input: '', output: '' })
      const { handleCopy } = createPanelActions(defaultOpts, store)
      await handleCopy()
      expect(mockClipboardWrite).not.toHaveBeenCalled()
    })

    it('falls back to dispatchPrompt when clipboard API fails', async () => {
      mockClipboardWrite.mockRejectedValueOnce(new Error('denied'))
      mockDispatchPrompt.mockResolvedValueOnce({ success: true, method: 'clipboard' })

      const store = makeStore({ output: 'fallback' })
      const { handleCopy } = createPanelActions(defaultOpts, store)
      await handleCopy()

      expect(mockDispatchPrompt).toHaveBeenCalledWith('fallback', '')
    })

    it('handles double failure (clipboard + dispatchPrompt) without throwing', async () => {
      mockClipboardWrite.mockRejectedValueOnce(new Error('denied'))
      mockDispatchPrompt.mockRejectedValueOnce(new Error('dispatch failed'))

      const store = makeStore({ output: 'fallback' })
      const { handleCopy } = createPanelActions(defaultOpts, store)
      // Should resolve without throwing
      await expect(handleCopy()).resolves.toBeUndefined()
    })
  })
})
