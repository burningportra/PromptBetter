import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AppSettings, HistoryEntry } from '../../shared/types'
import { DEFAULT_MODEL, DEFAULT_PRESET } from '../../shared/constants'

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

const { useHistoryStore } = await import('./historyStore')

const makeSettings = (overrides?: Partial<AppSettings>): AppSettings => ({
  apiKey: '',
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
    useHistoryStore.getState()._hydrate([makeEntry('e1')])
    await useHistoryStore.getState().addEntry(makeEntry('e2'))
    expect(useHistoryStore.getState().entries[0].id).toBe('e2')
  })

  it('reverts optimistic add on IPC failure', async () => {
    mockElectronAPI.getSettings.mockResolvedValue(makeSettings())
    mockElectronAPI.addHistoryEntry.mockRejectedValue(new Error('IPC failed'))
    useHistoryStore.getState()._hydrate([makeEntry('e1')])
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
