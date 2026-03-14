import React from 'react'
import { maskSecret } from '../hooks/useSecretDetection'
import type { SecretMatch } from '../hooks/useSecretDetection'

interface FeedbackBarProps {
  secretMatches: SecretMatch[]
  secretAcknowledged: boolean
  onAcknowledge: () => void
  onRemoveSecret: () => void
  qualityScore: number | null
  antiPatternTip: string | null
}

/** Single-line (or compact multi-line) below-input feedback area. Renders highest-priority item only. */
export function FeedbackBar({
  secretMatches,
  secretAcknowledged,
  onAcknowledge,
  onRemoveSecret,
  qualityScore,
  antiPatternTip,
}: FeedbackBarProps): React.ReactElement | null {
  if (secretMatches.length > 0 && !secretAcknowledged) {
    const first = secretMatches[0]
    const masked = maskSecret(first.match)
    return (
      <div role="alert" className="flex flex-col gap-1 w-full">
        <p className="text-xs text-red-400 font-medium">
          ⚠ Your prompt contains what looks like {first.name} ({masked})
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRemoveSecret}
            className="
              text-xs text-red-300 border border-red-600 rounded px-2 py-0.5
              hover:bg-red-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500
              transition-colors
            "
          >
            Remove
          </button>
          <button
            type="button"
            onClick={onAcknowledge}
            className="
              text-xs text-gray-300 border border-gray-600 rounded px-2 py-0.5
              hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500
              transition-colors
            "
          >
            I&apos;ve reviewed — send anyway
          </button>
        </div>
      </div>
    )
  }

  if (qualityScore !== null) {
    return (
      <p className="text-xs text-gray-400 truncate font-variant-numeric tabular-nums">
        Quality: {qualityScore}/100
      </p>
    )
  }
  if (antiPatternTip) {
    return (
      <p className="text-xs text-yellow-400 truncate" title={antiPatternTip}>
        💡 {antiPatternTip}
      </p>
    )
  }
  return null
}
