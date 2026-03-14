import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { AppSettings, HistoryEntry, Preset, FeedbackAggregate, TmuxSession, ImproveRequest, ImproveResponse } from '../shared/types'

// Minimal IPC surface exposed to renderer.
// Add channels here only as needed — do not expose broad Node.js APIs.

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),

  // Settings
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.GET_SETTINGS),
  setSettings: (patch: Partial<AppSettings>): Promise<void> =>
    ipcRenderer.invoke(IPC.SET_SETTINGS, patch),
  deleteApiKey: (): Promise<void> => ipcRenderer.invoke(IPC.DELETE_API_KEY),

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

  // Tmux
  listTmuxSessions: (): Promise<TmuxSession[]> =>
    ipcRenderer.invoke(IPC.LIST_TMUX_SESSIONS),
  dispatchPrompt: (prompt: string, sessionName: string): Promise<{ success: boolean; method: string }> =>
    ipcRenderer.invoke(IPC.DISPATCH_PROMPT, { prompt, sessionName }),

  // Improve prompt (fires OpenRouter via main process in future; stub for now)
  improvePrompt: (request: ImproveRequest): Promise<ImproveResponse> =>
    ipcRenderer.invoke(IPC.IMPROVE_PROMPT, request),

  // Window management
  hideWindow: (): Promise<void> => ipcRenderer.invoke(IPC.HIDE_WINDOW),
})

export type ElectronAPI = typeof import('./index')
