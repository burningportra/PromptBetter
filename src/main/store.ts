import Store from 'electron-store'
import type { AppSettings, HistoryEntry, Preset, FeedbackAggregate } from '../shared/types'
import { DEFAULT_MODEL, DEFAULT_PRESET, DEFAULT_HOTKEY, MAX_HISTORY_ENTRIES } from '../shared/constants'

/** Settings without apiKey — the key is stored separately in the OS keychain via keytar. */
export type SettingsWithoutApiKey = Omit<AppSettings, 'apiKey'>

export interface StoreSchema {
  /** Schema version — bump on breaking changes to trigger migrateStore(). */
  schemaVersion: number
  /** ISO timestamp set on first launch — powers 14-day annotation auto-disable timer. */
  installedAt: string
  settings: SettingsWithoutApiKey
  /** Custom presets only. Built-in presets live in shared/patterns.ts. */
  presets: Preset[]
  /** Max 1000 entries; oldest pruned on overflow. Stored newest-first. */
  history: HistoryEntry[]
  /**
   * Feedback aggregates stored separately from history so they survive pruning.
   * Key format: `<intent>:<patternId>` → { positive, negative }.
   */
  feedbackAggregates: FeedbackAggregate[]
}

const CURRENT_SCHEMA_VERSION = 1

const defaults: StoreSchema = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  installedAt: new Date().toISOString(),
  settings: {
    defaultModel: DEFAULT_MODEL,
    defaultPreset: DEFAULT_PRESET,
    theme: 'system',
    hotkey: DEFAULT_HOTKEY,
    maxHistoryEntries: MAX_HISTORY_ENTRIES,
  },
  presets: [],
  history: [],
  feedbackAggregates: [],
}

export const store = new Store<StoreSchema>({ defaults })

/**
 * Run sequential migrations based on schemaVersion.
 * Called once on app startup, before IPC handlers register.
 *
 * v0 → v1: Set installedAt, reset feedbackAggregates, remove legacy apiKeyEncrypted.
 */
export function migrateStore(): void {
  const version = store.get('schemaVersion', 0)

  if (version < 1) {
    // Set installedAt only if not already present
    if (!store.get('installedAt')) {
      store.set('installedAt', new Date().toISOString())
    }
    // Ensure feedbackAggregates exists
    if (!store.get('feedbackAggregates')) {
      store.set('feedbackAggregates', [])
    }
    // Remove legacy apiKeyEncrypted field (API key now lives in OS keychain via keytar)
    const raw = store as unknown as { delete: (key: string) => void }
    raw.delete('apiKeyEncrypted')

    store.set('schemaVersion', 1)
  }

  // Future migrations: if (version < 2) { ... }
}
