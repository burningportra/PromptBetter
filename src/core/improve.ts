// Improvement pipeline orchestrator — wires the full improve flow.
// Importable by both the Electron IPC handler and the CLI.

import { parseSlashCommand, SLASH_COMMAND_TO_PRESET } from './slashCommands'
import { detectSecrets } from './secrets'
import { buildSystemPrompt, FALLBACK_MATRIX } from './prompts'
import type { IntentType } from './prompts'
import {
  buildUserMessage,
  callOpenRouter,
  canMakeRequest,
} from './openrouter'
import type { RateLimitState } from './openrouter'
import { parseImprovementResponse } from './parser'
import { DEFAULT_MODEL } from '../shared/constants'
import type { AppError } from '../shared/types'

export interface ImproveOptions {
  preset?: string
  annotations?: boolean
  terminalContext?: string
  gitDiff?: string
  model?: string
}

export interface ImproveResult {
  improvedPrompt: string
  intent?: string
  confidence?: number
  patterns?: string[]
  model: string
  tokensUsed: { prompt: number; completion: number }
}

// Module-level rate limit state — shared across all callers in the same process.
// Exported so tests can reset it between runs.
export const _rateLimitState: RateLimitState = {
  lastRequestTime: 0,
  requestCount: 0,
  windowStart: 0,
}

const WINDOW_MS = 60_000

function isKnownIntentType(value: string): value is IntentType {
  return Object.prototype.hasOwnProperty.call(FALLBACK_MATRIX, value)
}

export async function improvePrompt(
  rawInput: string,
  apiKey: string,
  options: ImproveOptions = {},
): Promise<ImproveResult> {
  // Step 1: Parse slash command → determine preset
  const { command, remainder } = parseSlashCommand(rawInput)
  const resolvedPreset =
    command !== null ? SLASH_COMMAND_TO_PRESET[command] : (options.preset ?? null)
  const promptText = command !== null ? remainder : rawInput

  // Step 2: Secret detection — block before API call
  const secrets = detectSecrets(promptText)
  if (secrets.length > 0) {
    const error: AppError = {
      code: 'SECRET_DETECTED',
      message: `Secret detected: ${secrets[0].name}`,
      recoveryAction: 'Remove the secret from your prompt before submitting.',
    }
    throw error
  }

  // Step 3: Rate limiter check — block if limited
  const rateLimitCheck = canMakeRequest(_rateLimitState)
  if (!rateLimitCheck.allowed) {
    const error: AppError = {
      code: 'RATE_LIMIT',
      message: `Rate limited. Retry in ${rateLimitCheck.waitMs}ms.`,
      recoveryAction: `Wait ${Math.ceil(rateLimitCheck.waitMs / 1000)} seconds before trying again.`,
    }
    throw error
  }

  // Step 4: Determine mode and build system prompt
  const model = options.model ?? DEFAULT_MODEL
  const annotationMode = options.annotations ?? false

  let systemPrompt: string
  if (resolvedPreset !== null && isKnownIntentType(resolvedPreset)) {
    const patternIds = FALLBACK_MATRIX[resolvedPreset]
    systemPrompt = buildSystemPrompt('preset', {
      intent: resolvedPreset,
      patternIds,
      annotationMode,
    })
  } else {
    systemPrompt = buildSystemPrompt('auto', { annotationMode })
  }

  // Step 5: Build user message with optional context
  const userMessage = buildUserMessage(
    promptText,
    options.terminalContext,
    options.gitDiff,
  )

  // Step 6: Update rate limit state before API call
  const now = Date.now()
  const windowElapsed = now - _rateLimitState.windowStart
  if (windowElapsed >= WINDOW_MS) {
    _rateLimitState.windowStart = now
    _rateLimitState.requestCount = 1
  } else {
    _rateLimitState.requestCount += 1
  }
  _rateLimitState.lastRequestTime = now

  // Step 7: Call OpenRouter API
  const rawResponse = await callOpenRouter(systemPrompt, userMessage, model, apiKey)

  // Step 8: Parse response
  const parsed = parseImprovementResponse(rawResponse)

  // Step 9: Return structured result
  return {
    improvedPrompt: parsed.improvedPrompt,
    intent: parsed.intent,
    confidence: parsed.confidence,
    patterns: parsed.patterns,
    model,
    // OpenRouter does not expose token counts in the current client implementation.
    tokensUsed: { prompt: 0, completion: 0 },
  }
}
