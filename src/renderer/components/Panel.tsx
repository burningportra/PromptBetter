import React, { useCallback, useEffect, useRef, useState } from 'react'
import { usePromptStore } from '../stores/promptStore'
import { usePresetsStore } from '../stores/presetsStore'
import { useSettingsStore } from '../stores/settingsStore'
import { usePanelActions } from '../hooks/usePanelActions'
import { useSecretDetection } from '../hooks/useSecretDetection'
import { PresetDropdown, detectSlashCommand } from './PresetDropdown'
import { ModelDropdown } from './ModelDropdown'
import { TmuxDropdown } from './TmuxDropdown'
import { FeedbackBar } from './FeedbackBar'
import { Spinner } from './Spinner'

const isMac =
  typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC')
const modKey = isMac ? '⌘' : 'Ctrl'

interface PanelProps {
  onOpenSettings: () => void
}

export function Panel({ onOpenSettings }: PanelProps): React.ReactElement {
  const {
    input,
    output,
    loading,
    error,
    score,
    patterns,
    activePreset,
    activeModel,
    slashCommand,
    setInput,
    setOutput,
    setActivePreset,
    setActiveModel,
    setSlashCommand,
  } = usePromptStore()

  const { customPresets } = usePresetsStore()
  const { settings } = useSettingsStore()

  const [tmuxSession, setTmuxSession] = useState('')
  const [annotationEnabled, setAnnotationEnabled] = useState(false)
  // Stores the preset active before a slash command override
  const prevPresetRef = useRef<string>(activePreset)

  const { matches: secretMatches, acknowledged: secretAcknowledged, acknowledge } = useSecretDetection(input)
  const secretBlocked = secretMatches.length > 0 && !secretAcknowledged

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const outputRef = useRef<HTMLTextAreaElement>(null)

  const { handleImprove, handleSend, handleImproveAndSend, handleCopy } = usePanelActions({
    activePreset,
    activeModel,
    slashCommand,
    tmuxSession,
  })

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Detect slash commands in input and override preset accordingly
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newInput = e.target.value
      setInput(newInput)

      const detected = detectSlashCommand(newInput)
      if (detected) {
        if (!slashCommand) prevPresetRef.current = activePreset
        setSlashCommand(detected)
        setActivePreset(detected)
      } else if (slashCommand) {
        setSlashCommand(null)
        setActivePreset(prevPresetRef.current)
      }
    },
    [slashCommand, activePreset, setInput, setSlashCommand, setActivePreset],
  )

  const handlePresetChange = useCallback(
    (presetId: string) => {
      if (!slashCommand) {
        prevPresetRef.current = presetId
        setActivePreset(presetId)
      }
    },
    [slashCommand, setActivePreset],
  )

  // Keyboard shortcuts — Cmd+Enter, Cmd+Shift+Enter, Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey
      if (e.key === 'Escape') {
        void window.electronAPI.hideWindow()
        return
      }
      if (isMeta && e.shiftKey && e.key === 'Enter') {
        e.preventDefault()
        if (!loading && !secretBlocked) handleImproveAndSend()
        return
      }
      if (isMeta && e.key === 'Enter') {
        e.preventDefault()
        if (!loading && !secretBlocked) handleImprove()
        return
      }
    },
    [loading, secretBlocked, handleImprove, handleImproveAndSend],
  )

  // Derive feedback bar data (priority: secret warning > score > anti-pattern)
  const qualityScore = !secretBlocked && score ? score.overall : null
  const antiPatternTip =
    !secretBlocked && !qualityScore && patterns.length > 0 ? patterns[0].description : null

  const handleRemoveSecret = useCallback(() => {
    if (secretMatches.length === 0) return
    const first = secretMatches[0]
    setInput(input.slice(0, first.index) + input.slice(first.index + first.length))
  }, [secretMatches, input, setInput])

  return (
    <div
      className="flex flex-col h-screen bg-gray-900 text-gray-100 select-none"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Top toolbar: preset + model + gear */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-gray-700/60 flex-shrink-0">
        <span className="text-xs text-gray-500 flex-shrink-0">Preset</span>
        <PresetDropdown
          value={slashCommand ?? activePreset}
          onChange={handlePresetChange}
          customPresets={customPresets}
          disabled={loading || !!slashCommand}
        />
        <span className="text-xs text-gray-500 flex-shrink-0">Model</span>
        <ModelDropdown
          value={activeModel || (settings?.defaultModel ?? '')}
          onChange={setActiveModel}
          disabled={loading}
        />
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
          className="
            flex-shrink-0 text-gray-500 hover:text-gray-300 text-base leading-none
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded
            transition-colors
          "
          style={{ touchAction: 'manipulation' }}
        >
          ⚙
        </button>
      </div>

      {/* Input area */}
      <div className="flex flex-col flex-1 min-h-0 px-3 pt-2 pb-1 gap-1">
        <label htmlFor="prompt-input" className="text-xs text-gray-500 flex-shrink-0">
          Input
        </label>
        <textarea
          id="prompt-input"
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          placeholder={`Your prompt… (${modKey}+Enter to improve)`}
          disabled={loading}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="
            flex-1 min-h-0 w-full bg-gray-800 border border-gray-600 text-gray-100
            rounded-md px-3 py-2 resize-none
            placeholder:text-gray-600
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            disabled:opacity-60
          "
          style={{ fontSize: '16px', touchAction: 'manipulation', fontVariantNumeric: 'tabular-nums' }}
        />
        <div className="flex items-start justify-between min-h-[18px] flex-shrink-0">
          <FeedbackBar
            secretMatches={secretMatches}
            secretAcknowledged={secretAcknowledged}
            onAcknowledge={acknowledge}
            onRemoveSecret={handleRemoveSecret}
            qualityScore={qualityScore}
            antiPatternTip={antiPatternTip}
          />
          {error && !secretBlocked && (
            <p className="text-xs text-red-400 truncate ml-2" title={error}>
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 px-3 py-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleImprove}
          disabled={loading || !input.trim() || secretBlocked}
          aria-label={`Improve prompt (${modKey}+Enter)`}
          className="
            flex items-center justify-center gap-1 flex-1
            bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium
            rounded-md px-3 py-2 min-h-[36px]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors
          "
          style={{ touchAction: 'manipulation' }}
        >
          {loading && <Spinner />}
          <span>Improve</span>
          <span className="text-xs opacity-60 ml-1 hidden sm:inline">{modKey}+↵</span>
        </button>
        <button
          type="button"
          onClick={handleImproveAndSend}
          disabled={loading || !input.trim() || secretBlocked}
          aria-label={`Improve and send (${modKey}+Shift+Enter)`}
          className="
            flex items-center justify-center gap-1 flex-1
            bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium
            rounded-md px-3 py-2 min-h-[36px]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors
          "
          style={{ touchAction: 'manipulation' }}
        >
          {loading && <Spinner />}
          <span>Improve &amp; Send</span>
          <span className="text-xs opacity-60 ml-1 hidden sm:inline">{modKey}+⇧+↵</span>
        </button>
      </div>

      {/* Output area */}
      <div className="flex flex-col flex-1 min-h-0 px-3 pt-1 pb-2 gap-1">
        <label htmlFor="prompt-output" className="text-xs text-gray-500 flex-shrink-0">
          Output (editable)
        </label>
        <textarea
          id="prompt-output"
          ref={outputRef}
          value={output}
          onChange={(e) => setOutput(e.target.value)}
          placeholder="Improved prompt will appear here…"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="
            flex-1 min-h-0 w-full bg-gray-800 border border-gray-600 text-gray-100
            rounded-md px-3 py-2 resize-none
            placeholder:text-gray-600
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          "
          style={{ fontSize: '16px', touchAction: 'manipulation', fontVariantNumeric: 'tabular-nums' }}
        />
      </div>

      {/* Bottom bar: tmux + annotation + copy/send */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-700/60 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <TmuxDropdown value={tmuxSession} onChange={setTmuxSession} disabled={loading} />
        </div>
        <label className="flex items-center gap-1 cursor-pointer flex-shrink-0 min-h-[24px]">
          <input
            type="checkbox"
            checked={annotationEnabled}
            onChange={(e) => setAnnotationEnabled(e.target.checked)}
            className="
              h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600
              focus:ring-2 focus:ring-blue-500 cursor-pointer
            "
            style={{ touchAction: 'manipulation' }}
          />
          <span className="text-xs text-gray-400">Annotate</span>
        </label>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!output && !input}
          aria-label="Copy to clipboard"
          className="
            flex-shrink-0 bg-gray-700 hover:bg-gray-600 border border-gray-600
            text-gray-300 text-xs font-medium rounded-md px-3 py-1.5 min-h-[30px] min-w-[48px]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors
          "
          style={{ touchAction: 'manipulation' }}
        >
          Copy
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || (!output && !input) || secretBlocked}
          aria-label="Send to terminal"
          className="
            flex-shrink-0 bg-green-700 hover:bg-green-600 border border-green-600
            text-white text-xs font-medium rounded-md px-3 py-1.5 min-h-[30px] min-w-[48px]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors
          "
          style={{ touchAction: 'manipulation' }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
