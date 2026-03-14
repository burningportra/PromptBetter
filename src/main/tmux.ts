import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import clipboard from 'clipboardy'
import { TMUX_MAX_SESSION_NAME_LENGTH } from '../shared/constants'
import type { AppError, TmuxSession } from '../shared/types'

const execFileAsync = promisify(execFile)

export type { TmuxSession }

// ---------------------------------------------------------------------------
// Session name validation
// ---------------------------------------------------------------------------

/**
 * Validate and return the session name if it is safe.
 * Only alphanumeric characters, dots, underscores, and hyphens are allowed.
 * Throws if the name is invalid.
 */
export function sanitizeSessionName(name: string): string {
  if (name.length === 0 || name.length > TMUX_MAX_SESSION_NAME_LENGTH) {
    throw new Error('Invalid session name')
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new Error('Invalid session name')
  }
  return name
}

// ---------------------------------------------------------------------------
// Claude Code detection
// ---------------------------------------------------------------------------

/**
 * Return a Set of session names where a pane is running a command that looks
 * like Claude Code (command name contains "claude", case-insensitive).
 * Returns an empty Set if tmux is not available or there are no sessions.
 */
async function detectClaudeCodeSessions(): Promise<Set<string>> {
  try {
    const { stdout } = await execFileAsync('tmux', [
      'list-panes',
      '-a',
      '-F',
      '#{session_name}:#{pane_current_command}',
    ])
    const sessions = new Set<string>()
    for (const line of stdout.trim().split('\n')) {
      if (!line) continue
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      const sessionName = line.slice(0, colonIdx)
      const paneCommand = line.slice(colonIdx + 1)
      if (paneCommand.toLowerCase().includes('claude')) {
        sessions.add(sessionName)
      }
    }
    return sessions
  } catch {
    return new Set()
  }
}

// ---------------------------------------------------------------------------
// Session listing
// ---------------------------------------------------------------------------

/**
 * List all running tmux sessions.
 * Returns an empty array if tmux is not installed or no sessions exist.
 */
export async function listSessions(): Promise<TmuxSession[]> {
  try {
    const { stdout } = await execFileAsync('tmux', [
      'list-sessions',
      '-F',
      '#{session_name}:#{session_attached}:#{session_created}',
    ])
    const claudeSessions = await detectClaudeCodeSessions()
    const sessions: TmuxSession[] = []
    for (const line of stdout.trim().split('\n')) {
      if (!line) continue
      // Format: name:attached:created  (name may contain colons is intentionally
      // excluded by the sanitizeSessionName contract, but we split right-to-left
      // on fixed trailing fields to be safe)
      const parts = line.split(':')
      if (parts.length < 3) continue
      // created and attached are the last two numeric fields; everything before
      // is the session name (which our validator ensures has no colon).
      const created = parts[parts.length - 1]
      const attached = parts[parts.length - 2]
      const name = parts.slice(0, parts.length - 2).join(':')
      if (!name) continue
      sessions.push({
        name,
        attached: attached === '1',
        created,
        isClaudeCode: claudeSessions.has(name),
      })
    }
    return sessions
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Tmux dispatch
// ---------------------------------------------------------------------------

/**
 * Send `prompt` to the named tmux session using a secure three-step flow:
 *  1. Load the prompt into a named buffer via stdin (no shell, no interpolation).
 *  2. Paste the buffer into the target pane.
 *  3. Send Enter (C-m) to submit.
 *
 * Throws an AppError with code 'TMUX_DISPATCH_FAILED' on any failure.
 */
export async function sendToTmux(prompt: string, sessionName: string): Promise<void> {
  const safe = sanitizeSessionName(sessionName)

  // Step 1 — load prompt into a named tmux buffer via stdin.
  await new Promise<void>((resolve, reject) => {
    const child = spawn('tmux', ['load-buffer', '-b', 'promptbetter', '-'], {
      stdio: ['pipe', 'ignore', 'ignore'],
    })
    child.on('error', (err) => {
      const appErr: AppError = {
        code: 'TMUX_DISPATCH_FAILED',
        message: err.message,
      }
      reject(appErr)
    })
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        const appErr: AppError = {
          code: 'TMUX_DISPATCH_FAILED',
          message: `tmux load-buffer exited with code ${String(code)}`,
        }
        reject(appErr)
      }
    })
    child.stdin.write(prompt)
    child.stdin.end()
  })

  // Step 2 — paste the buffer into the target session.
  try {
    await execFileAsync('tmux', ['paste-buffer', '-b', 'promptbetter', '-t', safe])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const appErr: AppError = { code: 'TMUX_DISPATCH_FAILED', message: msg }
    throw appErr
  }

  // Step 3 — send Enter to submit.
  try {
    await execFileAsync('tmux', ['send-keys', '-t', safe, 'C-m'])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const appErr: AppError = { code: 'TMUX_DISPATCH_FAILED', message: msg }
    throw appErr
  }
}

// ---------------------------------------------------------------------------
// Clipboard fallback
// ---------------------------------------------------------------------------

/**
 * Copy `text` to the system clipboard via clipboardy.
 * Returns true on success, false if the write fails.
 */
export async function sendViaClipboard(text: string): Promise<boolean> {
  try {
    await clipboard.write(text)
    return true
  } catch {
    return false
  }
}
