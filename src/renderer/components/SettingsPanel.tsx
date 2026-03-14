import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { ModelDropdown } from './ModelDropdown'
import { TmuxDropdown } from './TmuxDropdown'

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps): React.ReactElement {
  const { settings, updateSettings } = useSettingsStore()

  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)
  const [apiKeySaved, setApiKeySaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [tmuxSession, setTmuxSession] = useState('')

  const apiKeyRef = useRef<HTMLInputElement>(null)

  // Pre-fill masked placeholder if key is already set
  const hasExistingKey = Boolean(settings?.apiKey && settings.apiKey.length > 0)

  useEffect(() => {
    apiKeyRef.current?.focus()
  }, [])

  const handleSaveApiKey = useCallback(async () => {
    const trimmed = apiKeyInput.trim()
    if (!trimmed) {
      setApiKeyError('API key is required')
      return
    }
    if (!trimmed.startsWith('sk-or-')) {
      setApiKeyError('Key must start with sk-or-')
      return
    }
    setApiKeyError(null)
    setIsSaving(true)
    try {
      await updateSettings({ apiKey: trimmed })
      setApiKeyInput('')
      setApiKeySaved(true)
      setTimeout(() => setApiKeySaved(false), 2000)
    } catch {
      setApiKeyError('Failed to save API key')
    } finally {
      setIsSaving(false)
    }
  }, [apiKeyInput, updateSettings])

  const handleClearApiKey = useCallback(async () => {
    try {
      await window.electronAPI.deleteApiKey()
      await updateSettings({ apiKey: '' })
      setApiKeyInput('')
      setApiKeySaved(false)
    } catch {
      setApiKeyError('Failed to clear API key')
    }
  }, [updateSettings])

  const handleModelChange = useCallback(
    (model: string) => {
      void updateSettings({ defaultModel: model })
    },
    [updateSettings],
  )

  const handleApiKeyKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        void handleSaveApiKey()
      }
    },
    [handleSaveApiKey],
  )

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-gray-700/60 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-200">Settings</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="
            text-gray-400 hover:text-gray-200 text-lg leading-none
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded
          "
          style={{ touchAction: 'manipulation' }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 min-h-0">
        {/* API Key */}
        <section>
          <label htmlFor="api-key-input" className="block text-xs text-gray-400 mb-1">
            OpenRouter API Key
          </label>
          <div className="flex gap-2">
            <input
              id="api-key-input"
              ref={apiKeyRef}
              type="password"
              value={apiKeyInput}
              onChange={(e) => {
                setApiKeyInput(e.target.value)
                setApiKeyError(null)
              }}
              onKeyDown={handleApiKeyKeyDown}
              placeholder={hasExistingKey ? '••••••••••••••••' : 'sk-or-...'}
              autoComplete="off"
              spellCheck={false}
              className="
                flex-1 min-w-0 bg-gray-800 border border-gray-600 text-gray-100 text-sm
                rounded-md px-3 py-2
                placeholder:text-gray-600
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
              "
              style={{ touchAction: 'manipulation' }}
            />
            <button
              type="button"
              onClick={() => void handleSaveApiKey()}
              disabled={isSaving || !apiKeyInput.trim()}
              aria-label="Save API key"
              className="
                flex-shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium
                rounded-md px-3 py-2 min-h-[36px]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors
              "
              style={{ touchAction: 'manipulation' }}
            >
              {apiKeySaved ? 'Saved ✓' : 'Save'}
            </button>
            {hasExistingKey && (
              <button
                type="button"
                onClick={() => void handleClearApiKey()}
                aria-label="Clear API key"
                className="
                  flex-shrink-0 bg-gray-700 hover:bg-red-700 text-gray-300 hover:text-white
                  text-xs font-medium rounded-md px-3 py-2 min-h-[36px] border border-gray-600
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500
                  transition-colors
                "
                style={{ touchAction: 'manipulation' }}
              >
                Clear
              </button>
            )}
          </div>
          {apiKeyError && (
            <p className="mt-1 text-xs text-red-400">{apiKeyError}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Stored securely in your OS keychain. Get a key at{' '}
            <span className="text-blue-400">openrouter.ai/keys</span>
          </p>
        </section>

        {/* Default Model */}
        <section>
          <label className="block text-xs text-gray-400 mb-1">Default Model</label>
          <ModelDropdown
            value={settings?.defaultModel ?? ''}
            onChange={handleModelChange}
          />
        </section>

        {/* Terminal Mode */}
        <section>
          <label className="block text-xs text-gray-400 mb-1">Terminal Mode</label>
          <TmuxDropdown value={tmuxSession} onChange={setTmuxSession} />
          <p className="mt-1 text-xs text-gray-500">
            Select a tmux session to dispatch improved prompts, or leave blank for clipboard.
          </p>
        </section>
      </div>
    </div>
  )
}
