import { describe, it, expect } from 'vitest'
import { detectSlashCommand } from './PresetDropdown'

describe('detectSlashCommand', () => {
  it('returns null for empty string', () => {
    expect(detectSlashCommand('')).toBeNull()
  })

  it('returns null when no slash prefix', () => {
    expect(detectSlashCommand('debugging')).toBeNull()
    expect(detectSlashCommand('fix this bug')).toBeNull()
  })

  it('detects valid built-in preset IDs', () => {
    expect(detectSlashCommand('/debugging')).toBe('debugging')
    expect(detectSlashCommand('/code-review')).toBe('code-review')
    expect(detectSlashCommand('/planning')).toBe('planning')
    expect(detectSlashCommand('/implementation')).toBe('implementation')
    expect(detectSlashCommand('/exploration')).toBe('exploration')
    expect(detectSlashCommand('/refactoring')).toBe('refactoring')
    expect(detectSlashCommand('/documentation')).toBe('documentation')
    expect(detectSlashCommand('/research')).toBe('research')
    expect(detectSlashCommand('/auto')).toBe('auto')
  })

  it('detects slash command followed by a space and more text', () => {
    expect(detectSlashCommand('/debugging fix the null pointer')).toBe('debugging')
    expect(detectSlashCommand('/planning my next feature')).toBe('planning')
  })

  it('returns null for unknown slash commands', () => {
    expect(detectSlashCommand('/unknown')).toBeNull()
    expect(detectSlashCommand('/foo')).toBeNull()
    expect(detectSlashCommand('/DEBUGGING')).toBeNull() // case-sensitive
  })

  it('returns null for slash-only input', () => {
    expect(detectSlashCommand('/')).toBeNull()
  })

  it('returns null for slash with whitespace token', () => {
    expect(detectSlashCommand('/ debugging')).toBeNull() // space before keyword
  })
})
