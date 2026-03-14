import React from 'react'

interface FeedbackBarProps {
  secretWarning: string | null
  qualityScore: number | null
  antiPatternTip: string | null
}

/** Single-line below-input feedback area. Renders highest-priority item only. */
export function FeedbackBar({
  secretWarning,
  qualityScore,
  antiPatternTip,
}: FeedbackBarProps): React.ReactElement | null {
  if (secretWarning) {
    return (
      <p
        role="alert"
        className="text-xs text-red-400 truncate font-variant-numeric tabular-nums"
        title={secretWarning}
      >
        ⚠️ {secretWarning}
      </p>
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
