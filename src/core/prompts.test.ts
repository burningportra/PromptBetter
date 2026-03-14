import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, PATTERNS } from './prompts'

describe('buildSystemPrompt', () => {
  describe('auto mode', () => {
    it('includes all 7 pattern IDs', () => {
      const prompt = buildSystemPrompt('auto')
      for (const pattern of PATTERNS) {
        expect(prompt).toContain(pattern.id)
      }
    })

    it('includes all 7 pattern names', () => {
      const prompt = buildSystemPrompt('auto')
      for (const pattern of PATTERNS) {
        expect(prompt).toContain(pattern.name)
      }
    })

    it('instructs to classify intent', () => {
      const prompt = buildSystemPrompt('auto')
      expect(prompt).toContain('Classify')
    })

    it('instructs to select 2-4 patterns', () => {
      const prompt = buildSystemPrompt('auto')
      expect(prompt).toContain('2-4')
    })

    it('does not include annotation instructions without annotationMode', () => {
      const prompt = buildSystemPrompt('auto')
      expect(prompt).not.toContain('confidence')
    })

    it('includes annotation instructions when annotationMode=true', () => {
      const prompt = buildSystemPrompt('auto', { annotationMode: true })
      expect(prompt).toContain('confidence')
      expect(prompt).toContain('Intent:')
      expect(prompt).toContain('Patterns:')
    })

    it('token count sanity check (< 3600 chars)', () => {
      const prompt = buildSystemPrompt('auto', { annotationMode: true })
      expect(prompt.length).toBeLessThan(3600)
    })
  })

  describe('preset mode', () => {
    it('uses fixed intent in output', () => {
      const prompt = buildSystemPrompt('preset', {
        intent: 'debugging',
        patternIds: ['context-anchoring', 'first-principles'],
      })
      expect(prompt).toContain('debugging')
    })

    it('includes only specified patterns', () => {
      const prompt = buildSystemPrompt('preset', {
        intent: 'code-review',
        patternIds: ['fresh-eyes', 'self-verification'],
      })
      expect(prompt).toContain('fresh-eyes')
      expect(prompt).toContain('self-verification')
      expect(prompt).not.toContain('first-principles')
    })

    it('does not include annotation instructions without annotationMode', () => {
      const prompt = buildSystemPrompt('preset', {
        intent: 'planning',
        patternIds: ['scope-control'],
      })
      expect(prompt).not.toContain('confidence')
    })

    it('includes annotation instructions when annotationMode=true', () => {
      const prompt = buildSystemPrompt('preset', {
        intent: 'planning',
        patternIds: ['scope-control'],
        annotationMode: true,
      })
      expect(prompt).toContain('confidence')
      expect(prompt).toContain('---')
    })

    it('falls back gracefully when no patternIds given', () => {
      const prompt = buildSystemPrompt('preset', { intent: 'research' })
      expect(prompt).toContain('research')
      expect(typeof prompt).toBe('string')
    })

    it('falls back gracefully when no options given', () => {
      const prompt = buildSystemPrompt('preset')
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(0)
    })
  })

  describe('output rules', () => {
    it('includes no-preamble rule in auto mode', () => {
      const prompt = buildSystemPrompt('auto')
      expect(prompt).toContain('No preamble')
    })

    it('includes no-preamble rule in preset mode', () => {
      const prompt = buildSystemPrompt('preset', {
        intent: 'debugging',
        patternIds: ['context-anchoring'],
      })
      expect(prompt).toContain('No preamble')
    })
  })
})
