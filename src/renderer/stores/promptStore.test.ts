import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubGlobal('window', { electronAPI: { ping: vi.fn() } })

const { usePromptStore } = await import('./promptStore')
import { DEFAULT_MODEL, DEFAULT_PRESET } from '../../shared/constants'

describe('promptStore', () => {
  beforeEach(() => {
    usePromptStore.setState({
      input: '',
      output: '',
      loading: false,
      error: null,
      patterns: [],
      score: null,
      activePreset: DEFAULT_PRESET,
      activeModel: DEFAULT_MODEL,
      slashCommand: null,
    })
  })

  it('initializes with defaults', () => {
    const state = usePromptStore.getState()
    expect(state.input).toBe('')
    expect(state.loading).toBe(false)
    expect(state.activePreset).toBe(DEFAULT_PRESET)
    expect(state.activeModel).toBe(DEFAULT_MODEL)
  })

  it('updates input', () => {
    usePromptStore.getState().setInput('hello world')
    expect(usePromptStore.getState().input).toBe('hello world')
  })

  it('sets loading state', () => {
    usePromptStore.getState().setLoading(true)
    expect(usePromptStore.getState().loading).toBe(true)
  })

  it('resets to initial state', () => {
    usePromptStore.getState().setInput('hello')
    usePromptStore.getState().setLoading(true)
    usePromptStore.getState().reset()
    expect(usePromptStore.getState().input).toBe('')
    expect(usePromptStore.getState().loading).toBe(false)
  })
})
