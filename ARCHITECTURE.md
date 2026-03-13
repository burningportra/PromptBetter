# Architecture — PromptBetter

> Top-level map of domains, layers, and dependency rules.
> Read this before making structural changes.

## System Overview

PromptBetter is an Electron desktop app with a shared core engine also used by a CLI.

```
┌─────────────────────────────────────────────────┐
│              Electron Main Process               │
│  (Node.js — window, IPC hub, tmux, keytar)       │
│                                                   │
│  Shortcuts ─ Window ─ IPC ─ Keytar ─ tmux ─ Git  │
└──────────────────────┬────────────────────────────┘
                       │ IPC (context bridge)
┌──────────────────────▼────────────────────────────┐
│            Electron Renderer Process               │
│  (Chromium — React, Tailwind, Zustand)             │
│                                                     │
│  InputPanel ─ OutputPanel ─ HistoryPanel ─ Settings │
│  promptStore ─ settingsStore ─ historyStore         │
└──────────────────────┬──────────────────────────────┘
                       │ imports (pure logic only)
┌──────────────────────▼────────────────────────────┐
│              Core Engine (src/core/)                │
│  (Shared by Electron + CLI — no Node.js APIs)      │
│                                                     │
│  improve ─ score ─ secrets ─ classify ─ diff        │
│  openrouter ─ slashCommands ─ antiPatterns          │
└──────────────────────┬──────────────────────────────┘
                       │ imports
┌──────────────────────▼────────────────────────────┐
│            Shared Types (src/shared/)               │
│  (Imported by ALL layers — imports NOTHING)          │
│                                                     │
│  types ─ patterns ─ constants                       │
└─────────────────────────────────────────────────────┘
```

## Layer Definitions

### `src/shared/` — Foundation types
- **Imports:** nothing
- **Contains:** TypeScript interfaces, enums, constants, pattern definitions
- **Rule:** Zero runtime logic. Pure type definitions and static data.

### `src/core/` — Business logic engine
- **Imports:** `shared/` only
- **Contains:** Prompt improvement pipeline, quality scorer, secret detection, slash commands, anti-patterns, diff engine, OpenRouter API client, keyword classifier
- **Rule:** No Electron APIs, no Node.js `child_process`, no filesystem access. Must run in both Electron main process and standalone CLI. All I/O (API keys, tmux context, git diff) passed in as arguments.

### `src/main/` — Electron main process
- **Imports:** `shared/`, `core/`
- **Contains:** Window manager, IPC handlers, global shortcuts, keytar integration, tmux integration, git operations, system tray, logging
- **Rule:** This is the only layer with access to Node.js APIs, `child_process`, and the filesystem. All dangerous operations live here.

### `src/renderer/` — React frontend
- **Imports:** `shared/`, `core/` (pure logic only)
- **Contains:** React components, Zustand stores, hooks, styles
- **Rule:** NEVER import from `main/`. All communication with main process goes through IPC via the preload context bridge. May import `core/` for pure functions (scoring, secret detection, slash parsing) that run client-side for real-time UI feedback.

### `src/preload/` — Security boundary
- **Imports:** `shared/` only
- **Contains:** Electron `contextBridge` API surface
- **Rule:** Exposes the minimum required IPC channels. No business logic. No direct access to Node.js APIs from renderer.

### `src/cli/` — CLI entry point
- **Imports:** `shared/`, `core/`
- **Contains:** `commander` argument parsing, stdin handling, stdout output
- **Rule:** Thin wrapper. All logic delegated to `core/`. May also call `main/` tmux/keytar functions directly (CLI runs in Node.js).

## Dependency Direction (STRICT)

```
shared/     →  (nothing)
core/       →  shared/
main/       →  shared/, core/
renderer/   →  shared/, core/
cli/        →  shared/, core/
preload/    →  shared/

FORBIDDEN:
renderer/ → main/          (use IPC)
core/     → main/          (core is shared)
shared/   → anything       (foundation layer)
preload/  → core/, main/   (minimal surface)
```

These rules are enforced by a custom lint rule (`npm run lint`). Violations fail CI.

## Data Flow: Prompt Improvement

```
User types prompt
    │
    ▼
Renderer: slash parse → secret check → score (real-time, in renderer via core/)
    │
    ▼ IPC: 'improve-prompt'
Main Process:
    │ getApiKey() from keytar
    │ captureTerminalContext() from tmux (optional)
    │ captureGitDiff() from git (optional)
    │
    ▼ calls core/improve.ts
Core: buildSystemPrompt() → buildUserMessage() → fetch OpenRouter → parseResponse()
    │
    ▼ IPC response
Renderer: display improved prompt → save to history
    │
    ▼ IPC: 'dispatch-prompt'
Main Process: sendToTmux() or sendViaClipboard()
```

## Key Boundaries

| Boundary | What crosses it | Enforcement |
|----------|----------------|-------------|
| Renderer ↔ Main | IPC messages (typed) | Preload contextBridge; lint rule |
| Core ↔ Main | Function calls (core is a library) | Lint rule: core/ has no Node.js imports |
| App ↔ OpenRouter | HTTPS (API key in header) | Main process only; key from keytar |
| App ↔ tmux | `execFile` with array args | Main process only; session name validated |
| App ↔ Disk | electron-store (JSON) | Main process only; Zustand syncs via IPC |

## File Structure

```
promptbetter/
├── AGENTS.md                    # Agent entry point (this repo's table of contents)
├── ARCHITECTURE.md              # This file
├── src/
│   ├── shared/                  # Types, patterns, constants
│   │   ├── types.ts
│   │   ├── patterns.ts
│   │   └── constants.ts
│   ├── core/                    # Shared engine
│   │   ├── improve.ts           # Pipeline orchestrator
│   │   ├── openrouter.ts        # API client
│   │   ├── classify.ts          # Keyword classifier (offline fallback)
│   │   ├── score.ts             # Quality scorer
│   │   ├── secrets.ts           # Secret detection
│   │   ├── slashCommands.ts     # Slash command parser
│   │   ├── antiPatterns.ts      # Anti-pattern coaching
│   │   ├── diff.ts              # Prompt diff engine
│   │   └── decompose.ts         # Prompt decomposition
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # Entry point
│   │   ├── window.ts            # Window management
│   │   ├── shortcuts.ts         # Global shortcuts
│   │   ├── ipc.ts               # IPC handlers
│   │   ├── tmux.ts              # tmux integration
│   │   ├── git.ts               # Git diff capture
│   │   ├── keytar.ts            # Secure storage
│   │   └── logger.ts            # Logging
│   ├── renderer/                # React frontend
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── styles/
│   ├── preload/
│   │   └── index.ts             # Context bridge
│   └── cli/
│       ├── index.ts             # CLI entry point
│       └── args.ts              # Argument parsing
├── docs/                        # Knowledge base (see AGENTS.md)
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── electron-builder.yml
```
