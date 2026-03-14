import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Preset } from '../../shared/types'

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

const { usePresetsStore } = await import('./presetsStore')

const makePreset = (id = 'preset-1'): Preset => ({
  id,
  name: 'Test Preset',
  description: 'A test preset',
  systemPrompt: 'Be helpful',
  isBuiltIn: false,
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

  it('reverts on save failure', async () => {
    mockElectronAPI.setPreset.mockRejectedValue(new Error('IPC failed'))
    const preset = makePreset()
    await usePresetsStore.getState().saveCustomPreset(preset)
    expect(usePresetsStore.getState().customPresets).toHaveLength(0)
  })

  it('deletes custom preset', async () => {
    mockElectronAPI.deletePreset.mockResolvedValue(undefined)
    usePresetsStore.getState()._hydrate([makePreset('p-1')])
    await usePresetsStore.getState().deleteCustomPreset('p-1')
    expect(usePresetsStore.getState().customPresets).toHaveLength(0)
  })

  it('reverts on delete failure', async () => {
    mockElectronAPI.deletePreset.mockRejectedValue(new Error('IPC failed'))
    usePresetsStore.getState()._hydrate([makePreset('p-1')])
    await usePresetsStore.getState().deleteCustomPreset('p-1')
    expect(usePresetsStore.getState().customPresets).toHaveLength(1)
  })

  it('allPresets merges built-in and custom', () => {
    const builtIn = { ...makePreset('built-in'), isBuiltIn: true }
    const custom = makePreset('custom')
    usePresetsStore.setState({ builtInPresets: [builtIn], customPresets: [custom], hydrated: true })
    expect(usePresetsStore.getState().allPresets()).toHaveLength(2)
  })
})
