import Store from 'electron-store'
import type { AppSettings, HistoryEntry, Preset, FeedbackAggregate } from '../shared/types'
import { DEFAULT_MODEL, DEFAULT_PRESET, DEFAULT_HOTKEY, MAX_HISTORY_ENTRIES } from '../shared/constants'

export interface StoreSchema {
  settings: AppSettings
  history: HistoryEntry[]
  presets: Preset[]
  feedbackAggregates: FeedbackAggregate[]
}

const defaults: StoreSchema = {
  settings: {
    apiKey: '',
    defaultModel: DEFAULT_MODEL,
    defaultPreset: DEFAULT_PRESET,
    theme: 'dark',
    hotkey: DEFAULT_HOTKEY,
    maxHistoryEntries: MAX_HISTORY_ENTRIES,
  },
  history: [],
  presets: [],
  feedbackAggregates: [],
}

export const store = new Store<StoreSchema>({ defaults })
