#!/usr/bin/env tsx
/**
 * Dependency Direction Linter
 *
 * Enforces architectural boundaries defined in ARCHITECTURE.md.
 * Parses import statements in all src/ TypeScript files and rejects
 * forbidden cross-layer imports, forbidden Node.js APIs in core/,
 * exec() string-interpolation calls, and `any` type annotations
 * in core/ and shared/.
 *
 * Usage: npx tsx scripts/lint-deps.ts [--fix-hints]
 *
 * Exit code: 0 = clean, 1 = violations found
 */

import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Layer definitions
// ---------------------------------------------------------------------------

type Layer = 'shared' | 'core' | 'main' | 'renderer' | 'preload' | 'cli' | 'scripts' | 'unknown'

/** Map from src subdirectory name → Layer */
const DIR_TO_LAYER: Record<string, Layer> = {
  shared: 'shared',
  core: 'core',
  main: 'main',
  renderer: 'renderer',
  preload: 'preload',
  cli: 'cli',
  scripts: 'scripts',
}

/** Which layers a given layer may import from */
const ALLOWED_IMPORTS: Record<Layer, Layer[]> = {
  shared: [],
  core: ['shared'],
  main: ['shared', 'core'],
  renderer: ['shared', 'core'],
  preload: ['shared'],
  cli: ['shared', 'core'],
  scripts: ['shared', 'core', 'main', 'renderer', 'preload', 'cli'],
  unknown: [],
}

/** Forbidden cross-layer import pairs with remediation messages */
const FORBIDDEN_REASONS: Array<{
  from: Layer
  to: Layer
  reason: string
  fix: string
}> = [
  {
    from: 'renderer',
    to: 'main',
    reason: 'renderer/ cannot import from main/ — this breaks the Electron process model.',
    fix: 'Use IPC (ipcRenderer.invoke) via the preload contextBridge instead.',
  },
  {
    from: 'core',
    to: 'main',
    reason: 'core/ cannot import from main/ — core is shared between Electron and CLI.',
    fix: 'Pass the value (API key, context) as a function argument instead of importing it.',
  },
  {
    from: 'shared',
    to: 'core',
    reason: 'shared/ cannot import from core/ — shared/ is the foundation layer.',
    fix: 'Move the dependency into core/ or refactor shared/ to have no imports.',
  },
  {
    from: 'shared',
    to: 'main',
    reason: 'shared/ cannot import from main/ — shared/ is the foundation layer.',
    fix: 'Remove the import. shared/ must import nothing.',
  },
  {
    from: 'shared',
    to: 'renderer',
    reason: 'shared/ cannot import from renderer/ — shared/ is the foundation layer.',
    fix: 'Remove the import. shared/ must import nothing.',
  },
  {
    from: 'shared',
    to: 'preload',
    reason: 'shared/ cannot import from preload/ — shared/ is the foundation layer.',
    fix: 'Remove the import. shared/ must import nothing.',
  },
  {
    from: 'shared',
    to: 'cli',
    reason: 'shared/ cannot import from cli/ — shared/ is the foundation layer.',
    fix: 'Remove the import. shared/ must import nothing.',
  },
  {
    from: 'preload',
    to: 'core',
    reason: 'preload/ cannot import from core/ — preload must be a minimal security boundary.',
    fix: 'Move logic into main/ and expose only data via IPC/contextBridge.',
  },
  {
    from: 'preload',
    to: 'main',
    reason: 'preload/ cannot import from main/ — preload/ is the security boundary layer.',
    fix: 'Expose a named IPC channel via contextBridge instead of importing main/ directly.',
  },
]

/** Node.js APIs forbidden in core/ (core must be portable — runs in Electron + CLI) */
const FORBIDDEN_NODE_APIS_IN_CORE = [
  'child_process',
  'electron',
  'fs',
  'path', // debatable, but core should be pure — use passed-in paths
  'os',
  'net',
  'http',
  'https',
  'crypto', // inject a crypto abstraction via argument instead; core/ must be portable
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Violation {
  file: string
  line: number
  column: number
  rule: string
  message: string
  fix: string
  snippet: string
}

function getLayer(filePath: string, srcRoot: string): Layer {
  const rel = path.relative(srcRoot, filePath)
  const parts = rel.split(path.sep)
  const dir = parts[0] ?? 'unknown'
  return DIR_TO_LAYER[dir] ?? 'unknown'
}

function resolveImportLayer(importPath: string, fromFile: string, srcRoot: string): Layer | null {
  // Only check relative imports that cross layer boundaries
  if (!importPath.startsWith('.') && !importPath.startsWith('@')) return null

  // Resolve alias paths: @shared/* → src/shared/*, @core/* → src/core/*
  let resolvedPath: string
  if (importPath.startsWith('@shared/')) {
    resolvedPath = path.join(srcRoot, 'shared', importPath.slice('@shared/'.length))
  } else if (importPath.startsWith('@core/')) {
    resolvedPath = path.join(srcRoot, 'core', importPath.slice('@core/'.length))
  } else if (importPath.startsWith('.')) {
    resolvedPath = path.resolve(path.dirname(fromFile), importPath)
  } else {
    return null
  }

  return getLayer(resolvedPath, srcRoot)
}

/** Extract all import/require paths from a TypeScript source file. */
function extractImports(source: string): Array<{ importPath: string; lineIndex: number; colIndex: number }> {
  const results: Array<{ importPath: string; lineIndex: number; colIndex: number }> = []
  const lines = source.split('\n')

  // Match: import ... from 'path' / import('path') / require('path')
  const IMPORT_FROM = /^\s*import\s+(?:type\s+)?(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/
  const DYNAMIC_IMPORT = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  const REQUIRE = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Static import
    const m = IMPORT_FROM.exec(line)
    if (m && m[1]) {
      results.push({ importPath: m[1], lineIndex: i, colIndex: line.indexOf(m[1]) })
    }

    // Dynamic import
    let dm: RegExpExecArray | null
    DYNAMIC_IMPORT.lastIndex = 0
    while ((dm = DYNAMIC_IMPORT.exec(line)) !== null) {
      if (dm[1]) results.push({ importPath: dm[1], lineIndex: i, colIndex: dm.index })
    }

    // require()
    let rm: RegExpExecArray | null
    REQUIRE.lastIndex = 0
    while ((rm = REQUIRE.exec(line)) !== null) {
      if (rm[1]) results.push({ importPath: rm[1], lineIndex: i, colIndex: rm.index })
    }
  }

  return results
}

/** Check for exec() calls (all forms are forbidden; use execFile with array args). */
function checkExecCalls(source: string, filePath: string): Violation[] {
  const violations: Violation[] = []
  const lines = source.split('\n')
  // Match bare exec( — word boundary, not preceded by '.' (excludes regex.exec(), str.exec())
  // and not followed by File/FileSync/Sync suffix (those are the safe variants)
  const EXEC_CALL = /(?<!\.)(?<!\w)\bexec\s*\(/g

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    // Skip comment lines
    if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue

    EXEC_CALL.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = EXEC_CALL.exec(line)) !== null) {
      // Allow execFile, execFileSync, execSync — only flag bare exec()
      const before = line.slice(0, m.index)
      if (/(?:execFile|execFileSync|execSync)\s*$/.test(before + 'exec')) continue
      // Check the chars immediately before "exec" in the original match
      const matchStr = line.slice(m.index)
      if (/^execFile|^execFileSync|^execSync/.test(matchStr.slice(4))) continue
      // Distinguish: interpolation/concat (higher risk) vs plain string (still forbidden)
      const after = line.slice(m.index + m[0].length)
      const hasInterpolation = after.startsWith('`') || /^['"][^'"]*['"]\s*\+/.test(after)
      const message = hasInterpolation
        ? 'exec() with string interpolation/concatenation — command injection risk.'
        : 'exec() is forbidden — ARCHITECTURE.md requires execFile() with array args for all shell calls.'
      violations.push({
        file: filePath,
        line: i + 1,
        column: m.index + 1,
        rule: 'no-exec',
        message,
        fix: 'Use execFile(command, [arg1, arg2]) with an array of arguments. See docs/SECURITY.md.',
        snippet: line.trim(),
      })
    }
  }

  return violations
}

/** Check for explicit `any` type annotations in core/ and shared/. */
function checkAnyTypes(source: string, filePath: string, layer: Layer): Violation[] {
  if (layer !== 'core' && layer !== 'shared') return []

  const violations: Violation[] = []
  const lines = source.split('\n')

  // Match `any` type annotations — strip inline comments before matching to avoid false positives
  const ANY_PATTERN = /\bany\b/g

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    // Skip pure comment lines
    if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue
    // Strip inline comments (// ...) before pattern matching
    const lineWithoutComment = line.replace(/\/\/.*$/, '')

    ANY_PATTERN.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = ANY_PATTERN.exec(lineWithoutComment)) !== null) {
      // Confirm it's used as a type, not a variable name (rough heuristic)
      const before = lineWithoutComment.slice(0, m.index)
      const after = lineWithoutComment.slice(m.index + 3)
      const isTypeContext =
        /:\s*$/.test(before) ||
        /as\s+$/.test(before) ||
        /<$/.test(before.trim()) ||
        /\|\s*$/.test(before) ||
        /&\s*$/.test(before) ||
        /Array<$/.test(before)
      const isTypeEnd = /^[\s,>|&;)\]]/.test(after) || after.length === 0

      if (isTypeContext || isTypeEnd) {
        violations.push({
          file: filePath,
          line: i + 1,
          column: m.index + 1,
          rule: 'no-any-in-core-shared',
          message: `\`any\` type found in ${layer}/ — strict typing required in shared architecture layers.`,
          fix: `Replace \`any\` with a specific type. Use \`unknown\` and narrow, or define an interface in src/shared/types.ts.`,
          snippet: line.trim(),
        })
      }
    }
  }

  return violations
}

// ---------------------------------------------------------------------------
// File walker
// ---------------------------------------------------------------------------

function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', 'out', 'dist', '__structural__'].includes(entry.name)) continue
      results.push(...walkDir(full, exts))
    } else if (entry.isFile() && exts.some((e) => entry.name.endsWith(e))) {
      results.push(full)
    }
  }
  return results
}

// ---------------------------------------------------------------------------
// Main lint function
// ---------------------------------------------------------------------------

function lint(srcRoot: string): Violation[] {
  const violations: Violation[] = []
  const files = walkDir(srcRoot, ['.ts', '.tsx'])

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, 'utf-8')
    const fromLayer = getLayer(filePath, srcRoot)
    const lines = source.split('\n')

    // 1. Check cross-layer imports
    const imports = extractImports(source)
    for (const { importPath, lineIndex } of imports) {
      const toLayer = resolveImportLayer(importPath, filePath, srcRoot)
      if (toLayer === null) {
        // Third-party or non-resolvable import — check Node.js API if in core/
        if (fromLayer === 'core') {
          // Normalize node:-prefixed specifiers (e.g. 'node:fs' → 'fs')
          const normalizedImport = importPath.startsWith('node:') ? importPath.slice(5) : importPath
          const forbidden = FORBIDDEN_NODE_APIS_IN_CORE.find((api) => normalizedImport === api || normalizedImport.startsWith(api + '/'))
          if (forbidden) {
            violations.push({
              file: filePath,
              line: lineIndex + 1,
              column: 1,
              rule: 'no-nodejs-in-core',
              message: `core/ cannot import Node.js built-in '${importPath}' (resolved: '${forbidden}').`,
              fix: `core/ must be portable (runs in Electron + CLI). Pass I/O values as function arguments instead, or move the logic to main/. See ARCHITECTURE.md → Layer Definitions → src/core/.`,
              snippet: (lines[lineIndex] ?? '').trim(),
            })
          }
        }
        continue
      }

      const allowed = ALLOWED_IMPORTS[fromLayer] ?? []
      if (toLayer !== fromLayer && !allowed.includes(toLayer)) {
        const reason = FORBIDDEN_REASONS.find((r) => r.from === fromLayer && r.to === toLayer)
        violations.push({
          file: filePath,
          line: lineIndex + 1,
          column: 1,
          rule: 'dep-direction',
          message: reason?.reason ?? `${fromLayer}/ cannot import from ${toLayer}/.`,
          fix: reason?.fix ?? `See ARCHITECTURE.md → Dependency Direction (STRICT).`,
          snippet: (lines[lineIndex] ?? '').trim(),
        })
      }
    }

    // 2. Check exec() string interpolation
    violations.push(...checkExecCalls(source, filePath))

    // 3. Check `any` types in core/ and shared/
    violations.push(...checkAnyTypes(source, filePath, fromLayer))
  }

  return violations
}

// ---------------------------------------------------------------------------
// Reporter
// ---------------------------------------------------------------------------

function formatViolation(v: Violation): string {
  const relPath = path.relative(process.cwd(), v.file)
  return [
    ``,
    `ERROR: Forbidden pattern in ${relPath}`,
    `  Line ${v.line}:${v.column}: ${v.snippet}`,
    ``,
    `  Rule: ${v.message}`,
    `  Fix:  ${v.fix}`,
    `  See:  ARCHITECTURE.md → Dependency Direction (STRICT)`,
  ].join('\n')
}

function main(): void {
  const srcRoot = path.join(process.cwd(), 'src')

  if (!fs.existsSync(srcRoot)) {
    console.log('No src/ directory found — skipping dependency lint.')
    process.exit(0)
  }

  console.log('Running dependency direction lint...')
  const violations = lint(srcRoot)

  if (violations.length === 0) {
    console.log('✓ No dependency violations found.')
    process.exit(0)
  }

  console.error(`\nFound ${violations.length} violation${violations.length > 1 ? 's' : ''}:\n`)
  for (const v of violations) {
    console.error(formatViolation(v))
  }
  console.error(`\n${violations.length} violation${violations.length > 1 ? 's' : ''} found. Fix the issues above before merging.`)
  process.exit(1)
}

main()
