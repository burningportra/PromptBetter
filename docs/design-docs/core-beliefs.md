# Core Beliefs — PromptBetter

> Golden principles that apply to every line of code in this repository.
> These are taste invariants — they don't change with features or priorities.
> Violations are treated as bugs.

## 1. The User's Flow Is Sacred

PromptBetter exists to save developer time. Every interaction must be faster than the alternative (manually writing a better prompt). If any path takes longer than doing it by hand, the feature has failed.

- **< 5 seconds end-to-end** for the power user flow (hotkey → type → send)
- **< 200ms warm toggle** — the panel must feel instant
- **Zero mandatory clicks** — keyboard-only flow is always available
- **Auto-hide returns focus** — the user's previous app is active again immediately

## 2. Additive Only

Never remove intent from the user's prompt. Never rewrite what they said. The output sounds like a better version of what they wrote, not a replacement.

- Every added word must earn its place
- Skip patterns the user already covers
- No padding, no filler, no meta-commentary
- If no patterns apply, return the original unchanged

## 3. Parse at the Boundary, Trust Inside

All external data is validated at entry points. Internal code assumes valid shapes.

- IPC messages: validate in the handler before dispatching
- API responses: parse and validate before returning to caller
- User input: validate length, slash commands, secrets at the UI boundary
- electron-store: schema version checked on load; missing fields get defaults
- tmux session names: regex-validated before use in any command

After validation, internal functions receive typed data and don't re-validate.

## 4. Security Is Not Optional

Some rules have no exceptions:

- **API keys live in keytar only.** Never in plaintext, never in logs, never in electron-store.
- **Secret detection is always on.** No user toggle. No bypass. No "trust me" mode.
- **Shell commands use array args.** `execFile`/`spawn` only. Never `exec()` with string interpolation.
- **Session names are allowlisted.** `^[a-zA-Z0-9._-]+$` — anything else is rejected.
- **Prompt content never touches a shell.** Piped via stdin to `tmux load-buffer -`.
- **Context isolation enabled.** Renderer cannot access Node.js. Period.

## 5. Prefer Boring Dependencies

Choose composable, stable, well-documented libraries over clever ones. When a dependency is opaque or poorly documented, consider reimplementing the subset we need.

- **Good:** electron-store, keytar, clipboardy, diff-match-patch, commander
- **Bad:** Mega-frameworks with hidden behavior, auto-magic that breaks debugging
- If you can't explain what a dependency does in one sentence, don't add it

## 6. One LLM Call Is the Budget

The core improvement flow uses exactly one LLM call. Classification and improvement happen in a single pass. This is non-negotiable for the < 3s response time target.

- Auto-detect mode: one call (classify + improve)
- Preset mode: one call (skip classification, inject preset patterns)
- Terminal context and git diff are context injected into that same call
- Decomposition is the only feature that adds extra calls (P2, with cost warning)

## 7. Fail Gracefully, Always Forward

Every error has a recovery path. The user is never stuck.

- tmux fails → clipboard fallback
- API fails → retry button + friendly message
- Network offline → clear message + retry when online
- Session gone → auto-fallback + refresh list
- No API key → banner with setup link
- Never show raw error messages, stack traces, or HTTP status codes to users

## 8. Repository Is the Source of Truth

Inspired by [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/):

- Everything an agent needs to work lives in this repo as versioned artifacts
- Design decisions are documented in `docs/design-docs/`, not in Slack or Google Docs
- Execution plans are first-class: `docs/exec-plans/active/` and `completed/`
- Architecture rules are enforced mechanically (lint rules, structural tests)
- AGENTS.md is the table of contents, not the encyclopedia
- If a rule matters, encode it in a linter — documentation alone drifts

## 9. Agent-Generated Code Is the Default

- Agents write the code; humans direct the work
- When a task fails, ask: "what capability is missing for the agent?" — not "try harder"
- Human taste is fed back as doc updates or lint rules, not one-off fixes
- Technical debt is paid continuously (garbage collection), not in painful bursts
- Quality grades track drift over time (`docs/QUALITY_SCORE.md`)

## 10. Transparency Builds Trust

Users should understand what PromptBetter did and why:

- Annotation mode shows which patterns were applied and the rationale
- Quality score explains what's missing, not just a number
- Anti-pattern tips explain the better alternative
- Diff view shows exactly what was added
- Secret detection explains what was found
- The user can always edit the output before sending
