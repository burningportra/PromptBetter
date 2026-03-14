import type { AppSettings, HistoryEntry, Preset, FeedbackAggregate } from '../shared/types'

declare global {
  interface Window {
    electronAPI: {
      ping: () => Promise<string>

      // Settings
      getSettings: () => Promise<AppSettings>
      setSettings: (patch: Partial<AppSettings>) => Promise<void>

      // History
      getHistory: () => Promise<HistoryEntry[]>
      addHistoryEntry: (entry: HistoryEntry) => Promise<void>
      clearHistory: () => Promise<void>

      // Presets
      getPresets: () => Promise<Preset[]>
      setPreset: (preset: Preset) => Promise<void>
      deletePreset: (presetId: string) => Promise<void>

      // Feedback aggregates
      getFeedbackAggregates: () => Promise<FeedbackAggregate[]>
      setFeedbackAggregate: (aggregate: FeedbackAggregate) => Promise<void>
    }
  }
}

export {}
