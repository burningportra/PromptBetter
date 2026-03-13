import { contextBridge, ipcRenderer } from 'electron'

// Minimal IPC surface exposed to renderer.
// Add channels here only as needed — do not expose broad Node.js APIs.

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  // IPC channels will be added per-feature as issues are implemented
})

export type ElectronAPI = typeof import('./index')
