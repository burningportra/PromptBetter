import { create } from 'zustand'
import type { Preset } from '../../shared/types'

interface PresetsState {
  builtInPresets: Preset[]
  customPresets: Preset[]
  hydrated: boolean

  _hydrate: (customPresets: Preset[]) => void
  setBuiltInPresets: (presets: Preset[]) => void
  saveCustomPreset: (preset: Preset) => Promise<void>
  deleteCustomPreset: (presetId: string) => Promise<void>
  allPresets: () => Preset[]
}

export const usePresetsStore = create<PresetsState>((set, get) => ({
  builtInPresets: [],
  customPresets: [],
  hydrated: false,

  _hydrate: (customPresets) => set({ customPresets, hydrated: true }),

  setBuiltInPresets: (builtInPresets) => set({ builtInPresets }),

  allPresets: () => [...get().builtInPresets, ...get().customPresets],

  saveCustomPreset: async (preset) => {
    const previous = get().customPresets
    const idx = previous.findIndex((p) => p.id === preset.id)
    const updated =
      idx >= 0 ? previous.map((p) => (p.id === preset.id ? preset : p)) : [...previous, preset]
    set({ customPresets: updated })
    try {
      await window.electronAPI.setPreset(preset)
    } catch (err) {
      console.error('[presetsStore] Failed to persist preset:', err)
      set({ customPresets: previous })
    }
  },

  deleteCustomPreset: async (presetId) => {
    const previous = get().customPresets
    set({ customPresets: previous.filter((p) => p.id !== presetId) })
    try {
      await window.electronAPI.deletePreset(presetId)
    } catch (err) {
      console.error('[presetsStore] Failed to delete preset:', err)
      set({ customPresets: previous })
    }
  },
}))
