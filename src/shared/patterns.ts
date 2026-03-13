// Pattern definitions — static data, zero runtime logic.

export interface Pattern {
  id: string
  label: string
  description: string
  example?: string
}

export const PATTERNS: Pattern[] = [
  {
    id: 'add-context',
    label: 'Add Context',
    description: 'Include relevant context about the codebase, framework, or environment.',
  },
  {
    id: 'specify-output',
    label: 'Specify Output Format',
    description: 'Define the expected output format, structure, or constraints.',
  },
  {
    id: 'add-constraints',
    label: 'Add Constraints',
    description: 'Specify what should NOT be done or what to avoid.',
  },
  {
    id: 'clarify-intent',
    label: 'Clarify Intent',
    description: 'Make the goal more explicit and actionable.',
  },
  {
    id: 'add-examples',
    label: 'Add Examples',
    description: 'Provide input/output examples to guide the model.',
  },
]

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
