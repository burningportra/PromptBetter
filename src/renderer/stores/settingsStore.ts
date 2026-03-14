import { create } from 'zustand'
import type { AppSettings } from '../../shared/types'

interface SettingsState {
  settings: AppSettings | null
  hydrated: boolean

  _hydrate: (settings: AppSettings) => void
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  hydrated: false,

  _hydrate: (settings) => set({ settings, hydrated: true }),

  updateSettings: async (patch) => {
    const current = get().settings
    if (!current) return
    const updated = { ...current, ...patch }
    set({ settings: updated })
    try {
      await window.electronAPI.setSettings(patch)
    } catch (err) {
      console.error('[settingsStore] Failed to persist settings:', err)
      // Revert optimistic update on failure
      set({ settings: current })
    }
  },
}))
