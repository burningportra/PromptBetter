/**
 * Structural Invariant Tests
 *
 * Not unit tests — these grep the codebase for forbidden patterns,
 * type safety violations, and architecture invariants. They run in CI
 * alongside unit tests and catch mistakes before code review.
 *
 * Clear failure messages inject remediation instructions into agent context.
 * See: AGENTS.md, docs/SECURITY.md, ARCHITECTURE.md
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, relative, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url))

/** src/ root — this file lives at src/__structural__/invariants.test.ts */
const SRC_DIR = join(__dirname, '..')

/** Recursively collect .ts / .tsx files, excluding generated and structural dirs. */
function walkTs(dir: string): string[] {
  if (!existsSync(dir)) return []
  const results: string[] = []
  const SKIP_DIRS = new Set(['node_modules', 'out', 'dist', '__structural__'])
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkTs(full))
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      results.push(full)
    }
  }
  return results
}

function read(filePath: string): string {
  return readFileSync(filePath, 'utf-8')
}

function isTestFile(filePath: string): boolean {
  const base = basename(filePath)
  return base.endsWith('.test.ts') || base.endsWith('.spec.ts') || base.endsWith('.test.tsx')
}

/** Path relative to src/ for readable violation output. */
function rel(filePath: string): string {
  return relative(SRC_DIR, filePath)
}

/**
 * Strip inline comments from a source line before pattern matching.
 * Tracks single-quote, double-quote, and backtick string contexts so that
 * `//` sequences inside string literals (e.g. `http://`) are not mistaken
 * for comment delimiters.
 */
function stripInlineComment(line: string): string {
  let inSingle = false
  let inDouble = false
  let inBacktick = false

  for (let i = 0; i < line.length - 1; i++) {
    const ch = line[i]
    const escaped = i > 0 && line[i - 1] === '\\'

    if (ch === "'" && !escaped && !inDouble && !inBacktick) {
      inSingle = !inSingle
    } else if (ch === '"' && !escaped && !inSingle && !inBacktick) {
      inDouble = !inDouble
    } else if (ch === '`' && !escaped && !inSingle && !inDouble) {
      inBacktick = !inBacktick
    } else if (ch === '/' && line[i + 1] === '/' && !inSingle && !inDouble && !inBacktick) {
      return line.slice(0, i)
    }
  }

  return line
}

/** Return true if the line is a pure comment (//... or *... or /*...) */
function isCommentLine(line: string): boolean {
  return /^\s*(\/\/|\/\*|\*)/.test(line)
}

// ---------------------------------------------------------------------------
// Security Invariants
// ---------------------------------------------------------------------------

describe('Security Invariants', () => {
  it('no exec() calls — use execFile() or spawn() with array args', () => {
    const files = walkTs(SRC_DIR)
    const violations: string[] = []

    for (const file of files) {
      const lines = read(file).split('\n')
      lines.forEach((raw, idx) => {
        if (isCommentLine(raw)) return
        const line = stripInlineComment(raw)

        // Match bare exec( — must not be execFile(, execSync(, execFileSync(, or .exec( (regex method)
        const BARE_EXEC = /(?<![.\w])exec\s*\(/g
        let m: RegExpExecArray | null
        BARE_EXEC.lastIndex = 0
        while ((m = BARE_EXEC.exec(line)) !== null) {
          const rest = line.slice(m.index)
          if (/^exec(?:File|Sync|FileSync)\s*\(/.test(rest)) continue
          violations.push(`${rel(file)}:${idx + 1}: ${raw.trim()}`)
        }
      })
    }

    expect(
      violations,
      [
        'exec() is forbidden — use execFile(cmd, [arg1, arg2]) with array arguments.',
        'String-based shell calls are a command injection risk.',
        'See docs/SECURITY.md → Shell Command Safety.',
        violations.length > 0 ? `\nViolations:\n${violations.join('\n')}` : '',
      ].join('\n'),
    ).toHaveLength(0)
  })

  it('no template literals as first arg to execFile() or spawn()', () => {
    const files = walkTs(SRC_DIR)
    const violations: string[] = []

    // e.g. execFile(`ls ${dir}`, ...) — interpolated template as command
    const TEMPLATE_ARG = /(?:execFile|spawn)\s*\(\s*`[^`]*\$\{/

    for (const file of files) {
      const lines = read(file).split('\n')
      lines.forEach((raw, idx) => {
        if (isCommentLine(raw)) return
        const line = stripInlineComment(raw)
        if (TEMPLATE_ARG.test(line)) {
          violations.push(`${rel(file)}:${idx + 1}: ${raw.trim()}`)
        }
      })
    }

    expect(
      violations,
      [
        'Template literal with interpolation as first arg to execFile()/spawn() — command injection risk.',
        'Pass the command as a plain string and user input in the args array:',
        '  execFile("git", ["log", "--oneline", userBranch])   // ✓ safe',
        '  execFile(`git log ${branch}`, [])                   // ✗ dangerous',
        'See docs/SECURITY.md → Shell Command Safety.',
        violations.length > 0 ? `\nViolations:\n${violations.join('\n')}` : '',
      ].join('\n'),
    ).toHaveLength(0)
  })

  it('no hardcoded API key patterns in non-test source files', () => {
    const files = walkTs(SRC_DIR).filter((f) => !isTestFile(f))
    const violations: string[] = []

    // Matches sk-or-... (OpenRouter), sk-... (OpenAI), AKIA... (AWS)
    const KEY_PATTERN = /(['"`])(sk-or-[A-Za-z0-9\-_]{10,}|sk-[A-Za-z0-9]{10,}|AKIA[A-Z0-9]{10,})\1/

    for (const file of files) {
      const lines = read(file).split('\n')
      lines.forEach((raw, idx) => {
        if (isCommentLine(raw)) return
        if (KEY_PATTERN.test(raw)) {
          violations.push(`${rel(file)}:${idx + 1}: [REDACTED — API key pattern matched]`)
        }
      })
    }

    expect(
      violations,
      [
        'Hardcoded API key detected in source code.',
        'API keys must NEVER be committed. Use keytar (main/keytar.ts) or environment variables.',
        'See docs/SECURITY.md → Key Storage.',
        violations.length > 0 ? `\nViolations:\n${violations.join('\n')}` : '',
      ].join('\n'),
    ).toHaveLength(0)
  })

  it('no console.log of key/secret/password/token variable names', () => {
    const files = walkTs(SRC_DIR)
    const violations: string[] = []

    // Match console.log/warn/error containing sensitive variable names
    const LOG_SENSITIVE =
      /console\.\w+\s*\([^)]*\b(apiKey|api_key|secret|password|passwd|token|accessKey|access_key)\b/i

    for (const file of files) {
      const lines = read(file).split('\n')
      lines.forEach((raw, idx) => {
        if (isCommentLine(raw)) return
        const line = stripInlineComment(raw)
        if (LOG_SENSITIVE.test(line)) {
          violations.push(`${rel(file)}:${idx + 1}: ${raw.trim()}`)
        }
      })
    }

    expect(
      violations,
      [
        'console.log() of a sensitive variable (key/secret/password/token) is forbidden.',
        'Remove the log statement or redact the value: console.log("key:", "[REDACTED]")',
        'See docs/SECURITY.md → Logging.',
        violations.length > 0 ? `\nViolations:\n${violations.join('\n')}` : '',
      ].join('\n'),
    ).toHaveLength(0)
  })

  it('no nodeIntegration: true in Electron window configuration', () => {
    const files = walkTs(SRC_DIR)
    const violations: string[] = []

    const NODE_INTEGRATION = /nodeIntegration\s*:\s*true/

    for (const file of files) {
      const lines = read(file).split('\n')
      lines.forEach((raw, idx) => {
        if (isCommentLine(raw)) return
        const line = stripInlineComment(raw)
        if (NODE_INTEGRATION.test(line)) {
          violations.push(`${rel(file)}:${idx + 1}: ${raw.trim()}`)
        }
      })
    }

    expect(
      violations,
      [
        'nodeIntegration: true is a critical Electron security vulnerability.',
        'Keep nodeIntegration: false and use the contextBridge (preload/index.ts) for all IPC.',
        'See docs/SECURITY.md → Electron Security and ARCHITECTURE.md → Key Boundaries.',
        violations.length > 0 ? `\nViolations:\n${violations.join('\n')}` : '',
      ].join('\n'),
    ).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Type Safety Invariants
// ---------------------------------------------------------------------------

describe('Type Safety Invariants', () => {
  it('no `any` type annotations in src/core/ or src/shared/ (except test files)', () => {
    const CHECKED_DIRS = [join(SRC_DIR, 'core'), join(SRC_DIR, 'shared')]
    const violations: string[] = []

    // Matches `any` in type positions: `: any`, `<any>`, `any[]`, `| any`, `& any`
    const ANY_TYPE = /(?::\s*any\b|<any>|any\[\]|\|\s*any\b|&\s*any\b)/

    for (const dir of CHECKED_DIRS) {
      const files = walkTs(dir).filter((f) => !isTestFile(f))
      for (const file of files) {
        const lines = read(file).split('\n')
        lines.forEach((raw, idx) => {
          if (isCommentLine(raw)) return
          const line = stripInlineComment(raw)
          if (ANY_TYPE.test(line)) {
            violations.push(`${rel(file)}:${idx + 1}: ${raw.trim()}`)
          }
        })
      }
    }

    expect(
      violations,
      [
        '`any` type is forbidden in src/core/ and src/shared/ — strict typing is required.',
        'Use `unknown` with runtime narrowing, or define an interface in src/shared/types.ts.',
        'See AGENTS.md → Conventions → TypeScript strict mode.',
        violations.length > 0 ? `\nViolations:\n${violations.join('\n')}` : '',
      ].join('\n'),
    ).toHaveLength(0)
  })

  it('no `as` type assertions in src/core/ implementation files (except `as const` and `as unknown`)', () => {
    const coreDir = join(SRC_DIR, 'core')
    const files = walkTs(coreDir).filter((f) => !isTestFile(f))
    const violations: string[] = []

    for (const file of files) {
      const lines = read(file).split('\n')
      lines.forEach((raw, idx) => {
        if (isCommentLine(raw)) return
        const line = stripInlineComment(raw)
        // Skip import statements — `import { foo as bar }` and `import * as foo`
        if (/^\s*(?:import|export)/.test(line)) return
        // Skip `* as foo` namespace imports
        if (/\*\s+as\s+/.test(line)) return
        // Match type assertions, excluding safe patterns (`as const`, `as unknown`)
        const AS_ASSERTION = /\bas\s+(?!const\b)(?!unknown\b)[A-Za-z]/
        if (AS_ASSERTION.test(line)) {
          violations.push(`${rel(file)}:${idx + 1}: ${raw.trim()}`)
        }
      })
    }

    expect(
      violations,
      [
        '`as` type assertion in src/core/ — only allowed at validated boundaries.',
        'Use type guards (`if (typeof x === "string")`) instead of casting.',
        'If the cast is truly safe, add a comment explaining why before the assertion.',
        'See AGENTS.md → Conventions → "Parse at the boundary, trust inside."',
        violations.length > 0 ? `\nViolations:\n${violations.join('\n')}` : '',
      ].join('\n'),
    ).toHaveLength(0)
  })

  it('renderer/ never imports ipcRenderer directly from electron', () => {
    const rendererDir = join(SRC_DIR, 'renderer')
    const files = walkTs(rendererDir)
    const violations: string[] = []

    for (const file of files) {
      const content = read(file)
      // Check across the entire file (handles multi-line imports)
      if (/\bipcRenderer\b/.test(content)) {
        // Find the line for a useful error location
        const lines = content.split('\n')
        lines.forEach((raw, idx) => {
          if (/\bipcRenderer\b/.test(raw)) {
            violations.push(`${rel(file)}:${idx + 1}: ${raw.trim()}`)
          }
        })
      }
    }

    expect(
      violations,
      [
        'renderer/ must not use ipcRenderer — it is not available with nodeIntegration: false.',
        'Use window.electronAPI.<method>() via the contextBridge exposed in preload/index.ts.',
        'See ARCHITECTURE.md → Key Boundaries and preload/index.ts.',
        violations.length > 0 ? `\nViolations:\n${violations.join('\n')}` : '',
      ].join('\n'),
    ).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Architecture Invariants
// ---------------------------------------------------------------------------

describe('Architecture Invariants', () => {
  it('every src/core/ implementation file has a co-located *.test.ts', () => {
    const coreDir = join(SRC_DIR, 'core')
    if (!existsSync(coreDir)) return

    const entries = readdirSync(coreDir, { withFileTypes: true })
    const implFiles = entries
      .filter(
        (e) =>
          e.isFile() &&
          e.name.endsWith('.ts') &&
          !e.name.endsWith('.test.ts') &&
          !e.name.endsWith('.spec.ts') &&
          e.name !== '.gitkeep',
      )
      .map((e) => e.name)

    const testFiles = new Set(
      entries.filter((e) => e.isFile() && e.name.endsWith('.test.ts')).map((e) => e.name),
    )

    const missing: string[] = []
    for (const impl of implFiles) {
      const expectedTest = impl.replace(/\.ts$/, '.test.ts')
      if (!testFiles.has(expectedTest)) {
        missing.push(`src/core/${impl}  →  missing src/core/${expectedTest}`)
      }
    }

    expect(
      missing,
      [
        'Every implementation file in src/core/ must have a co-located test file.',
        'Create the missing test files. Minimum: happy-path + one error case per public function.',
        'See AGENTS.md → Conventions → "Tests live next to source."',
        missing.length > 0 ? `\nMissing tests:\n${missing.join('\n')}` : '',
      ].join('\n'),
    ).toHaveLength(0)
  })

  it('no file in src/ exceeds 400 lines', () => {
    const files = walkTs(SRC_DIR)
    const violations: string[] = []

    for (const file of files) {
      const lineCount = read(file).split('\n').length
      if (lineCount > 400) {
        violations.push(`${rel(file)}: ${lineCount} lines (max 400)`)
      }
    }

    expect(
      violations,
      [
        'Files exceeding 400 lines reduce readability and make modules hard to reason about.',
        'Split the file into focused modules. Each module should have one clear responsibility.',
        'See AGENTS.md → Conventions.',
        violations.length > 0 ? `\nViolations:\n${violations.join('\n')}` : '',
      ].join('\n'),
    ).toHaveLength(0)
  })
})
