import { describe, it, expect } from 'vitest'
import { parseImprovementResponse } from './parser'

describe('parseImprovementResponse', () => {
  it('parses clean response without annotation', () => {
    const raw = 'Review the authentication module for security vulnerabilities.'
    const result = parseImprovementResponse(raw)
    expect(result.improvedPrompt).toBe(
      'Review the authentication module for security vulnerabilities.',
    )
    expect(result.intent).toBeUndefined()
    expect(result.confidence).toBeUndefined()
    expect(result.patterns).toBeUndefined()
  })

  it('parses response with annotation block', () => {
    const raw = `Please review the authentication module for security vulnerabilities, focusing on input validation and session management.
---
Intent: code-review (confidence: 0.92)
Patterns: fresh-eyes, self-verification, scope-control`

    const result = parseImprovementResponse(raw)
    expect(result.improvedPrompt).toBe(
      'Please review the authentication module for security vulnerabilities, focusing on input validation and session management.',
    )
    expect(result.intent).toBe('code-review')
    expect(result.confidence).toBe(0.92)
    expect(result.patterns).toEqual(['fresh-eyes', 'self-verification', 'scope-control'])
  })

  it('uses lastIndexOf to handle extra --- inside prompt', () => {
    const raw = `Step 1: gather context
---
Step 2: analyze
---
Intent: debugging (confidence: 0.85)
Patterns: context-anchoring, first-principles`

    const result = parseImprovementResponse(raw)
    expect(result.improvedPrompt).toContain('Step 1: gather context')
    expect(result.improvedPrompt).toContain('Step 2: analyze')
    expect(result.intent).toBe('debugging')
    expect(result.confidence).toBe(0.85)
  })

  it('strips markdown code block wrapping', () => {
    const raw = '```\nImprove the search algorithm to handle edge cases.\n```'
    const result = parseImprovementResponse(raw)
    expect(result.improvedPrompt).toBe('Improve the search algorithm to handle edge cases.')
  })

  it('strips markdown code block with language tag', () => {
    const raw = '```markdown\nImprove the search algorithm to handle edge cases.\n```'
    const result = parseImprovementResponse(raw)
    expect(result.improvedPrompt).toBe('Improve the search algorithm to handle edge cases.')
  })

  it('handles missing confidence in annotation', () => {
    const raw = `Refactor the payment service.
---
Intent: refactoring
Patterns: scope-control, self-verification`

    const result = parseImprovementResponse(raw)
    expect(result.intent).toBe('refactoring')
    expect(result.confidence).toBeUndefined()
    expect(result.patterns).toEqual(['scope-control', 'self-verification'])
  })

  it('returns empty improvedPrompt for empty string', () => {
    const result = parseImprovementResponse('')
    expect(result.improvedPrompt).toBe('')
    expect(result.intent).toBeUndefined()
  })

  it('returns empty improvedPrompt for whitespace-only string', () => {
    const result = parseImprovementResponse('   \n  \t  ')
    expect(result.improvedPrompt).toBe('')
  })

  it('parses "Patterns applied:" variant', () => {
    const raw = `Debug the memory leak in the worker thread.
---
Intent: debugging (confidence: 0.78)
Patterns applied: context-anchoring, temporal-awareness`

    const result = parseImprovementResponse(raw)
    expect(result.patterns).toEqual(['context-anchoring', 'temporal-awareness'])
  })

  it('handles multiline improved prompt', () => {
    const raw = `Analyze the codebase for technical debt.
Focus on:
- Cyclomatic complexity
- Dead code paths
- Missing error handling`

    const result = parseImprovementResponse(raw)
    expect(result.improvedPrompt).toContain('Cyclomatic complexity')
    expect(result.intent).toBeUndefined()
  })
})
