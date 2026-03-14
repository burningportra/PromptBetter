/**
 * tray.ts unit tests
 *
 * Electron APIs (Tray, Menu, nativeImage, app) are mocked to avoid
 * requiring a display or real Electron environment in CI.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock electron
// ---------------------------------------------------------------------------

const mockTrayInstance = {
  setToolTip: vi.fn(),
  setContextMenu: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
}

const mockMenu = { items: [] }

vi.mock('electron', () => ({
  Tray: vi.fn(() => mockTrayInstance),
  Menu: {
    buildFromTemplate: vi.fn(() => mockMenu),
  },
  nativeImage: {
    createEmpty: vi.fn(() => ({ isEmpty: () => true })),
  },
  app: {
    quit: vi.fn(),
  },
}))

vi.mock('../shared/constants', () => ({
  APP_NAME: 'PromptBetter',
}))

const { createTray, destroyTray } = await import('./tray')

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createTray', () => {
  const onShowHide = vi.fn()
  const onSettings = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the tray instance', async () => {
    const { Tray } = await import('electron')
    const result = createTray(onShowHide, onSettings)
    expect(result).toBe(mockTrayInstance)
    expect(Tray).toHaveBeenCalledTimes(1)
  })

  it('sets tooltip to APP_NAME', () => {
    createTray(onShowHide, onSettings)
    expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith('PromptBetter')
  })

  it('sets a context menu', async () => {
    const { Menu } = await import('electron')
    createTray(onShowHide, onSettings)
    expect(Menu.buildFromTemplate).toHaveBeenCalledTimes(1)
    expect(mockTrayInstance.setContextMenu).toHaveBeenCalledWith(mockMenu)
  })

  it('context menu includes Show/Hide, Settings, and Quit entries', async () => {
    const { Menu } = await import('electron')
    createTray(onShowHide, onSettings)
    const template = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0]
    const labels = template.map((item) => item.label)
    expect(labels).toContain('Show / Hide')
    expect(labels).toContain('Settings')
    expect(labels).toContain('Quit PromptBetter')
  })

  it('wires onShowHide to the Show/Hide menu item click', async () => {
    const { Menu } = await import('electron')
    createTray(onShowHide, onSettings)
    const template = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0]
    const showHideItem = template.find((item) => item.label === 'Show / Hide')
    expect(showHideItem).toBeDefined()
    // @ts-expect-error — invoking click with minimal args for test; third arg is KeyboardEvent
    showHideItem!.click?.({} as Electron.MenuItem, undefined, {} as KeyboardEvent)
    expect(onShowHide).toHaveBeenCalledTimes(1)
  })

  it('wires onSettings to the Settings menu item click', async () => {
    const { Menu } = await import('electron')
    createTray(onShowHide, onSettings)
    const template = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0]
    const settingsItem = template.find((item) => item.label === 'Settings')
    expect(settingsItem).toBeDefined()
    // @ts-expect-error — invoking click with minimal args for test
    settingsItem!.click?.({} as Electron.MenuItem, undefined, {} as KeyboardEvent)
    expect(onSettings).toHaveBeenCalledTimes(1)
  })

  it('Quit item calls app.quit()', async () => {
    const { Menu, app } = await import('electron')
    createTray(onShowHide, onSettings)
    const template = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0]
    const quitItem = template.find((item) => item.label === 'Quit PromptBetter')
    expect(quitItem).toBeDefined()
    // @ts-expect-error — invoking click with minimal args for test
    quitItem!.click?.({} as Electron.MenuItem, undefined, {} as KeyboardEvent)
    expect(app.quit).toHaveBeenCalledTimes(1)
  })

  it('registers a click listener on the tray icon', () => {
    createTray(onShowHide, onSettings)
    expect(mockTrayInstance.on).toHaveBeenCalledWith('click', onShowHide)
  })
})

describe('destroyTray', () => {
  it('destroys the tray when one exists', () => {
    createTray(vi.fn(), vi.fn())
    destroyTray()
    expect(mockTrayInstance.destroy).toHaveBeenCalledTimes(1)
  })

  it('is a no-op when called without a prior createTray', () => {
    // destroyTray() after a prior destroyTray() — should not throw
    destroyTray()
    // Previous test already destroyed; calling again should be safe
    expect(() => destroyTray()).not.toThrow()
  })
})
