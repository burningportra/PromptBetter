import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { execFile } from 'child_process'
import { join } from 'path'
import { DEFAULT_HOTKEY, PANEL_WIDTH, PANEL_HEIGHT } from '../shared/constants'
import { IPC } from '../shared/types'
import { registerIpcHandlers } from './ipc'
import { migrateStore, store } from './store'
import { createTray, destroyTray } from './tray'
import { initLogger, createLogger } from './logger'
import type { LogLevel } from './logger'

const logger = createLogger('main')

let mainWindow: BrowserWindow | null = null

// ---------------------------------------------------------------------------
// Focus tracking — remember the frontmost app before we steal focus so we
// can restore it when the panel hides (macOS only).
// ---------------------------------------------------------------------------

let previousApp: string | null = null

function captureFrontApp(): void {
  if (process.platform !== 'darwin') return
  execFile(
    '/usr/bin/osascript',
    ['-e', 'tell application "System Events" to get name of first application process whose frontmost is true'],
    (_err, stdout) => {
      if (!_err) previousApp = stdout.trim()
    },
  )
}

function restoreFrontApp(): void {
  if (process.platform !== 'darwin' || !previousApp) return
  const appToActivate = previousApp
  execFile('/usr/bin/osascript', ['-e', `tell application "${appToActivate}" to activate`], () => {})
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

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
    restoreFrontApp()
  })
}

// ---------------------------------------------------------------------------
// Hotkey
// ---------------------------------------------------------------------------

function registerHotkey(): void {
  const registered = globalShortcut.register(DEFAULT_HOTKEY, () => {
    if (!mainWindow) return
    if (mainWindow.isVisible()) {
      mainWindow.hide()
      restoreFrontApp()
      logger.debug('Panel hidden via hotkey')
    } else {
      captureFrontApp()
      mainWindow.show()
      mainWindow.focus()
      logger.debug('Panel shown via hotkey')
    }
  })

  if (!registered) {
    logger.error('Failed to register hotkey', { hotkey: DEFAULT_HOTKEY })
  } else {
    logger.info('Hotkey registered', { hotkey: DEFAULT_HOTKEY })
  }
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(() => {
  migrateStore()

  // Initialize logger before anything else so all subsequent logs are captured
  const logDir = app.getPath('logs')
  const settings = store.get('settings')
  initLogger(logDir, (settings.logLevel ?? 'info') as LogLevel)

  logger.info('App starting', { version: app.getVersion(), platform: process.platform })

  registerIpcHandlers()
  createWindow()
  registerHotkey()

  createTray(
    // Show/Hide
    () => {
      if (!mainWindow) return
      if (mainWindow.isVisible()) {
        mainWindow.hide()
        restoreFrontApp()
      } else {
        captureFrontApp()
        mainWindow.show()
        mainWindow.focus()
      }
    },
    // Settings — show panel (renderer handles navigation to settings tab)
    () => {
      if (!mainWindow) return
      captureFrontApp()
      mainWindow.show()
      mainWindow.focus()
    },
  )

  logger.info('App ready')

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
  logger.info('App quitting')
  globalShortcut.unregisterAll()
  destroyTray()
})

// ping — kept for sanity-check in tests
ipcMain.handle('ping', () => 'pong')

// Explicit hide — called by renderer on Escape key
ipcMain.handle(IPC.HIDE_WINDOW, () => {
  mainWindow?.hide()
  restoreFrontApp()
})
