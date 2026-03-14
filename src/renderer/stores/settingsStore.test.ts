import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AppSettings } from '../../shared/types'
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

const { useSettingsStore } = await import('./settingsStore')

const makeSettings = (overrides?: Partial<AppSettings>): AppSettings => ({
  apiKey: 'test-key',
  defaultModel: DEFAULT_MODEL,
  defaultPreset: DEFAULT_PRESET,
  theme: 'dark',
  hotkey: 'CommandOrControl+Shift+P',
  maxHistoryEntries: 1000,
  ...overrides,
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
    useSettingsStore.getState()._hydrate(makeSettings())
    await useSettingsStore.getState().updateSettings({ theme: 'light' })
    expect(mockElectronAPI.setSettings).toHaveBeenCalledWith({ theme: 'light' })
    expect(useSettingsStore.getState().settings?.theme).toBe('light')
  })

  it('reverts optimistic update on IPC failure', async () => {
    mockElectronAPI.setSettings.mockRejectedValue(new Error('IPC failed'))
    useSettingsStore.getState()._hydrate(makeSettings({ theme: 'dark' }))
    await useSettingsStore.getState().updateSettings({ theme: 'light' })
    expect(useSettingsStore.getState().settings?.theme).toBe('dark')
  })
})
