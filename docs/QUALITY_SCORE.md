# Quality Score — PromptBetter

> Quality grades per domain and architectural layer.
> Updated as features are built. Tracks gaps and drift over time.
> Inspired by [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/).

## Grading Scale

| Grade | Meaning |
|-------|---------|
| **A** | Production-ready. Tests pass, docs current, lint clean, no known gaps. |
| **B** | Functional. Minor gaps in tests or docs. Shippable. |
| **C** | Works but fragile. Missing tests, stale docs, or known edge cases. |
| **D** | Incomplete or broken. Not shippable. |
| **—** | Not started. |

## Domain Quality Grades

| Domain | Grade | Tests | Docs | Lint | Notes |
|--------|-------|-------|------|------|-------|
| **Pattern Engine** (`shared/`) | — | — | — | — | Not started |
| **Intent Classification** (`core/classify`) | — | — | — | — | Not started |
| **System Prompt** (`core/improve`) | — | — | — | — | Not started |
| **OpenRouter Client** (`core/openrouter`) | — | — | — | — | Not started |
| **Response Parser** (`core/improve`) | — | — | — | — | Not started |
| **Quality Scorer** (`core/score`) | — | — | — | — | Not started |
| **Secret Detection** (`core/secrets`) | — | — | — | — | Not started |
| **Slash Commands** (`core/slashCommands`) | — | — | — | — | Not started |
| **Anti-Pattern Coaching** (`core/antiPatterns`) | — | — | — | — | Not started |
| **Diff Engine** (`core/diff`) | — | — | — | — | Not started |
| **Decomposition** (`core/decompose`) | — | — | — | — | Not started |
| **tmux Integration** (`main/tmux`) | — | — | — | — | Not started |
| **Git Integration** (`main/git`) | — | — | — | — | Not started |
| **Keytar Integration** (`main/keytar`) | — | — | — | — | Not started |
| **Window Manager** (`main/window`) | — | — | — | — | Not started |
| **IPC Handlers** (`main/ipc`) | — | — | — | — | Not started |
| **Global Shortcuts** (`main/shortcuts`) | — | — | — | — | Not started |
| **Logging** (`main/logger`) | — | — | — | — | Not started |
| **Input Panel** (`renderer/InputPanel`) | — | — | — | — | Not started |
| **Output Panel** (`renderer/OutputPanel`) | — | — | — | — | Not started |
| **History Panel** (`renderer/HistoryPanel`) | — | — | — | — | Not started |
| **Presets Panel** (`renderer/PresetsPanel`) | — | — | — | — | Not started |
| **Settings Panel** (`renderer/SettingsPanel`) | — | — | — | — | Not started |
| **Zustand Stores** (`renderer/stores`) | — | — | — | — | Not started |
| **CLI** (`cli/`) | — | — | — | — | Not started (P2) |

## Architectural Layer Quality

| Layer | Grade | Dependency Rules | Test Coverage | Doc Coverage |
|-------|-------|-----------------|---------------|-------------|
| `src/shared/` | — | — | — | — |
| `src/core/` | — | — | — | — |
| `src/main/` | — | — | — | — |
| `src/renderer/` | — | — | — | — |
| `src/preload/` | — | — | — | — |
| `src/cli/` | — | — | — | — |

## How to Update

When you complete work on a domain:
1. Update the grade in this file
2. Note what's missing (e.g., "B — missing edge case tests for multi-line prompts")
3. Commit the update alongside your code change

When you notice drift or degradation:
1. Downgrade the grade with a note
2. File a cleanup issue or exec plan
3. Link the issue in the Notes column

## Quality Invariants (enforced by CI)

These will be checked mechanically once CI is set up:

- [ ] Dependency direction lint passes (no forbidden imports)
- [ ] No `any` types in `src/core/` or `src/shared/`
- [ ] No `exec()` calls anywhere (only `execFile`/`spawn`)
- [ ] No API key patterns in log output
- [ ] All `src/core/` modules have corresponding `.test.ts` files
- [ ] All IPC channels have type definitions
