import React, { useState } from 'react'
import { Panel } from './components/Panel'
import { SettingsPanel } from './components/SettingsPanel'
import { useHydrateStores } from './hooks/useHydrateStores'
import { useSettingsStore } from './stores/settingsStore'

function AppContent(): React.ReactElement {
  const [showSettings, setShowSettings] = useState(false)
  const { settings, hydrated } = useSettingsStore()

  // Show settings if no API key is configured (first-run experience)
  const hasApiKey = hydrated && Boolean(settings?.apiKey && settings.apiKey.length > 0)
  const needsSetup = hydrated && !hasApiKey

  if (showSettings || needsSetup) {
    return (
      <SettingsPanel
        onClose={() => setShowSettings(false)}
      />
    )
  }

  return <Panel onOpenSettings={() => setShowSettings(true)} />
}

export default function App(): React.ReactElement {
  useHydrateStores()

  return <AppContent />
}
