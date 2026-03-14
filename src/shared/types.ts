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

/** Shared base for pattern metadata — used by both Pattern (definition) and PatternMatch (result). */
export interface PatternBase {
  label: string
  description: string
}

export interface PatternMatch extends PatternBase {
  patternId: string
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

export interface Preset {
  id: string
  name: string
  description: string
  systemPrompt: string
  isBuiltIn: boolean
}

export interface FeedbackAggregate {
  id: string
  thumbsUp: number
  thumbsDown: number
  lastUpdated: number
}

export interface TmuxSession {
  name: string
  attached: boolean
  created: string
  isClaudeCode: boolean
}

export interface IpcChannels {
  IMPROVE_PROMPT: 'improve-prompt'
  DISPATCH_PROMPT: 'dispatch-prompt'
  GET_SETTINGS: 'get-settings'
  SET_SETTINGS: 'set-settings'
  DELETE_API_KEY: 'delete-api-key'
  GET_HISTORY: 'get-history'
  ADD_HISTORY_ENTRY: 'add-history-entry'
  CLEAR_HISTORY: 'clear-history'
  GET_PRESETS: 'get-presets'
  SET_PRESET: 'set-preset'
  DELETE_PRESET: 'delete-preset'
  GET_FEEDBACK_AGGREGATES: 'get-feedback-aggregates'
  SET_FEEDBACK_AGGREGATE: 'set-feedback-aggregate'
  LIST_TMUX_SESSIONS: 'list-tmux-sessions'
  GET_GIT_DIFF: 'get-git-diff'
  COPY_TO_CLIPBOARD: 'copy-to-clipboard'
  HIDE_WINDOW: 'hide-window'
}

export const IPC: IpcChannels = {
  IMPROVE_PROMPT: 'improve-prompt',
  DISPATCH_PROMPT: 'dispatch-prompt',
  GET_SETTINGS: 'get-settings',
  SET_SETTINGS: 'set-settings',
  DELETE_API_KEY: 'delete-api-key',
  GET_HISTORY: 'get-history',
  ADD_HISTORY_ENTRY: 'add-history-entry',
  CLEAR_HISTORY: 'clear-history',
  GET_PRESETS: 'get-presets',
  SET_PRESET: 'set-preset',
  DELETE_PRESET: 'delete-preset',
  GET_FEEDBACK_AGGREGATES: 'get-feedback-aggregates',
  SET_FEEDBACK_AGGREGATE: 'set-feedback-aggregate',
  LIST_TMUX_SESSIONS: 'list-tmux-sessions',
  GET_GIT_DIFF: 'get-git-diff',
  COPY_TO_CLIPBOARD: 'copy-to-clipboard',
  HIDE_WINDOW: 'hide-window',
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
