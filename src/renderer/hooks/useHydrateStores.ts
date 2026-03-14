import { useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { usePresetsStore } from '../stores/presetsStore'
import { useHistoryStore } from '../stores/historyStore'
import { useFeedbackStore } from '../stores/feedbackStore'

/**
 * Called once on app mount. Fetches all persisted state from the main process
 * via IPC and hydrates each Zustand store.
 *
 * Stores start empty; UI should show loading state until `hydrated` is true.
 */
export function useHydrateStores(): void {
  const hydrateSettings = useSettingsStore((s) => s._hydrate)
  const hydratePresets = usePresetsStore((s) => s._hydrate)
  const hydrateHistory = useHistoryStore((s) => s._hydrate)
  const hydrateFeedback = useFeedbackStore((s) => s._hydrate)

  useEffect(() => {
    Promise.all([
      window.electronAPI.getSettings(),
      window.electronAPI.getPresets(),
      window.electronAPI.getHistory(),
      window.electronAPI.getFeedbackAggregates(),
    ])
      .then(([settings, presets, history, aggregates]) => {
        hydrateSettings(settings)
        hydratePresets(presets)
        hydrateHistory(history)
        hydrateFeedback(aggregates)
      })
      .catch((err) => {
        console.error('[useHydrateStores] Hydration failed:', err)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
