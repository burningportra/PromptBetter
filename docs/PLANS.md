# Execution Plans — PromptBetter

> How we plan, track, and complete non-trivial work in this repo.
> Inspired by [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/) and
> [Codex Execution Plans](https://cookbook.openai.com/articles/codex_exec_plans).

## When to Create a Plan

Create an execution plan when:
- The change touches > 1 file
- The change introduces a new feature or module
- The change refactors existing architecture
- The change has dependencies on other work
- You're unsure about the approach and want to document your reasoning

**Don't create a plan for:** single-file bug fixes, typo corrections, dependency updates.

## Plan Template

Create a new file: `docs/exec-plans/active/<slug>.md`

```markdown
# Plan: <Short Title>

**Status:** Active | Blocked | Complete
**Author:** <agent or human>
**Created:** <date>
**GitHub Issue:** #<number>

## Goal
One sentence: what does success look like?

## Context
Why is this needed? Link to relevant docs, issues, or prior plans.

## Approach
Numbered steps. Each step should be independently verifiable.

1. Step one — what it does, which files it touches
2. Step two — ...
3. ...

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Decision Log
Record decisions made during execution. Format: `YYYY-MM-DD: <decision>`

## Progress
- [ ] Step 1 — not started
- [ ] Step 2 — not started
```

## Lifecycle

```
docs/exec-plans/active/<slug>.md    ← work in progress
    │
    │  (all acceptance criteria met)
    ▼
docs/exec-plans/completed/<slug>.md ← archived with final decision log
```

1. **Create** in `active/` when starting work
2. **Update progress** as steps complete — commit alongside code changes
3. **Log decisions** that deviate from the original approach
4. **Move to `completed/`** when all acceptance criteria are met
5. **Reference the plan** in your PR description

## Examples

### Good Plan Titles
- `implement-secret-detection-engine`
- `split-settings-panel-p0-p1`
- `add-zustand-electron-store-sync`
- `refactor-tmux-dispatch-security`

### Good Acceptance Criteria
- "Unit tests pass with > 90% coverage on `core/secrets.ts`"
- "Secret warning blocks Improve button until acknowledged"
- "API key never appears in log files (verified by grep)"
- "Warm toggle latency < 200ms (benchmark passing)"

### Bad Acceptance Criteria
- "Code works" (not verifiable)
- "Looks good" (subjective)
- "Tests pass" (which tests?)

## Relationship to GitHub Issues

Execution plans and GitHub issues serve different purposes:

| | GitHub Issue | Execution Plan |
|--|-------------|---------------|
| **Purpose** | What needs to be done | How it will be done |
| **Audience** | Project management | Agent executing the work |
| **Lifespan** | Open → Closed | Active → Completed |
| **Detail level** | Requirements + acceptance criteria | Step-by-step approach + decisions |

A single GitHub issue may have one execution plan, or a complex issue may be broken into multiple plans. Reference both directions:
- Issue body: "Execution plan: `docs/exec-plans/active/foo.md`"
- Plan header: "GitHub Issue: #42"
