import { Tray, Menu, nativeImage, app } from 'electron'
import { APP_NAME } from '../shared/constants'

let tray: Tray | null = null

/**
 * Create and configure the system tray icon with context menu.
 *
 * @param onShowHide - Called when the user clicks Show/Hide (or the tray icon itself).
 * @param onSettings - Called when the user clicks Settings.
 */
export function createTray(onShowHide: () => void, onSettings: () => void): Tray {
  // Use an empty image as a placeholder icon.
  // Replace with nativeImage.createFromPath(...) once artwork is available.
  const icon = nativeImage.createEmpty()

  tray = new Tray(icon)
  tray.setToolTip(APP_NAME)

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show / Hide', click: onShowHide },
    { label: 'Settings', click: onSettings },
    { type: 'separator' },
    { label: 'Quit PromptBetter', click: () => app.quit() },
  ])

  tray.setContextMenu(contextMenu)

  // Single-click on the tray icon toggles the panel.
  tray.on('click', onShowHide)

  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
