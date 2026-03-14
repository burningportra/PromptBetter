// Secret detection engine — scans text for sensitive patterns.

import { AppError } from '../shared/types'

export const MAX_INPUT_LENGTH = 10_000

export interface SecretMatch {
  name: string
  match: string
  index: number
  length: number
}

interface SecretPattern {
  name: string
  regex: RegExp
}

const SECRET_PATTERNS: SecretPattern[] = [
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub Token', regex: /gh[ps]_[a-zA-Z0-9]{36}/ },
  { name: 'OpenAI Key', regex: /sk-(?!or-)[a-zA-Z0-9]{20,}/ },
  { name: 'Stripe Key', regex: /sk_(live|test)_[a-zA-Z0-9]{24,}/ },
  { name: 'Private Key (PEM)', regex: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/ },
  { name: 'Connection String', regex: /(mongodb|postgres|mysql):\/\/[^:]+:[^@]+@/ },
  { name: 'Slack Token', regex: /xox[bpras]-[a-zA-Z0-9-]+/ },
]

export function detectSecrets(text: string): SecretMatch[] {
  if (text.length > MAX_INPUT_LENGTH) {
    const error: AppError = {
      code: 'IMPROVEMENT_FAILED',
      message: `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters`,
    }
    throw error
  }

  if (text.length === 0) {
    return []
  }

  const matches: SecretMatch[] = []

  for (const pattern of SECRET_PATTERNS) {
    // Use a global copy to find all occurrences
    const globalRegex = new RegExp(pattern.regex.source, 'g')
    let result = globalRegex.exec(text)
    while (result !== null) {
      matches.push({
        name: pattern.name,
        match: result[0],
        index: result.index,
        length: result[0].length,
      })
      result = globalRegex.exec(text)
    }
  }

  return matches
}
