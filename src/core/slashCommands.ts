// Parse slash command prefixes in prompt input.

export type SlashCommand =
  | 'review'
  | 'debug'
  | 'plan'
  | 'implement'
  | 'explore'
  | 'refactor'
  | 'docs'
  | 'research'

export interface SlashCommandResult {
  command: SlashCommand | null
  remainder: string
}

export const SLASH_COMMAND_TO_PRESET: Record<SlashCommand, string> = {
  review: 'code-review',
  debug: 'debugging',
  plan: 'planning',
  implement: 'implementation',
  explore: 'exploration',
  refactor: 'refactoring',
  docs: 'documentation',
  research: 'research',
} as const

const SLASH_COMMAND_REGEX =
  /^\/(review|debug|plan|implement|explore|refactor|docs|research)\s+/i

const VALID_COMMANDS: readonly SlashCommand[] = [
  'review', 'debug', 'plan', 'implement', 'explore', 'refactor', 'docs', 'research',
] as const

function toSlashCommand(value: string): SlashCommand | null {
  const lower = value.toLowerCase()
  for (const cmd of VALID_COMMANDS) {
    if (cmd === lower) return cmd
  }
  return null
}

export function parseSlashCommand(input: string): SlashCommandResult {
  const match = SLASH_COMMAND_REGEX.exec(input)

  if (match === null || match[1] === undefined) {
    return { command: null, remainder: input }
  }

  const command = toSlashCommand(match[1])
  if (command === null) {
    return { command: null, remainder: input }
  }

  const remainder = input.slice(match[0].length)

  return { command, remainder }
}
