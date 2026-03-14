import { useState, useEffect, useCallback, useRef } from 'react'
import { detectSecrets } from '../../core/secrets'
import type { SecretMatch } from '../../core/secrets'

export type { SecretMatch }

/** Returns "sk-a****" style masked display (first 4 chars + ****). */
export function maskSecret(raw: string): string {
  const prefix = raw.slice(0, 4)
  return `${prefix}****`
}

export interface UseSecretDetectionResult {
  matches: SecretMatch[]
  /** True after user clicks "I've reviewed — send anyway" for the current input value. */
  acknowledged: boolean
  /** Call when user clicks "I've reviewed — send anyway". */
  acknowledge: () => void
}

/**
 * Debounced secret detection hook.
 * Scans inputText for secrets with a 200ms debounce.
 * Acknowledgment is reset whenever inputText changes.
 */
export function useSecretDetection(inputText: string): UseSecretDetectionResult {
  const [matches, setMatches] = useState<SecretMatch[]>([])
  const [acknowledged, setAcknowledged] = useState(false)
  const prevInputRef = useRef<string>(inputText)

  // Reset acknowledgment whenever input changes
  useEffect(() => {
    if (inputText !== prevInputRef.current) {
      setAcknowledged(false)
      prevInputRef.current = inputText
    }
  }, [inputText])

  // Debounced detection — 200ms after last keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setMatches(detectSecrets(inputText))
      } catch {
        // Input exceeds MAX_INPUT_LENGTH or other error; clear matches
        setMatches([])
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [inputText])

  const acknowledge = useCallback(() => setAcknowledged(true), [])

  return { matches, acknowledged, acknowledge }
}
