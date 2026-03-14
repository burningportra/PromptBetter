import { useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { usePresetsStore } from '../stores/presetsStore'
import { useHistoryStore } from '../stores/historyStore'
import { useFeedbackStore } from '../stores/feedbackStore'

/**
 * Called once on app mount. Fetches all persisted state from the main process
 * via IPC and hydrates each Zustand store.
 *
 * Uses Promise.allSettled so a single failed IPC call doesn't block the
 * remaining stores from initializing. Each result is validated before hydration.
 *
 * Stores start empty; UI should show loading state until `hydrated` is true.
 */
export function useHydrateStores(): void {
  const hydrateSettings = useSettingsStore((s) => s._hydrate)
  const hydratePresets = usePresetsStore((s) => s._hydrate)
  const hydrateHistory = useHistoryStore((s) => s._hydrate)
  const hydrateFeedback = useFeedbackStore((s) => s._hydrate)

  useEffect(() => {
    Promise.allSettled([
      window.electronAPI.getSettings(),
      window.electronAPI.getPresets(),
      window.electronAPI.getHistory(),
      window.electronAPI.getFeedbackAggregates(),
    ]).then(([settingsR, presetsR, historyR, aggregatesR]) => {
      if (settingsR.status === 'fulfilled') {
        hydrateSettings(settingsR.value)
      } else {
        console.error('[useHydrateStores] Failed to load settings:', settingsR.reason)
      }

      if (presetsR.status === 'fulfilled' && Array.isArray(presetsR.value)) {
        hydratePresets(presetsR.value)
      } else if (presetsR.status === 'rejected') {
        console.error('[useHydrateStores] Failed to load presets:', presetsR.reason)
      }

      if (historyR.status === 'fulfilled' && Array.isArray(historyR.value)) {
        hydrateHistory(historyR.value)
      } else if (historyR.status === 'rejected') {
        console.error('[useHydrateStores] Failed to load history:', historyR.reason)
      }

      if (aggregatesR.status === 'fulfilled' && Array.isArray(aggregatesR.value)) {
        hydrateFeedback(aggregatesR.value)
      } else if (aggregatesR.status === 'rejected') {
        console.error('[useHydrateStores] Failed to load feedback aggregates:', aggregatesR.reason)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
