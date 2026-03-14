import { useCallback } from 'react'
import { usePromptStore } from '../stores/promptStore'
import type { ImproveRequest } from '../../shared/types'

interface PanelActionsOptions {
  activePreset: string
  activeModel: string
  slashCommand: string | null
  tmuxSession: string
}

interface StoreBindings {
  input: string
  output: string
  loading: boolean
  setOutput: (v: string) => void
  setLoading: (v: boolean) => void
  setError: (v: string | null) => void
}

interface PanelActions {
  handleImprove: () => Promise<void>
  handleSend: () => Promise<void>
  handleImproveAndSend: () => Promise<void>
  handleCopy: () => Promise<void>
}

/** Pure action factory — accepts all dependencies as arguments so it can be tested without React. */
export function createPanelActions(
  opts: PanelActionsOptions,
  store: StoreBindings,
): PanelActions {
  const { activePreset, activeModel, slashCommand, tmuxSession } = opts
  const { input, output, loading, setOutput, setLoading, setError } = store
  const effectivePreset = slashCommand ?? activePreset

  const buildRequest = (): ImproveRequest => ({
    prompt: input,
    model: activeModel,
    preset: effectivePreset,
    sessionId: tmuxSession || undefined,
  })

  return {
    handleImprove: async () => {
      if (loading || !input.trim()) return
      setLoading(true)
      setError(null)
      try {
        const response = await window.electronAPI.improvePrompt(buildRequest())
        setOutput(response.improved)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Improvement failed')
      } finally {
        setLoading(false)
      }
    },

    handleSend: async () => {
      const textToSend = output || input
      if (!textToSend.trim()) return
      try {
        await window.electronAPI.dispatchPrompt(textToSend, tmuxSession)
      } catch (err) {
        console.error('[Panel] Send failed:', err)
      }
    },

    handleImproveAndSend: async () => {
      if (loading || !input.trim()) return
      setLoading(true)
      setError(null)
      try {
        const response = await window.electronAPI.improvePrompt(buildRequest())
        setOutput(response.improved)
        await window.electronAPI.dispatchPrompt(response.improved, tmuxSession)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Operation failed')
      } finally {
        setLoading(false)
      }
    },

    handleCopy: async () => {
      const textToCopy = output || input
      if (!textToCopy) return
      try {
        await navigator.clipboard.writeText(textToCopy)
      } catch {
        try {
          await window.electronAPI.dispatchPrompt(textToCopy, '')
        } catch (fallbackErr) {
          console.error('[Panel] Copy fallback failed:', fallbackErr)
        }
      }
    },
  }
}

/** React hook — thin wrapper that binds createPanelActions to Zustand state. */
export function usePanelActions(opts: PanelActionsOptions): PanelActions {
  const store = usePromptStore((s) => ({
    input: s.input,
    output: s.output,
    loading: s.loading,
    setOutput: s.setOutput,
    setLoading: s.setLoading,
    setError: s.setError,
  }))

  const { activePreset, activeModel, slashCommand, tmuxSession } = opts

  const handleImprove = useCallback(
    () => createPanelActions(opts, store).handleImprove(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.input, store.loading, activeModel, activePreset, slashCommand, tmuxSession],
  )

  const handleSend = useCallback(
    () => createPanelActions(opts, store).handleSend(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.input, store.output, tmuxSession],
  )

  const handleImproveAndSend = useCallback(
    () => createPanelActions(opts, store).handleImproveAndSend(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.input, store.loading, activeModel, activePreset, slashCommand, tmuxSession],
  )

  const handleCopy = useCallback(
    () => createPanelActions(opts, store).handleCopy(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.input, store.output],
  )

  return { handleImprove, handleSend, handleImproveAndSend, handleCopy }
}
