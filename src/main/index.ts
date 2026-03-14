import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { join } from 'path'
import { DEFAULT_HOTKEY, PANEL_WIDTH, PANEL_HEIGHT } from '../shared/constants'
import { IPC } from '../shared/types'
import { registerIpcHandlers } from './ipc'
import { migrateStore } from './store'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    show: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('blur', () => {
    mainWindow?.hide()
  })
}

function registerHotkey(): void {
  const registered = globalShortcut.register(DEFAULT_HOTKEY, () => {
    if (!mainWindow) return
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  if (!registered) {
    console.error(`Failed to register hotkey: ${DEFAULT_HOTKEY}`)
  }
}

app.whenReady().then(() => {
  migrateStore()
  registerIpcHandlers()
  createWindow()
  registerHotkey()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// ping — kept for sanity-check in tests
ipcMain.handle('ping', () => 'pong')

// Explicit hide — called by renderer on Escape key
ipcMain.handle(IPC.HIDE_WINDOW, () => {
  mainWindow?.hide()
})
