// OpenRouter API client with rate limiting.

import { OPENROUTER_API_URL, RATE_LIMIT_REQUESTS_PER_MINUTE } from '../shared/constants'
import type { AppError } from '../shared/types'

export interface RateLimitState {
  lastRequestTime: number
  requestCount: number
  windowStart: number
}

export interface RateLimitCheck {
  allowed: boolean
  waitMs: number
}

const MIN_INTERVAL_MS = 1000
const WINDOW_MS = 60_000

export function canMakeRequest(state: RateLimitState): RateLimitCheck {
  const now = Date.now()

  // Enforce minimum 1s interval between requests
  const timeSinceLast = now - state.lastRequestTime
  if (timeSinceLast < MIN_INTERVAL_MS) {
    return { allowed: false, waitMs: MIN_INTERVAL_MS - timeSinceLast }
  }

  // Reset window if it has expired
  const windowElapsed = now - state.windowStart
  if (windowElapsed >= WINDOW_MS) {
    return { allowed: true, waitMs: 0 }
  }

  // Check requests within current window
  if (state.requestCount >= RATE_LIMIT_REQUESTS_PER_MINUTE) {
    const waitMs = WINDOW_MS - windowElapsed
    return { allowed: false, waitMs }
  }

  return { allowed: true, waitMs: 0 }
}

export function buildUserMessage(
  userInput: string,
  terminalContext?: string,
  gitDiff?: string,
): string {
  const parts: string[] = [userInput]

  if (terminalContext !== undefined && terminalContext.trim().length > 0) {
    parts.push(`\n--- Terminal Context ---\n${terminalContext}`)
  }

  if (gitDiff !== undefined && gitDiff.trim().length > 0) {
    parts.push(`\n--- Git Diff ---\n${gitDiff}`)
  }

  return parts.join('\n')
}

// Typed shape of the OpenRouter chat completions response
interface OpenRouterMessage {
  role: string
  content: string
}

interface OpenRouterChoice {
  message: OpenRouterMessage
  finish_reason: string
  index: number
}

interface OpenRouterResponse {
  choices: OpenRouterChoice[]
  id?: string
  model?: string
}

function getProperty(obj: object, key: string): unknown {
  // Object.hasOwn is not available in all targets; use bracket access via index signature
  return Object.getOwnPropertyDescriptor(obj, key)?.value
}

function isOpenRouterResponse(value: unknown): value is OpenRouterResponse {
  if (typeof value !== 'object' || value === null) return false
  const choices = getProperty(value, 'choices')
  if (!Array.isArray(choices) || choices.length === 0) return false
  const first: unknown = choices[0]
  if (typeof first !== 'object' || first === null) return false
  const message = getProperty(first, 'message')
  if (typeof message !== 'object' || message === null) return false
  const content = getProperty(message, 'content')
  return typeof content === 'string'
}

function makeAppError(code: AppError['code'], message: string): AppError {
  return { code, message }
}

export async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  model: string,
  apiKey: string,
): Promise<string> {
  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  })

  let response: Response
  try {
    response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://promptbetter.app',
      },
      body,
    })
  } catch {
    throw makeAppError('NETWORK_ERROR', 'Network unavailable')
  }

  if (response.status === 401) {
    throw makeAppError('AUTH_FAILED', 'Invalid API key')
  }

  if (response.status === 429) {
    throw makeAppError('RATE_LIMIT', 'Rate limited by OpenRouter')
  }

  if (response.status >= 500) {
    throw makeAppError('IMPROVEMENT_FAILED', 'OpenRouter server error')
  }

  let parsed: unknown
  try {
    parsed = await response.json()
  } catch {
    throw makeAppError('IMPROVEMENT_FAILED', 'Invalid response from OpenRouter')
  }

  if (!isOpenRouterResponse(parsed)) {
    throw makeAppError('IMPROVEMENT_FAILED', 'Unexpected response shape from OpenRouter')
  }

  const content = parsed.choices[0].message.content
  return content
}
