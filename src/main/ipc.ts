import { ipcMain } from 'electron'
import { store } from './store'
import { IPC } from '../shared/types'
import type { AppSettings, HistoryEntry, Preset, FeedbackAggregate } from '../shared/types'

export function registerIpcHandlers(): void {
  // Settings
  ipcMain.handle(IPC.GET_SETTINGS, () => store.get('settings'))

  ipcMain.handle(IPC.SET_SETTINGS, (_event, patch: Partial<AppSettings>) => {
    const current = store.get('settings')
    store.set('settings', { ...current, ...patch })
  })

  // History
  ipcMain.handle(IPC.GET_HISTORY, () => store.get('history'))

  ipcMain.handle(IPC.ADD_HISTORY_ENTRY, (_event, entry: HistoryEntry) => {
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

  ipcMain.handle(IPC.SET_PRESET, (_event, preset: Preset) => {
    const presets = store.get('presets')
    const idx = presets.findIndex((p) => p.id === preset.id)
    if (idx >= 0) {
      presets[idx] = preset
    } else {
      presets.push(preset)
    }
    store.set('presets', presets)
  })

  ipcMain.handle(IPC.DELETE_PRESET, (_event, presetId: string) => {
    const presets = store.get('presets').filter((p) => p.id !== presetId)
    store.set('presets', presets)
  })

  // Feedback aggregates
  ipcMain.handle(IPC.GET_FEEDBACK_AGGREGATES, () => store.get('feedbackAggregates'))

  ipcMain.handle(IPC.SET_FEEDBACK_AGGREGATE, (_event, aggregate: FeedbackAggregate) => {
    const aggregates = store.get('feedbackAggregates')
    const idx = aggregates.findIndex((a) => a.id === aggregate.id)
    if (idx >= 0) {
      aggregates[idx] = aggregate
    } else {
      aggregates.push(aggregate)
    }
    store.set('feedbackAggregates', aggregates)
  })
}
