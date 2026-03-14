import Store from 'electron-store'
import type { AppSettings, HistoryEntry, Preset, FeedbackAggregate } from '../shared/types'
import { DEFAULT_MODEL, DEFAULT_PRESET, DEFAULT_HOTKEY, MAX_HISTORY_ENTRIES } from '../shared/constants'

/** Settings without apiKey — the key is stored separately in the OS keychain via keytar. */
export type SettingsWithoutApiKey = Omit<AppSettings, 'apiKey'>

export interface StoreSchema {
  /** Schema version — bump on breaking changes to trigger migrateStore(). */
  schemaVersion: number
  /**
   * ISO timestamp set on first launch — powers 14-day annotation auto-disable timer.
   * NOT in defaults so electron-store never silently re-stamps it on restart.
   */
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

/**
 * Intentionally excludes `installedAt` — it is set once explicitly by migrateStore()
 * so electron-store cannot silently overwrite it with a new timestamp on each restart.
 * Cast is safe: electron-store treats defaults as a deep partial fallback at runtime.
 */
const defaults = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  settings: {
    defaultModel: DEFAULT_MODEL,
    defaultPreset: DEFAULT_PRESET,
    theme: 'system',
    hotkey: DEFAULT_HOTKEY,
    maxHistoryEntries: MAX_HISTORY_ENTRIES,
  },
  presets: [] as Preset[],
  history: [] as HistoryEntry[],
  feedbackAggregates: [] as FeedbackAggregate[],
} as unknown as StoreSchema

export const store = new Store<StoreSchema>({ defaults })

/**
 * Run sequential migrations based on schemaVersion.
 * Called once on app startup, before IPC handlers register.
 *
 * v0 → v1: Set installedAt, reset feedbackAggregates, remove legacy apiKeyEncrypted.
 *
 * Post-migration: always ensure installedAt is stamped (covers fresh installs where
 * schemaVersion defaults to 1 and the migration block is skipped).
 */
export function migrateStore(): void {
  const version = store.get('schemaVersion', 0)

  if (version < 1) {
    // Ensure feedbackAggregates exists for stores upgraded from v0
    if (!store.get('feedbackAggregates')) {
      store.set('feedbackAggregates', [])
    }
    // Remove legacy apiKeyEncrypted field (API key now lives in OS keychain via keytar)
    const raw = store as unknown as { delete: (key: string) => void }
    raw.delete('apiKeyEncrypted')

    store.set('schemaVersion', 1)
  }

  // Future migrations: if (version < 2) { ... }

  // Set installedAt once — runs for both first-time installs and v0→v1 upgrades.
  // Never overwrites an existing value so the original install time is preserved.
  if (!store.get('installedAt')) {
    store.set('installedAt', new Date().toISOString())
  }
}
