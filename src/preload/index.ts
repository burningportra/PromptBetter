import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { AppSettings, HistoryEntry, Preset, FeedbackAggregate } from '../shared/types'

// Minimal IPC surface exposed to renderer.
// Add channels here only as needed — do not expose broad Node.js APIs.

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),

  // Settings
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.GET_SETTINGS),
  setSettings: (patch: Partial<AppSettings>): Promise<void> =>
    ipcRenderer.invoke(IPC.SET_SETTINGS, patch),

  // History
  getHistory: (): Promise<HistoryEntry[]> => ipcRenderer.invoke(IPC.GET_HISTORY),
  addHistoryEntry: (entry: HistoryEntry): Promise<void> =>
    ipcRenderer.invoke(IPC.ADD_HISTORY_ENTRY, entry),
  clearHistory: (): Promise<void> => ipcRenderer.invoke(IPC.CLEAR_HISTORY),

  // Presets
  getPresets: (): Promise<Preset[]> => ipcRenderer.invoke(IPC.GET_PRESETS),
  setPreset: (preset: Preset): Promise<void> => ipcRenderer.invoke(IPC.SET_PRESET, preset),
  deletePreset: (presetId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DELETE_PRESET, presetId),

  // Feedback aggregates
  getFeedbackAggregates: (): Promise<FeedbackAggregate[]> =>
    ipcRenderer.invoke(IPC.GET_FEEDBACK_AGGREGATES),
  setFeedbackAggregate: (aggregate: FeedbackAggregate): Promise<void> =>
    ipcRenderer.invoke(IPC.SET_FEEDBACK_AGGREGATE, aggregate),
})

export type ElectronAPI = typeof import('./index')
