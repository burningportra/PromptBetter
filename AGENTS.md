# AGENTS.md — PromptBetter

> This file is the **table of contents** for agents working in this repository.
> It is intentionally short (~100 lines). Do NOT expand it into a manual.
> Deep context lives in the linked docs below — read them when relevant to your task.

## What Is This?

PromptBetter is a lightweight Electron floating panel that improves AI coding prompts via pattern injection. Global hotkey → type prompt → LLM improves it → dispatch to tmux or clipboard.

## Repository Layout

```
src/
├── main/           # Electron main process (Node.js) — window, IPC, tmux, keytar
├── renderer/       # React frontend (Chromium) — UI components, Zustand stores, hooks
├── core/           # Shared engine (used by both Electron + CLI) — improve, score, secrets
├── shared/         # Types, constants, pattern definitions — imported by all layers
├── cli/            # CLI entry point (pb command) — thin wrapper over core/
└── preload/        # Electron preload script — context bridge, IPC surface
```

## Dependency Rules (STRICT — enforced by linter)

```
shared/     → imports nothing
core/       → imports shared/ only
main/       → imports shared/, core/
renderer/   → imports shared/, core/ (pure logic only — no Node.js)
cli/        → imports shared/, core/
preload/    → imports shared/ only
```

**Never:** `renderer/ → main/` (use IPC), `core/ → main/` (core is shared), `shared/ → anything`

## Key Docs (progressive disclosure)

| When you need...                        | Read                                                    |
|-----------------------------------------|---------------------------------------------------------|
| System architecture, domain map, layers | [ARCHITECTURE.md](ARCHITECTURE.md)                      |
| Product requirements, user stories      | [docs/product-specs/](docs/product-specs/)               |
| Technical specification, all APIs       | [docs/design-docs/technical-specification.md](docs/design-docs/technical-specification.md) |
| Design taste, golden principles         | [docs/design-docs/core-beliefs.md](docs/design-docs/core-beliefs.md) |
| UI/design system conventions            | [docs/DESIGN.md](docs/DESIGN.md)                        |
| React/renderer patterns                 | [docs/FRONTEND.md](docs/FRONTEND.md)                    |
| Security rules (non-negotiable)         | [docs/SECURITY.md](docs/SECURITY.md)                    |
| Performance targets, reliability        | [docs/RELIABILITY.md](docs/RELIABILITY.md)               |
| Quality grades per domain               | [docs/QUALITY_SCORE.md](docs/QUALITY_SCORE.md)           |
| Current execution plans                 | [docs/exec-plans/active/](docs/exec-plans/active/)       |
| Completed plans and decisions           | [docs/exec-plans/completed/](docs/exec-plans/completed/) |

## Before You Write Code

1. **Check the dependency rules above.** Violations are the #1 source of rejected PRs.
2. **Read `ARCHITECTURE.md`** to understand which layer your change belongs in.
3. **Read `docs/SECURITY.md`** if your change touches: API keys, shell commands, IPC, user input, network calls.
4. **Read `docs/design-docs/core-beliefs.md`** for taste invariants that apply to all code.
5. **Check `docs/exec-plans/active/`** for any in-progress plans that affect your area.

## Conventions

- **TypeScript strict mode.** No `any`, no `as` casts except at validated boundaries.
- **Parse at the boundary, trust inside.** Validate all IPC messages, API responses, and user input at entry points. Internal code assumes valid shapes.
- **Prefer boring dependencies.** Composable, stable APIs over clever abstractions. Reimplement small utilities rather than importing opaque packages.
- **Every `execFile`/`spawn` call uses array args.** Never `exec()` with string interpolation. See `docs/SECURITY.md`.
- **Tests live next to source.** `foo.ts` → `foo.test.ts`. Use Vitest.
- **No manual code in PRs without justification.** Agent-generated code is the default. If you hand-write something, explain why in the PR description.

## How to Run

```bash
npm install          # install deps
npm run dev          # start Electron in dev mode
npm test             # run Vitest
npm run build        # produce .dmg
npm run lint         # check dependency rules + style
```

## Execution Plans

For non-trivial changes (> 1 file, new feature, refactor), create an execution plan:
1. Create `docs/exec-plans/active/<slug>.md` with goal, approach, and acceptance criteria
2. Reference the plan in your PR description
3. Move to `docs/exec-plans/completed/` when merged

See [docs/PLANS.md](docs/PLANS.md) for the plan template and examples.
