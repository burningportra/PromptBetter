// Pattern definitions — static data, zero runtime logic.

import type { PatternBase } from './types'

export interface Pattern extends PatternBase {
  id: string
  example?: string
}

/** The 7 prompt-improvement patterns used by the core engine. */
export const PATTERNS: Pattern[] = [
  {
    id: 'intensity-calibration',
    label: 'Intensity Calibration',
    description: 'Adjusts the effort/depth level (thorough, quick scan, deep dive).',
    example: 'Do a thorough review covering edge cases, not just a quick scan.',
  },
  {
    id: 'scope-control',
    label: 'Scope Control',
    description: 'Defines boundaries: what to include and what to leave untouched.',
    example: 'Focus only on the authentication module; do not touch the UI layer.',
  },
  {
    id: 'self-verification',
    label: 'Self-Verification',
    description: 'Asks the model to check its own output against criteria before responding.',
    example: 'Before answering, verify that your solution handles the null case.',
  },
  {
    id: 'fresh-eyes',
    label: 'Fresh Eyes',
    description: 'Requests a perspective shift (reviewer, end-user, skeptic).',
    example: 'Review this as if you were a senior engineer seeing it for the first time.',
  },
  {
    id: 'temporal-awareness',
    label: 'Temporal Awareness',
    description: 'Adds time context (recent changes, deadline, urgency).',
    example: 'This was working yesterday before the dependency update.',
  },
  {
    id: 'context-anchoring',
    label: 'Context Anchoring',
    description: 'Reference points (file names, function signatures, error messages).',
    example: 'In `src/auth/login.ts`, the `verifyToken()` function throws at line 42.',
  },
  {
    id: 'first-principles',
    label: 'First-Principles',
    description: 'Decompose and reason from fundamentals.',
    example: 'Ignore existing patterns; explain from scratch why this architecture makes sense.',
  },
]

/** Anti-patterns detected in user prompts (coaching engine). */
export const ANTI_PATTERNS: Pattern[] = [
  {
    id: 'vague-request',
    label: 'Vague Request',
    description: 'The prompt is too vague. Add specific details about what you want.',
  },
  {
    id: 'no-context',
    label: 'Missing Context',
    description: 'No information about the language, framework, or codebase.',
  },
  {
    id: 'ambiguous-scope',
    label: 'Ambiguous Scope',
    description: 'Unclear how much or how little should be changed.',
  },
]

/** Intent types supported by the core engine. */
export type IntentType =
  | 'code-review'
  | 'debugging'
  | 'planning'
  | 'implementation'
  | 'exploration'
  | 'refactoring'
  | 'documentation'
  | 'research'

/** Maps each intent to the 3-4 most effective pattern IDs. */
export const FALLBACK_MATRIX: Record<IntentType, string[]> = {
  'code-review':    ['intensity-calibration', 'fresh-eyes', 'self-verification', 'scope-control'],
  'debugging':      ['context-anchoring', 'first-principles', 'temporal-awareness', 'self-verification'],
  'planning':       ['scope-control', 'first-principles', 'temporal-awareness', 'intensity-calibration'],
  'implementation': ['context-anchoring', 'scope-control', 'self-verification', 'intensity-calibration'],
  'exploration':    ['fresh-eyes', 'first-principles', 'temporal-awareness'],
  'refactoring':    ['scope-control', 'self-verification', 'context-anchoring', 'intensity-calibration'],
  'documentation':  ['fresh-eyes', 'scope-control', 'context-anchoring'],
  'research':       ['first-principles', 'fresh-eyes', 'temporal-awareness', 'intensity-calibration'],
}

/** Built-in presets: auto-detect + one per intent type (9 total). */
export interface BuiltInPreset {
  id: string
  name: string
  description: string
  intent: IntentType | 'auto'
  patternIds: string[]
}

export const BUILT_IN_PRESETS: BuiltInPreset[] = [
  {
    id: 'auto',
    name: 'Auto-Detect',
    description: 'Automatically classify intent and select the best patterns.',
    intent: 'auto',
    patternIds: [],
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Thorough code review with fresh-eyes perspective.',
    intent: 'code-review',
    patternIds: FALLBACK_MATRIX['code-review'],
  },
  {
    id: 'debugging',
    name: 'Debugging',
    description: 'Root cause analysis with context anchoring.',
    intent: 'debugging',
    patternIds: FALLBACK_MATRIX['debugging'],
  },
  {
    id: 'planning',
    name: 'Planning',
    description: 'Scope-controlled planning with first-principles reasoning.',
    intent: 'planning',
    patternIds: FALLBACK_MATRIX['planning'],
  },
  {
    id: 'implementation',
    name: 'Implementation',
    description: 'Context-anchored implementation with self-verification.',
    intent: 'implementation',
    patternIds: FALLBACK_MATRIX['implementation'],
  },
  {
    id: 'exploration',
    name: 'Exploration',
    description: 'Fresh-eyes exploration from first principles.',
    intent: 'exploration',
    patternIds: FALLBACK_MATRIX['exploration'],
  },
  {
    id: 'refactoring',
    name: 'Refactoring',
    description: 'Scope-controlled refactoring with self-verification.',
    intent: 'refactoring',
    patternIds: FALLBACK_MATRIX['refactoring'],
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Clear documentation with fresh-eyes perspective.',
    intent: 'documentation',
    patternIds: FALLBACK_MATRIX['documentation'],
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Deep research from first principles.',
    intent: 'research',
    patternIds: FALLBACK_MATRIX['research'],
  },
]
