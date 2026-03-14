/**
 * Structured logger for PromptBetter.
 *
 * - Wraps electron-log with weekly rotation and 4-week retention.
 * - Format: [timestamp] [LEVEL] [module] message { context }
 * - Sanitizes API key tokens (sk-...) before writing any log entry.
 * - In dev mode: logs to console + file. In production: file only.
 * - Log level is configurable at runtime via setLogLevel().
 */

import log from 'electron-log'
import { join } from 'path'
import { readdirSync, unlinkSync, statSync, renameSync, existsSync } from 'fs'
import type { LogLevel } from '../shared/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000
const LOG_FILE_PREFIX = 'promptbetter'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { LogLevel }

export interface Logger {
  error: (message: string, context?: Record<string, unknown>) => void
  warn: (message: string, context?: Record<string, unknown>) => void
  info: (message: string, context?: Record<string, unknown>) => void
  debug: (message: string, context?: Record<string, unknown>) => void
}

// ---------------------------------------------------------------------------
// Sanitization — MUST run before any value is written to a log transport
// ---------------------------------------------------------------------------

/** Redact any API key tokens in a string (patterns starting with sk-). */
export function sanitizeString(value: string): string {
  return value.replace(/\bsk-[a-zA-Z0-9_\-.]+/g, '[REDACTED]')
}

/** Recursively sanitize an array by sanitizing all string and object elements. */
function sanitizeArray(arr: unknown[]): unknown[] {
  return arr.map((item) => {
    if (typeof item === 'string') return sanitizeString(item)
    if (Array.isArray(item)) return sanitizeArray(item)
    if (item !== null && typeof item === 'object') return sanitizeContext(item as Record<string, unknown>)
    return item
  })
}

/** Recursively sanitize an object by sanitizing all string, array, and nested object values. */
export function sanitizeContext(ctx: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(ctx)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value)
    } else if (Array.isArray(value)) {
      result[key] = sanitizeArray(value)
    } else if (value !== null && typeof value === 'object') {
      result[key] = sanitizeContext(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// ISO week helper
// ---------------------------------------------------------------------------

function getIsoWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Rotation and pruning
// ---------------------------------------------------------------------------

function rotateAndPrune(logDir: string): void {
  const weekLabel = getIsoWeekLabel(new Date())
  const currentLogName = `${LOG_FILE_PREFIX}.log`
  const currentLogPath = join(logDir, currentLogName)

  // If the current log file was written in a previous week, archive it.
  if (existsSync(currentLogPath)) {
    try {
      const mtime = statSync(currentLogPath).mtime
      const fileWeek = getIsoWeekLabel(mtime)
      if (fileWeek !== weekLabel) {
        const archivePath = join(logDir, `${LOG_FILE_PREFIX}-${fileWeek}.log`)
        renameSync(currentLogPath, archivePath)
      }
    } catch {
      // Non-fatal — continue with existing file
    }
  }

  // Delete archive files older than 4 weeks.
  try {
    const files = readdirSync(logDir)
    const cutoff = Date.now() - FOUR_WEEKS_MS
    for (const file of files) {
      if (!file.startsWith(LOG_FILE_PREFIX + '-') || !file.endsWith('.log')) continue
      const filePath = join(logDir, file)
      try {
        if (statSync(filePath).mtime.getTime() < cutoff) {
          unlinkSync(filePath)
        }
      } catch {
        // Non-fatal — skip this file
      }
    }
  } catch {
    // Non-fatal — log directory may not exist yet
  }
}

// ---------------------------------------------------------------------------
// electron-log configuration
// ---------------------------------------------------------------------------

const isDev = process.env['NODE_ENV'] === 'development' || !!process.env['ELECTRON_RENDERER_URL']

let logDir: string | null = null

export function initLogger(appLogPath: string, initialLevel: LogLevel = 'info'): void {
  logDir = appLogPath

  // File transport
  log.transports.file.resolvePathFn = () => join(appLogPath, `${LOG_FILE_PREFIX}.log`)
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
  log.transports.file.level = initialLevel

  // Console transport — only in dev
  log.transports.console.level = isDev ? initialLevel : false

  // Run rotation/pruning on startup
  rotateAndPrune(appLogPath)
}

export function setLogLevel(level: LogLevel): void {
  log.transports.file.level = level
  if (isDev) {
    log.transports.console.level = level
  }
}

export function getLogPath(): string | null {
  return logDir ? join(logDir, `${LOG_FILE_PREFIX}.log`) : null
}

// ---------------------------------------------------------------------------
// Module logger factory
// ---------------------------------------------------------------------------

/**
 * Returns a namespaced logger for a given module.
 * Usage: const logger = createLogger('ipc')
 *        logger.info('Handler registered', { channel: 'get-settings' })
 */
export function createLogger(module: string): Logger {
  function write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const safe = sanitizeString(message)
    const tag = `[${module}]`

    if (context && Object.keys(context).length > 0) {
      const safeCtx = sanitizeContext(context)
      log[level](`${tag} ${safe}`, safeCtx)
    } else {
      log[level](`${tag} ${safe}`)
    }
  }

  return {
    error: (msg, ctx) => write('error', msg, ctx),
    warn: (msg, ctx) => write('warn', msg, ctx),
    info: (msg, ctx) => write('info', msg, ctx),
    debug: (msg, ctx) => write('debug', msg, ctx),
  }
}
