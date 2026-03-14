import { describe, it, expect } from 'vitest'
import { parseSlashCommand, SLASH_COMMAND_TO_PRESET } from './slashCommands'

describe('parseSlashCommand', () => {
  it('parses /review command', () => {
    const result = parseSlashCommand('/review check this code for issues')
    expect(result.command).toBe('review')
    expect(result.remainder).toBe('check this code for issues')
  })

  it('parses /debug command', () => {
    const result = parseSlashCommand('/debug why is this crashing')
    expect(result.command).toBe('debug')
    expect(result.remainder).toBe('why is this crashing')
  })

  it('parses /plan command', () => {
    const result = parseSlashCommand('/plan a migration strategy')
    expect(result.command).toBe('plan')
    expect(result.remainder).toBe('a migration strategy')
  })

  it('parses /implement command', () => {
    const result = parseSlashCommand('/implement a caching layer')
    expect(result.command).toBe('implement')
    expect(result.remainder).toBe('a caching layer')
  })

  it('parses /explore command', () => {
    const result = parseSlashCommand('/explore the codebase structure')
    expect(result.command).toBe('explore')
    expect(result.remainder).toBe('the codebase structure')
  })

  it('parses /refactor command', () => {
    const result = parseSlashCommand('/refactor this function for clarity')
    expect(result.command).toBe('refactor')
    expect(result.remainder).toBe('this function for clarity')
  })

  it('parses /docs command', () => {
    const result = parseSlashCommand('/docs write API documentation')
    expect(result.command).toBe('docs')
    expect(result.remainder).toBe('write API documentation')
  })

  it('parses /research command', () => {
    const result = parseSlashCommand('/research best practices for rate limiting')
    expect(result.command).toBe('research')
    expect(result.remainder).toBe('best practices for rate limiting')
  })

  it('returns null command when no space after slash command', () => {
    const result = parseSlashCommand('/reviewcode')
    expect(result.command).toBeNull()
    expect(result.remainder).toBe('/reviewcode')
  })

  it('returns null command for unknown slash command', () => {
    const result = parseSlashCommand('/unknown do something')
    expect(result.command).toBeNull()
    expect(result.remainder).toBe('/unknown do something')
  })

  it('returns null command for empty input', () => {
    const result = parseSlashCommand('')
    expect(result.command).toBeNull()
    expect(result.remainder).toBe('')
  })

  it('returns null command for input without slash', () => {
    const result = parseSlashCommand('review this code')
    expect(result.command).toBeNull()
    expect(result.remainder).toBe('review this code')
  })

  it('matches case-insensitively', () => {
    const result = parseSlashCommand('/REVIEW check this')
    expect(result.command).toBe('review')
    expect(result.remainder).toBe('check this')
  })

  it('matches mixed-case command', () => {
    const result = parseSlashCommand('/Debug why is this failing')
    expect(result.command).toBe('debug')
    expect(result.remainder).toBe('why is this failing')
  })

  it('strips only the command prefix from remainder', () => {
    const result = parseSlashCommand('/plan migrate the database with rollback support')
    expect(result.remainder).toBe('migrate the database with rollback support')
  })
})

describe('SLASH_COMMAND_TO_PRESET', () => {
  it('maps all 8 commands to preset names', () => {
    expect(SLASH_COMMAND_TO_PRESET.review).toBe('code-review')
    expect(SLASH_COMMAND_TO_PRESET.debug).toBe('debugging')
    expect(SLASH_COMMAND_TO_PRESET.plan).toBe('planning')
    expect(SLASH_COMMAND_TO_PRESET.implement).toBe('implementation')
    expect(SLASH_COMMAND_TO_PRESET.explore).toBe('exploration')
    expect(SLASH_COMMAND_TO_PRESET.refactor).toBe('refactoring')
    expect(SLASH_COMMAND_TO_PRESET.docs).toBe('documentation')
    expect(SLASH_COMMAND_TO_PRESET.research).toBe('research')
  })
})
