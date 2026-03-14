import React from 'react'
import { DEFAULT_MODEL } from '../../shared/constants'

// Common OpenRouter models surfaced in the UI.
// The list is intentionally small; users type custom model IDs via settings.
const BUILT_IN_MODELS = [
  { id: 'anthropic/claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3-opus', label: 'Claude 3 Opus' },
  { id: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5' },
  { id: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5' },
  { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
]

interface ModelDropdownProps {
  value: string
  onChange: (modelId: string) => void
  disabled?: boolean
}

export function ModelDropdown({
  value,
  onChange,
  disabled,
}: ModelDropdownProps): React.ReactElement {
  // If the current value is not in the built-in list, show it as a custom entry
  const knownIds = new Set(BUILT_IN_MODELS.map((m) => m.id))
  const models =
    value && !knownIds.has(value)
      ? [...BUILT_IN_MODELS, { id: value, label: value }]
      : BUILT_IN_MODELS

  return (
    <select
      value={value || DEFAULT_MODEL}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label="Model"
      className="
        flex-1 min-w-0 bg-gray-700 border border-gray-600 text-gray-100 text-sm rounded-md
        px-2 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
        font-variant-numeric tabular-nums
      "
      style={{ touchAction: 'manipulation' }}
    >
      {models.map((model) => (
        <option key={model.id} value={model.id}>
          {model.label}
        </option>
      ))}
    </select>
  )
}
