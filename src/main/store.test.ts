/**
 * store.ts unit tests — schema migration and default values.
 *
 * electron-store is mocked to avoid filesystem I/O in CI.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock electron-store
// ---------------------------------------------------------------------------

type StorageMap = Record<string, unknown>

const storage: StorageMap = {}

const mockStore = {
  get: vi.fn((key: string, fallback?: unknown) => {
    return key in storage ? storage[key] : fallback
  }),
  set: vi.fn((key: string, value: unknown) => {
    storage[key] = value
  }),
  delete: vi.fn((key: string) => {
    delete storage[key]
  }),
}

vi.mock('electron-store', () => ({
  default: vi.fn(() => mockStore),
}))

// Mock shared constants to avoid import issues
vi.mock('../shared/constants', () => ({
  DEFAULT_MODEL: 'anthropic/claude-3-5-sonnet',
  DEFAULT_PRESET: 'code',
  DEFAULT_HOTKEY: 'CommandOrControl+Shift+P',
  MAX_HISTORY_ENTRIES: 1000,
}))

const { migrateStore } = await import('./store')

function resetStorage(initial: StorageMap = {}): void {
  Object.keys(storage).forEach((k) => delete storage[k])
  Object.assign(storage, initial)
}

describe('migrateStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStorage()
  })

  // -------------------------------------------------------------------------
  // v0 → v1 migration
  // -------------------------------------------------------------------------

  it('sets schemaVersion to 1 on a v0 store', () => {
    migrateStore()
    expect(mockStore.set).toHaveBeenCalledWith('schemaVersion', 1)
  })

  it('initializes feedbackAggregates to empty array when missing on v0 store', () => {
    migrateStore()
    const call = mockStore.set.mock.calls.find(([k]) => k === 'feedbackAggregates')
    expect(call).toBeTruthy()
    expect(call?.[1]).toEqual([])
  })

  it('does not touch feedbackAggregates if already set on v0 store', () => {
    const existing = [{ id: 'a', thumbsUp: 5, thumbsDown: 2, lastUpdated: 0 }]
    resetStorage({ feedbackAggregates: existing })
    migrateStore()
    const call = mockStore.set.mock.calls.find(([k]) => k === 'feedbackAggregates')
    expect(call).toBeFalsy()
  })

  it('removes legacy apiKeyEncrypted field during v0→v1 migration', () => {
    resetStorage({ apiKeyEncrypted: 'some-encrypted-blob' })
    migrateStore()
    expect(mockStore.delete).toHaveBeenCalledWith('apiKeyEncrypted')
  })

  // -------------------------------------------------------------------------
  // installedAt — always set once, never overwritten
  // -------------------------------------------------------------------------

  it('sets installedAt on a fresh store (v0, no existing value)', () => {
    migrateStore()
    const installedAtCall = mockStore.set.mock.calls.find(([k]) => k === 'installedAt')
    expect(installedAtCall).toBeTruthy()
    const ts = installedAtCall?.[1] as string
    expect(() => new Date(ts)).not.toThrow()
    expect(new Date(ts).getFullYear()).toBeGreaterThanOrEqual(2024)
  })

  it('sets installedAt on a fresh v1 install (installedAt missing since not in defaults)', () => {
    // New install: schemaVersion=1 (from defaults), installedAt not in storage
    resetStorage({ schemaVersion: 1 })
    migrateStore()
    const call = mockStore.set.mock.calls.find(([k]) => k === 'installedAt')
    expect(call).toBeTruthy()
  })

  it('never overwrites an existing installedAt', () => {
    const existing = '2024-01-01T00:00:00.000Z'
    resetStorage({ installedAt: existing })
    migrateStore()
    const installedAtCalls = mockStore.set.mock.calls.filter(([k]) => k === 'installedAt')
    expect(installedAtCalls).toHaveLength(0)
    expect(storage['installedAt']).toBe(existing)
  })

  // -------------------------------------------------------------------------
  // Idempotency
  // -------------------------------------------------------------------------

  it('is idempotent on a fully migrated store with installedAt', () => {
    const existing = '2024-06-01T00:00:00.000Z'
    resetStorage({ schemaVersion: 1, installedAt: existing, feedbackAggregates: [] })
    migrateStore()
    // Only allowable set: none (everything already present)
    const setCalls = mockStore.set.mock.calls
    expect(setCalls).toHaveLength(0)
    expect(mockStore.delete).not.toHaveBeenCalled()
  })
})
