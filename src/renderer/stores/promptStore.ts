import { create } from 'zustand'
import type { PatternMatch, QualityScore } from '../../shared/types'
import { DEFAULT_MODEL, DEFAULT_PRESET } from '../../shared/constants'

interface PromptState {
  input: string
  output: string
  loading: boolean
  error: string | null
  patterns: PatternMatch[]
  score: QualityScore | null
  activePreset: string
  activeModel: string
  slashCommand: string | null

  setInput: (input: string) => void
  setOutput: (output: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setPatterns: (patterns: PatternMatch[]) => void
  setScore: (score: QualityScore | null) => void
  setActivePreset: (preset: string) => void
  setActiveModel: (model: string) => void
  setSlashCommand: (cmd: string | null) => void
  reset: () => void
}

const initialState = {
  input: '',
  output: '',
  loading: false,
  error: null,
  patterns: [],
  score: null,
  activePreset: DEFAULT_PRESET,
  activeModel: DEFAULT_MODEL,
  slashCommand: null,
}

export const usePromptStore = create<PromptState>((set) => ({
  ...initialState,

  setInput: (input) => set({ input }),
  setOutput: (output) => set({ output }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setPatterns: (patterns) => set({ patterns }),
  setScore: (score) => set({ score }),
  setActivePreset: (activePreset) => set({ activePreset }),
  setActiveModel: (activeModel) => set({ activeModel }),
  setSlashCommand: (slashCommand) => set({ slashCommand }),
  reset: () => set(initialState),
}))
