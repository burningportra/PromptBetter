// Shared types — imported by all layers. Zero runtime logic.

export type PromptIntent =
  | 'code_generation'
  | 'code_review'
  | 'debugging'
  | 'documentation'
  | 'explanation'
  | 'refactoring'
  | 'testing'
  | 'general'

export interface ImproveRequest {
  prompt: string
  model: string
  preset: string
  terminalContext?: string
  gitDiff?: string
  sessionId?: string
}

export interface ImproveResponse {
  improved: string
  patterns: PatternMatch[]
  score: QualityScore
  durationMs: number
}

export interface PatternMatch {
  patternId: string
  label: string
  description: string
  lineRange?: [number, number]
}

export interface QualityScore {
  overall: number
  specificity: number
  actionability: number
  contextRichness: number
  antiPatternPenalty: number
}

export interface HistoryEntry {
  id: string
  timestamp: number
  original: string
  improved: string
  score: QualityScore
  model: string
  preset: string
  durationMs: number
}

export interface AppSettings {
  apiKey: string
  defaultModel: string
  defaultPreset: string
  theme: 'dark' | 'light' | 'system'
  hotkey: string
  maxHistoryEntries: number
}

export interface IpcChannels {
  IMPROVE_PROMPT: 'improve-prompt'
  DISPATCH_PROMPT: 'dispatch-prompt'
  GET_SETTINGS: 'get-settings'
  SET_SETTINGS: 'set-settings'
  GET_HISTORY: 'get-history'
  CLEAR_HISTORY: 'clear-history'
  LIST_TMUX_SESSIONS: 'list-tmux-sessions'
  GET_GIT_DIFF: 'get-git-diff'
}

export const IPC: IpcChannels = {
  IMPROVE_PROMPT: 'improve-prompt',
  DISPATCH_PROMPT: 'dispatch-prompt',
  GET_SETTINGS: 'get-settings',
  SET_SETTINGS: 'set-settings',
  GET_HISTORY: 'get-history',
  CLEAR_HISTORY: 'clear-history',
  LIST_TMUX_SESSIONS: 'list-tmux-sessions',
  GET_GIT_DIFF: 'get-git-diff',
}

export type ErrorCode =
  | 'RATE_LIMIT'
  | 'AUTH_FAILED'
  | 'NETWORK_ERROR'
  | 'TMUX_DISPATCH_FAILED'
  | 'IMPROVEMENT_FAILED'
  | 'SECRET_DETECTED'

export interface AppError {
  code: ErrorCode
  message: string
  recoveryAction?: string
}
