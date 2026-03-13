# Plan: Project Scaffolding + Dependency Direction Linter

**Status:** Active
**Author:** claude-code agent (pb-1)
**Created:** 2026-03-13
**GitHub Issues:** #13, #59

## Goal

Bootstrap the PromptBetter Electron project (package.json, TypeScript, Tailwind, electron-vite, electron-builder, stub src/ layout) and implement the dependency direction linter that enforces architectural boundaries in CI.

## Context

- Issue #13 (project scaffolding) is the root prerequisite for all other work.
- Issue #59 (dependency linter) is listed as a co-ship requirement with scaffolding per Epic #1 comments.
- The linter must catch forbidden imports before any other code is written.
- See ARCHITECTURE.md → Dependency Direction (STRICT) for the rules.

## Approach

1. **Create `package.json`** — Electron 33, React 18, Tailwind 3.4, Zustand 5, TypeScript, electron-vite, electron-builder, Vitest, tsx, and all peer deps.
2. **Create TypeScript configs** — `tsconfig.json` (renderer), `tsconfig.node.json` (main/preload), `tsconfig.base.json`.
3. **Create `electron-vite.config.ts`** — Vite config for main, preload, renderer.
4. **Create `tailwind.config.js` + `postcss.config.js`** — dark mode: 'class'.
5. **Create `electron-builder.yml`** — macOS .dmg target.
6. **Scaffold `src/` stubs** — shared/types.ts, shared/patterns.ts, shared/constants.ts, main/index.ts, renderer/main.tsx, renderer/App.tsx, renderer/styles/index.css, preload/index.ts, core/.gitkeep, cli/.gitkeep.
7. **Create `scripts/lint-deps.ts`** — standalone TypeScript linter that enforces dependency direction rules. No external AST deps (regex-based import parsing). Checks: forbidden cross-layer imports, forbidden Node.js APIs in core/, `exec()` string interpolation calls, `any` types in core/ and shared/.
8. **Create `.github/workflows/ci.yml`** — runs lint + typecheck + test on push/PR.
9. **Create `.gitignore`** — standard Electron/Node gitignore.

## Dependency Graph

```
T1: package.json
T2: tsconfigs           depends_on: [T1]
T3: electron-vite.config.ts  depends_on: [T1, T2]
T4: tailwind + postcss  depends_on: [T1]
T5: electron-builder.yml  depends_on: [T1]
T6: src/ stubs          depends_on: [T2]
T7: lint-deps.ts        depends_on: [T1, T2, T6]
T8: CI workflow         depends_on: [T1, T7]
T9: .gitignore          depends_on: []
```

## Acceptance Criteria

- [ ] `npm install` succeeds
- [ ] `npm run dev` can launch Electron (window with React)
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] `npm run lint` catches a forbidden import (verified in unit test)
- [ ] `npm run lint` passes on the stub codebase (no false positives)
- [ ] CI workflow runs on push and PR
- [ ] Error messages include file, line, rule, and remediation hint

## Decision Log

- 2026-03-13: Using `electron-vite` (not raw webpack) as the modern standard for Electron + Vite + React builds. Simplifies main/preload/renderer multi-target compilation.
- 2026-03-13: Using `tsx` (not `ts-node`) for running the lint script — no tsconfig manipulation required, faster startup.
- 2026-03-13: Linter is a standalone script (not ESLint plugin) for simplicity and portability. Can be invoked without ESLint context.

## Progress

- [x] Execution plan created
- [x] T9: .gitignore
- [x] T1: package.json
- [x] T2: TypeScript configs (tsconfig.json + tsconfig.node.json) — rootDir=src for renderer to allow shared/ imports; moduleResolution=node for Node targets
- [x] T3: electron-vite.config.ts
- [x] T4: tailwind + postcss
- [x] T5: electron-builder.yml
- [x] T6: src/ stubs (shared/types.ts, shared/constants.ts, shared/patterns.ts, main/index.ts, renderer/*, preload/index.ts, cli/index.ts)
- [x] T7: scripts/lint-deps.ts — verified: 0 false positives on stub, catches renderer→main, core→main, shared→*, preload→core, Node.js APIs in core/, exec() string interp, any in core/shared
- [x] T8: .github/workflows/ci.yml
