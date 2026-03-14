import Store from 'electron-store'
import type { AppSettings, HistoryEntry, Preset, FeedbackAggregate } from '../shared/types'
import { DEFAULT_MODEL, DEFAULT_PRESET, DEFAULT_HOTKEY, MAX_HISTORY_ENTRIES } from '../shared/constants'

/** Settings without apiKey — the key is stored separately via safeStorage. */
export type SettingsWithoutApiKey = Omit<AppSettings, 'apiKey'>

export interface StoreSchema {
  settings: SettingsWithoutApiKey
  /** AES-256-GCM encrypted API key produced by safeStorage.encryptString(). */
  apiKeyEncrypted: string
  history: HistoryEntry[]
  presets: Preset[]
  feedbackAggregates: FeedbackAggregate[]
}

const defaults: StoreSchema = {
  settings: {
    defaultModel: DEFAULT_MODEL,
    defaultPreset: DEFAULT_PRESET,
    theme: 'dark',
    hotkey: DEFAULT_HOTKEY,
    maxHistoryEntries: MAX_HISTORY_ENTRIES,
  },
  apiKeyEncrypted: '',
  history: [],
  presets: [],
  feedbackAggregates: [],
}

export const store = new Store<StoreSchema>({ defaults })
