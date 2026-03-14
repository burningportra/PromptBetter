// Build system prompts for OpenRouter LLM calls.

export type IntentType =
  | 'code-review'
  | 'debugging'
  | 'planning'
  | 'implementation'
  | 'exploration'
  | 'refactoring'
  | 'documentation'
  | 'research'

export interface PatternDefinition {
  id: string
  name: string
  description: string
}

export const PATTERNS: PatternDefinition[] = [
  {
    id: 'intensity-calibration',
    name: 'Intensity Calibration',
    description: 'Adjusts the effort/depth level (thorough, quick scan, deep dive).',
  },
  {
    id: 'scope-control',
    name: 'Scope Control',
    description: 'Defines boundaries: what to include and what to leave untouched.',
  },
  {
    id: 'self-verification',
    name: 'Self-Verification',
    description: 'Asks the model to check its own output against criteria.',
  },
  {
    id: 'fresh-eyes',
    name: 'Fresh Eyes',
    description: 'Requests a perspective shift (reviewer, end-user, skeptic).',
  },
  {
    id: 'temporal-awareness',
    name: 'Temporal Awareness',
    description: 'Adds time context (recent changes, deadline, urgency).',
  },
  {
    id: 'context-anchoring',
    name: 'Context Anchoring',
    description: 'Reference points (file names, function signatures, error messages).',
  },
  {
    id: 'first-principles',
    name: 'First-Principles',
    description: 'Decompose and reason from fundamentals.',
  },
]

export const FALLBACK_MATRIX: Record<IntentType, string[]> = {
  'code-review': ['intensity-calibration', 'fresh-eyes', 'self-verification', 'scope-control'],
  debugging: ['context-anchoring', 'first-principles', 'temporal-awareness', 'self-verification'],
  planning: ['scope-control', 'first-principles', 'temporal-awareness', 'intensity-calibration'],
  implementation: [
    'context-anchoring',
    'scope-control',
    'self-verification',
    'intensity-calibration',
  ],
  exploration: ['fresh-eyes', 'first-principles', 'temporal-awareness'],
  refactoring: ['scope-control', 'self-verification', 'context-anchoring', 'intensity-calibration'],
  documentation: ['fresh-eyes', 'scope-control', 'context-anchoring'],
  research: ['first-principles', 'fresh-eyes', 'temporal-awareness', 'intensity-calibration'],
} as const

const PATTERN_BLOCK = PATTERNS.map(
  (p) => `- ${p.id}: ${p.name} — ${p.description}`,
).join('\n')

const OUTPUT_RULES = `Rules:
- Output ONLY the improved prompt. No preamble, no explanation.
- Make only additive changes that improve clarity, specificity, and actionability.
- Preserve the user's original intent and voice.`

const ANNOTATION_INSTRUCTIONS = `---
After the improved prompt, append exactly:
Intent: <detected-intent> (confidence: <0.0-1.0>)
Patterns: <pattern-id-1>, <pattern-id-2>`

function buildAutoPrompt(annotationMode: boolean): string {
  const intentList = [
    'code-review',
    'debugging',
    'planning',
    'implementation',
    'exploration',
    'refactoring',
    'documentation',
    'research',
  ].join(', ')

  const base = `You are a prompt improvement engine. Your task is to rewrite the user's prompt to be clearer, more specific, and more actionable.

Available patterns:
${PATTERN_BLOCK}

Instructions:
1. Classify the user's prompt into one of these intents: ${intentList}
2. Select 2-4 patterns that best improve this prompt.
3. Apply the selected patterns to rewrite the prompt.

${OUTPUT_RULES}`

  return annotationMode ? `${base}\n${ANNOTATION_INSTRUCTIONS}` : base
}

function buildPresetPrompt(
  intent: string,
  patternIds: string[],
  annotationMode: boolean,
): string {
  const selectedPatterns = PATTERNS.filter((p) => patternIds.includes(p.id))
  const patternBlock = selectedPatterns
    .map((p) => `- ${p.id}: ${p.name} — ${p.description}`)
    .join('\n')

  const base = `You are a prompt improvement engine. Your task is to rewrite the user's prompt to be clearer, more specific, and more actionable.

Intent: ${intent}

Apply these patterns:
${patternBlock}

${OUTPUT_RULES}`

  return annotationMode ? `${base}\n${ANNOTATION_INSTRUCTIONS}` : base
}

export interface BuildSystemPromptOptions {
  intent?: string
  patternIds?: string[]
  annotationMode?: boolean
}

export function buildSystemPrompt(
  mode: 'auto' | 'preset',
  options: BuildSystemPromptOptions = {},
): string {
  const annotationMode = options.annotationMode ?? false

  if (mode === 'preset') {
    const intent = options.intent ?? 'general'
    const patternIds = options.patternIds ?? []
    return buildPresetPrompt(intent, patternIds, annotationMode)
  }

  return buildAutoPrompt(annotationMode)
}
