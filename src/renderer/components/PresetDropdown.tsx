import React, { useCallback, useEffect, useRef, useState } from 'react'
import { BUILT_IN_PRESETS } from '../../shared/patterns'
import type { Preset } from '../../shared/types'

interface PresetDropdownProps {
  value: string
  onChange: (presetId: string) => void
  customPresets: Preset[]
  disabled?: boolean
}

export function PresetDropdown({
  value,
  onChange,
  customPresets,
  disabled,
}: PresetDropdownProps): React.ReactElement {
  const allPresets = [
    ...BUILT_IN_PRESETS,
    ...customPresets.map((p) => ({ ...p, intent: 'auto' as const, patternIds: [] })),
  ]

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label="Preset"
      className="
        flex-1 min-w-0 bg-gray-700 border border-gray-600 text-gray-100 text-sm rounded-md
        px-2 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
        font-variant-numeric tabular-nums
      "
      style={{ touchAction: 'manipulation' }}
    >
      {allPresets.map((preset) => (
        <option key={preset.id} value={preset.id}>
          {preset.name}
        </option>
      ))}
    </select>
  )
}

// ---------------------------------------------------------------------------
// Slash-command hook — detects /presetId prefix in input and returns override
// ---------------------------------------------------------------------------

const PRESET_IDS = new Set(BUILT_IN_PRESETS.map((p) => p.id))

/**
 * Given an input string, return the slash-command preset ID if present
 * (e.g. "/debugging" → "debugging"), or null otherwise.
 */
export function detectSlashCommand(input: string): string | null {
  if (!input.startsWith('/')) return null
  const token = input.slice(1).split(/\s/)[0]
  return PRESET_IDS.has(token) ? token : null
}
