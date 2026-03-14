// Parse raw LLM response to extract improved prompt and optional annotation metadata.

export interface ParsedResponse {
  improvedPrompt: string
  intent?: string
  confidence?: number
  patterns?: string[]
}

function stripMarkdownCodeBlock(raw: string): string {
  const trimmed = raw.trim()
  // Strip wrapping triple backtick block (with optional language tag)
  const codeBlockMatch = /^```[a-z]*\n?([\s\S]*?)```$/i.exec(trimmed)
  if (codeBlockMatch !== null && codeBlockMatch[1] !== undefined) {
    return codeBlockMatch[1].trim()
  }
  return raw
}

function parseAnnotationBlock(block: string): {
  intent?: string
  confidence?: number
  patterns?: string[]
} {
  const result: { intent?: string; confidence?: number; patterns?: string[] } = {}

  // Match "Intent: <value> (confidence: <number>)" — confidence is optional
  const intentMatch = /Intent:\s*([^\s(]+)(?:\s*\(confidence:\s*([\d.]+)\))?/i.exec(block)
  if (intentMatch !== null) {
    result.intent = intentMatch[1]
    if (intentMatch[2] !== undefined) {
      result.confidence = parseFloat(intentMatch[2])
    }
  }

  // Match "Patterns:" or "Patterns applied:" followed by comma-separated list
  const patternsMatch = /Patterns(?:\s+applied)?:\s*(.+)/i.exec(block)
  if (patternsMatch !== null && patternsMatch[1] !== undefined) {
    result.patterns = patternsMatch[1]
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
  }

  return result
}

export function parseImprovementResponse(raw: string): ParsedResponse {
  if (raw.trim().length === 0) {
    return { improvedPrompt: '' }
  }

  const stripped = stripMarkdownCodeBlock(raw)

  const separatorIndex = stripped.lastIndexOf('---')

  if (separatorIndex === -1) {
    return { improvedPrompt: stripped.trim() }
  }

  const promptPart = stripped.slice(0, separatorIndex).trim()
  const annotationPart = stripped.slice(separatorIndex + 3).trim()

  const annotation = parseAnnotationBlock(annotationPart)

  const parsed: ParsedResponse = { improvedPrompt: promptPart }

  if (annotation.intent !== undefined) {
    parsed.intent = annotation.intent
  }
  if (annotation.confidence !== undefined) {
    parsed.confidence = annotation.confidence
  }
  if (annotation.patterns !== undefined) {
    parsed.patterns = annotation.patterns
  }

  return parsed
}
