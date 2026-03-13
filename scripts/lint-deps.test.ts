import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * Tests for the dependency direction linter.
 * Creates temporary src/ directories with controlled violations and verifies
 * the linter catches exactly the right errors.
 */

// We need to access the internal `lint` function. Since it's a script, we
// test it by importing the module directly once we refactor it to export.
// For now, we test via subprocess invocation to keep the script standalone.
import { execFileSync } from 'child_process'

const SCRIPT = path.join(__dirname, 'lint-deps.ts')
const TSX = path.join(__dirname, '..', 'node_modules', '.bin', 'tsx')

function runLinter(cwd: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync(TSX, [SCRIPT], { cwd, encoding: 'utf-8', stdio: 'pipe' })
    return { stdout, stderr: '', exitCode: 0 }
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number }
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      exitCode: e.status ?? 1,
    }
  }
}

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pb-lint-test-'))
}

function writeFile(dir: string, relPath: string, content: string): void {
  const full = path.join(dir, relPath)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf-8')
}

describe('lint-deps: dependency direction', () => {
  it('passes when there are no violations', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/shared/types.ts', 'export type Foo = string\n')
    writeFile(tmp, 'src/core/improve.ts', "import type { Foo } from '../shared/types'\nexport function improve(f: Foo): Foo { return f }\n")
    writeFile(tmp, 'src/main/index.ts', "import { improve } from '../core/improve'\nimport type { Foo } from '../shared/types'\n")

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('No dependency violations found')
  })

  it('catches renderer importing from main/', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/main/keytar.ts', 'export function getApiKey(): string { return "" }\n')
    writeFile(tmp, 'src/renderer/App.tsx', "import { getApiKey } from '../main/keytar'\n")

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/renderer.*cannot import.*main/)
    expect(result.stderr).toContain('IPC')
  })

  it('catches core importing from main/', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/main/keytar.ts', 'export function getApiKey(): string { return "" }\n')
    writeFile(tmp, 'src/core/improve.ts', "import { getApiKey } from '../main/keytar'\n")

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/core.*cannot import.*main/)
  })

  it('catches shared importing anything', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/core/improve.ts', 'export const x = 1\n')
    writeFile(tmp, 'src/shared/types.ts', "import { x } from '../core/improve'\n")

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/shared.*cannot import.*core/)
  })

  it('catches preload importing from core/', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/core/score.ts', 'export function score(): number { return 0 }\n')
    writeFile(tmp, 'src/preload/index.ts', "import { score } from '../core/score'\n")

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/preload.*cannot import.*core/)
  })
})

describe('lint-deps: forbidden Node.js APIs in core/', () => {
  it('catches child_process import in core/', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/core/improve.ts', "import { execFile } from 'child_process'\n")

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('child_process')
    expect(result.stderr).toContain('portable')
  })

  it('catches node:-prefixed child_process in core/ (bypass prevention)', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/core/improve.ts', "import { execFile } from 'node:child_process'\n")

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('child_process')
  })

  it('catches node:-prefixed fs in core/', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/core/improve.ts', "import fs from 'node:fs'\n")

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('fs')
  })

  it('catches electron import in core/', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/core/improve.ts', "import { app } from 'electron'\n")

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('electron')
  })

  it('allows child_process in main/', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/main/tmux.ts', "import { execFile } from 'child_process'\n")

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(0)
  })
})

describe('lint-deps: exec() is forbidden (use execFile)', () => {
  it('catches exec() with template literal (interpolation risk)', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/main/tmux.ts', 'import { exec } from "child_process"\nexec(`tmux send-keys -t ${session} "${cmd}" Enter`)\n')

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('injection')
    expect(result.stderr).toContain('execFile')
  })

  it('catches exec() with constant string (still forbidden)', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/main/tmux.ts', 'import { exec } from "child_process"\nexec("ls -la")\n')

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('execFile')
  })

  it('allows execFile() calls', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/main/tmux.ts', 'import { execFile } from "child_process"\nexecFile("tmux", ["send-keys", "-t", "session", "cmd", "Enter"])\n')

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(0)
  })

  it('does not flag regex.exec() method calls', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/main/parse.ts', 'const re = /foo/g\nconst m = re.exec("bar")\n')

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(0)
  })
})

describe('lint-deps: no `any` in core/ and shared/', () => {
  it('catches `any` type annotation in core/', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/core/improve.ts', 'function process(data: any): any { return data }\n')

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('any')
    expect(result.stderr).toContain('core/')
  })

  it('catches `any` type annotation in shared/', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/shared/types.ts', 'export type Payload = any\n')

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('any')
  })

  it('allows `any` in main/ (less strict)', () => {
    const tmp = makeTmpDir()
    writeFile(tmp, 'src/main/index.ts', 'const x: any = {}\n')

    const result = runLinter(tmp)
    expect(result.exitCode).toBe(0)
  })
})
