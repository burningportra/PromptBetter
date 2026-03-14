import { ipcMain, safeStorage } from 'electron'
import { store } from './store'
import { IPC } from '../shared/types'
import type { AppSettings, HistoryEntry, Preset, FeedbackAggregate } from '../shared/types'
import { listSessions, sendToTmux, sendViaClipboard } from './tmux'

// ---------------------------------------------------------------------------
// Payload validators — parse at the IPC boundary, trust inside
// ---------------------------------------------------------------------------

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isValidSettingsPatch(v: unknown): v is Partial<AppSettings> {
  if (!isObject(v)) return false
  const allowed = new Set(['apiKey', 'defaultModel', 'defaultPreset', 'theme', 'hotkey', 'maxHistoryEntries'])
  return Object.keys(v).every((k) => allowed.has(k))
}

function isValidHistoryEntry(v: unknown): v is HistoryEntry {
  if (!isObject(v)) return false
  return (
    isNonEmptyString(v['id']) &&
    typeof v['timestamp'] === 'number' &&
    typeof v['original'] === 'string' &&
    typeof v['improved'] === 'string' &&
    typeof v['durationMs'] === 'number'
  )
}

function isValidPreset(v: unknown): v is Preset {
  if (!isObject(v)) return false
  return (
    isNonEmptyString(v['id']) &&
    isNonEmptyString(v['name']) &&
    typeof v['description'] === 'string' &&
    typeof v['systemPrompt'] === 'string' &&
    typeof v['isBuiltIn'] === 'boolean'
  )
}

function isValidFeedbackAggregate(v: unknown): v is FeedbackAggregate {
  if (!isObject(v)) return false
  return (
    isNonEmptyString(v['id']) &&
    typeof v['thumbsUp'] === 'number' &&
    typeof v['thumbsDown'] === 'number' &&
    typeof v['lastUpdated'] === 'number'
  )
}

// ---------------------------------------------------------------------------
// safeStorage helpers — OS-backed encryption for the API key
// ---------------------------------------------------------------------------

function encryptApiKey(apiKey: string): string {
  if (!safeStorage.isEncryptionAvailable()) return apiKey
  return safeStorage.encryptString(apiKey).toString('base64')
}

function decryptApiKey(encrypted: string): string {
  if (!encrypted) return ''
  if (!safeStorage.isEncryptionAvailable()) return encrypted
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

export function registerIpcHandlers(): void {
  // Settings — apiKey stored encrypted separately via safeStorage
  ipcMain.handle(IPC.GET_SETTINGS, () => {
    const settings = store.get('settings')
    const apiKey = decryptApiKey(store.get('apiKeyEncrypted'))
    return { ...settings, apiKey }
  })

  ipcMain.handle(IPC.SET_SETTINGS, (_event, patch: unknown) => {
    if (!isValidSettingsPatch(patch)) throw new Error('Invalid settings patch')
    const { apiKey, ...rest } = patch as Partial<AppSettings>
    if (apiKey !== undefined) {
      store.set('apiKeyEncrypted', encryptApiKey(apiKey))
    }
    if (Object.keys(rest).length > 0) {
      const current = store.get('settings')
      store.set('settings', { ...current, ...rest })
    }
  })

  // History
  ipcMain.handle(IPC.GET_HISTORY, () => store.get('history'))

  ipcMain.handle(IPC.ADD_HISTORY_ENTRY, (_event, entry: unknown) => {
    if (!isValidHistoryEntry(entry)) throw new Error('Invalid history entry')
    const history = store.get('history')
    const settings = store.get('settings')
    const updated = [entry, ...history].slice(0, settings.maxHistoryEntries)
    store.set('history', updated)
  })

  ipcMain.handle(IPC.CLEAR_HISTORY, () => {
    store.set('history', [])
  })

  // Presets
  ipcMain.handle(IPC.GET_PRESETS, () => store.get('presets'))

  ipcMain.handle(IPC.SET_PRESET, (_event, preset: unknown) => {
    if (!isValidPreset(preset)) throw new Error('Invalid preset')
    const presets = store.get('presets')
    const idx = presets.findIndex((p) => p.id === preset.id)
    if (idx >= 0) {
      presets[idx] = preset
    } else {
      presets.push(preset)
    }
    store.set('presets', presets)
  })

  ipcMain.handle(IPC.DELETE_PRESET, (_event, presetId: unknown) => {
    if (!isNonEmptyString(presetId)) throw new Error('Invalid preset id')
    const presets = store.get('presets').filter((p) => p.id !== presetId)
    store.set('presets', presets)
  })

  // Feedback aggregates
  ipcMain.handle(IPC.GET_FEEDBACK_AGGREGATES, () => store.get('feedbackAggregates'))

  ipcMain.handle(IPC.SET_FEEDBACK_AGGREGATE, (_event, aggregate: unknown) => {
    if (!isValidFeedbackAggregate(aggregate)) throw new Error('Invalid feedback aggregate')
    const aggregates = store.get('feedbackAggregates')
    const idx = aggregates.findIndex((a) => a.id === aggregate.id)
    if (idx >= 0) {
      aggregates[idx] = aggregate
    } else {
      aggregates.push(aggregate)
    }
    store.set('feedbackAggregates', aggregates)
  })

  // Tmux session list
  ipcMain.handle(IPC.LIST_TMUX_SESSIONS, () => listSessions())

  // Dispatch prompt to tmux session with clipboard fallback
  ipcMain.handle(IPC.DISPATCH_PROMPT, async (_event, payload: unknown) => {
    if (!isObject(payload)) throw new Error('Invalid dispatch payload')
    const { prompt, sessionName } = payload
    if (typeof prompt !== 'string' || typeof sessionName !== 'string') {
      throw new Error('Invalid dispatch payload fields')
    }
    try {
      await sendToTmux(prompt, sessionName)
      return { success: true, method: 'tmux' }
    } catch {
      // Fallback to clipboard
      const copied = await sendViaClipboard(prompt)
      return { success: copied, method: 'clipboard' }
    }
  })

  // Improve prompt — wires through to OpenRouter (stub implementation)
  ipcMain.handle(IPC.IMPROVE_PROMPT, async (_event, request: unknown) => {
    if (!isObject(request)) throw new Error('Invalid improve request')
    if (typeof request['prompt'] !== 'string') throw new Error('Missing prompt field')
    // TODO: wire to core/openrouter.ts in issue #57
    throw new Error('Not yet implemented')
  })
}
