import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock window.electronAPI before importing stores
const mockElectronAPI = {
  ping: vi.fn(),
  getSettings: vi.fn(),
  setSettings: vi.fn(),
  getHistory: vi.fn(),
  addHistoryEntry: vi.fn(),
  clearHistory: vi.fn(),
  getPresets: vi.fn(),
  setPreset: vi.fn(),
  deletePreset: vi.fn(),
  getFeedbackAggregates: vi.fn(),
  setFeedbackAggregate: vi.fn(),
}

vi.stubGlobal('window', { electronAPI: mockElectronAPI })

// Dynamically import stores after mocking
const { usePromptStore } = await import('../promptStore')
const { useSettingsStore } = await import('../settingsStore')
const { usePresetsStore } = await import('../presetsStore')
const { useHistoryStore } = await import('../historyStore')
const { useFeedbackStore } = await import('../feedbackStore')

import type { AppSettings, HistoryEntry, Preset, FeedbackAggregate } from '../../../shared/types'
import { DEFAULT_MODEL, DEFAULT_PRESET } from '../../../shared/constants'

const makeSettings = (overrides?: Partial<AppSettings>): AppSettings => ({
  apiKey: 'test-key',
  defaultModel: DEFAULT_MODEL,
  defaultPreset: DEFAULT_PRESET,
  theme: 'dark',
  hotkey: 'CommandOrControl+Shift+P',
  maxHistoryEntries: 1000,
  ...overrides,
})

const makeEntry = (id = 'entry-1'): HistoryEntry => ({
  id,
  timestamp: Date.now(),
  original: 'original',
  improved: 'improved',
  score: { overall: 80, specificity: 75, actionability: 85, contextRichness: 80, antiPatternPenalty: 0 },
  model: DEFAULT_MODEL,
  preset: DEFAULT_PRESET,
  durationMs: 200,
})

const makePreset = (id = 'preset-1'): Preset => ({
  id,
  name: 'Test Preset',
  description: 'A test preset',
  systemPrompt: 'Be helpful',
  isBuiltIn: false,
})

const makeFeedback = (id = 'fb-1'): FeedbackAggregate => ({
  id,
  thumbsUp: 5,
  thumbsDown: 1,
  lastUpdated: Date.now(),
})

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

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({ settings: null, hydrated: false })
    vi.clearAllMocks()
  })

  it('starts unhydrated', () => {
    expect(useSettingsStore.getState().hydrated).toBe(false)
    expect(useSettingsStore.getState().settings).toBeNull()
  })

  it('hydrates from IPC data', () => {
    const settings = makeSettings()
    useSettingsStore.getState()._hydrate(settings)
    expect(useSettingsStore.getState().settings).toEqual(settings)
    expect(useSettingsStore.getState().hydrated).toBe(true)
  })

  it('persists setting updates via IPC', async () => {
    mockElectronAPI.setSettings.mockResolvedValue(undefined)
    const settings = makeSettings()
    useSettingsStore.getState()._hydrate(settings)
    await useSettingsStore.getState().updateSettings({ theme: 'light' })
    expect(mockElectronAPI.setSettings).toHaveBeenCalledWith({ theme: 'light' })
    expect(useSettingsStore.getState().settings?.theme).toBe('light')
  })

  it('reverts optimistic update on IPC failure', async () => {
    mockElectronAPI.setSettings.mockRejectedValue(new Error('IPC failed'))
    const settings = makeSettings({ theme: 'dark' })
    useSettingsStore.getState()._hydrate(settings)
    await useSettingsStore.getState().updateSettings({ theme: 'light' })
    expect(useSettingsStore.getState().settings?.theme).toBe('dark')
  })
})

describe('presetsStore', () => {
  beforeEach(() => {
    usePresetsStore.setState({ builtInPresets: [], customPresets: [], hydrated: false })
    vi.clearAllMocks()
  })

  it('hydrates custom presets', () => {
    const preset = makePreset()
    usePresetsStore.getState()._hydrate([preset])
    expect(usePresetsStore.getState().customPresets).toEqual([preset])
    expect(usePresetsStore.getState().hydrated).toBe(true)
  })

  it('saves new custom preset', async () => {
    mockElectronAPI.setPreset.mockResolvedValue(undefined)
    const preset = makePreset()
    await usePresetsStore.getState().saveCustomPreset(preset)
    expect(usePresetsStore.getState().customPresets).toContainEqual(preset)
    expect(mockElectronAPI.setPreset).toHaveBeenCalledWith(preset)
  })

  it('deletes custom preset', async () => {
    mockElectronAPI.deletePreset.mockResolvedValue(undefined)
    const preset = makePreset('p-1')
    usePresetsStore.getState()._hydrate([preset])
    await usePresetsStore.getState().deleteCustomPreset('p-1')
    expect(usePresetsStore.getState().customPresets).toHaveLength(0)
  })

  it('allPresets merges built-in and custom', () => {
    const builtIn = { ...makePreset('built-in'), isBuiltIn: true }
    const custom = makePreset('custom')
    usePresetsStore.setState({ builtInPresets: [builtIn], customPresets: [custom], hydrated: true })
    expect(usePresetsStore.getState().allPresets()).toHaveLength(2)
  })
})

describe('historyStore', () => {
  beforeEach(() => {
    useHistoryStore.setState({ entries: [], hydrated: false })
    vi.clearAllMocks()
  })

  it('hydrates entries', () => {
    const entry = makeEntry()
    useHistoryStore.getState()._hydrate([entry])
    expect(useHistoryStore.getState().entries).toEqual([entry])
    expect(useHistoryStore.getState().hydrated).toBe(true)
  })

  it('prepends new entries', async () => {
    mockElectronAPI.getSettings.mockResolvedValue(makeSettings())
    mockElectronAPI.addHistoryEntry.mockResolvedValue(undefined)
    const e1 = makeEntry('e1')
    const e2 = makeEntry('e2')
    useHistoryStore.getState()._hydrate([e1])
    await useHistoryStore.getState().addEntry(e2)
    expect(useHistoryStore.getState().entries[0].id).toBe('e2')
  })

  it('reverts optimistic add on IPC failure', async () => {
    mockElectronAPI.getSettings.mockResolvedValue(makeSettings())
    mockElectronAPI.addHistoryEntry.mockRejectedValue(new Error('IPC failed'))
    const e1 = makeEntry('e1')
    useHistoryStore.getState()._hydrate([e1])
    await useHistoryStore.getState().addEntry(makeEntry('e2'))
    expect(useHistoryStore.getState().entries).toHaveLength(1)
    expect(useHistoryStore.getState().entries[0].id).toBe('e1')
  })

  it('respects maxHistoryEntries cap', async () => {
    mockElectronAPI.getSettings.mockResolvedValue(makeSettings({ maxHistoryEntries: 2 }))
    mockElectronAPI.addHistoryEntry.mockResolvedValue(undefined)
    useHistoryStore.getState()._hydrate([makeEntry('e1'), makeEntry('e2')])
    await useHistoryStore.getState().addEntry(makeEntry('e3'))
    expect(useHistoryStore.getState().entries).toHaveLength(2)
    expect(useHistoryStore.getState().entries[0].id).toBe('e3')
  })

  it('clears history', async () => {
    mockElectronAPI.clearHistory.mockResolvedValue(undefined)
    useHistoryStore.getState()._hydrate([makeEntry()])
    await useHistoryStore.getState().clearHistory()
    expect(useHistoryStore.getState().entries).toHaveLength(0)
  })
})

describe('feedbackStore', () => {
  beforeEach(() => {
    useFeedbackStore.setState({ aggregates: [], hydrated: false })
    vi.clearAllMocks()
  })

  it('hydrates aggregates', () => {
    const fb = makeFeedback()
    useFeedbackStore.getState()._hydrate([fb])
    expect(useFeedbackStore.getState().aggregates).toEqual([fb])
    expect(useFeedbackStore.getState().hydrated).toBe(true)
  })

  it('updates existing aggregate', async () => {
    mockElectronAPI.setFeedbackAggregate.mockResolvedValue(undefined)
    const original = makeFeedback('fb-1')
    useFeedbackStore.getState()._hydrate([original])
    const updated = { ...original, thumbsUp: 10 }
    await useFeedbackStore.getState().updateAggregate(updated)
    expect(useFeedbackStore.getState().aggregates[0].thumbsUp).toBe(10)
  })

  it('adds new aggregate if not found', async () => {
    mockElectronAPI.setFeedbackAggregate.mockResolvedValue(undefined)
    await useFeedbackStore.getState().updateAggregate(makeFeedback('new'))
    expect(useFeedbackStore.getState().aggregates).toHaveLength(1)
  })
})
