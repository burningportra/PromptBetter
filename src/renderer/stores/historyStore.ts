import { create } from 'zustand'
import type { HistoryEntry } from '../../shared/types'

interface HistoryState {
  entries: HistoryEntry[]
  hydrated: boolean

  _hydrate: (entries: HistoryEntry[]) => void
  addEntry: (entry: HistoryEntry) => Promise<void>
  clearHistory: () => Promise<void>
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  hydrated: false,

  _hydrate: (entries) => set({ entries, hydrated: true }),

  addEntry: async (entry) => {
    const previous = get().entries
    const settings = await window.electronAPI.getSettings().catch(() => null)
    const maxEntries = settings?.maxHistoryEntries ?? previous.length + 1
    const optimistic = [entry, ...previous].slice(0, maxEntries)
    set({ entries: optimistic })
    try {
      await window.electronAPI.addHistoryEntry(entry)
    } catch (err) {
      console.error('[historyStore] Failed to persist history entry:', err)
      set({ entries: previous })
    }
  },

  clearHistory: async () => {
    const previous = get().entries
    set({ entries: [] })
    try {
      await window.electronAPI.clearHistory()
    } catch (err) {
      console.error('[historyStore] Failed to clear history:', err)
      set({ entries: previous })
    }
  },
}))
