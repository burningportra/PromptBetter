# Design System — PromptBetter

> UI conventions, component patterns, and visual design rules.
> Read this before building or modifying any UI component.

## Design Philosophy

PromptBetter is a **tool, not a destination.** It should feel like a keyboard shortcut that happens to have a UI — fast, focused, forgettable. The user's attention belongs to their code, not to us.

- **Compact over spacious.** Every pixel must justify itself.
- **Keyboard-first.** Every action reachable without the mouse.
- **One feedback line at a time.** No stacking, no overflow. Priority order: secret warning > quality score > anti-pattern tip.
- **Surgical animation.** Only to clarify cause/effect. Honor `prefers-reduced-motion`.

## Panel Dimensions

| Mode | Width | Height | Position |
|------|-------|--------|----------|
| Floating | 600px | 520px (resizable) | Center of screen, always-on-top |
| Pinned | 600px+ | Resizable | Standard window, tabs visible |

## Color System

Use Tailwind's `class` strategy for dark mode. All components MUST support both themes.

| Role | Light | Dark | Usage |
|------|-------|------|-------|
| Background | `bg-white` | `bg-gray-900` | Panel background |
| Surface | `bg-gray-50` | `bg-gray-800` | Input/output fields |
| Text primary | `text-gray-900` | `text-gray-100` | Body text |
| Text secondary | `text-gray-500` | `text-gray-400` | Labels, hints |
| Accent | `text-blue-600` | `text-blue-400` | Links, active states |
| Success | `text-green-600` | `text-green-400` | Diff additions, git indicator |
| Warning | `text-amber-600` | `text-amber-400` | Secret detection banner |
| Error | `text-red-600` | `text-red-400` | Error messages |
| Score red | `text-red-500` | `text-red-400` | Score 1-3 |
| Score yellow | `text-amber-500` | `text-amber-400` | Score 4-6 |
| Score green | `text-green-500` | `text-green-400` | Score 7-10 |

## Typography

- **Font:** System font stack (`font-sans` in Tailwind)
- **Monospace:** For code, scores, patterns — use `font-mono` (Geist Mono if available)
- **Tabular numbers:** `font-variant-numeric: tabular-nums` for scores and counters
- **Input fields:** `text-sm` (14px) minimum — never below 16px on mobile
- **Labels:** `text-xs` (12px) in `text-gray-500`

## Component Patterns

### Feedback Line (below input)
One line at a time. Priority order:
1. **Secret warning** (red) — replaces all other feedback. Blocks buttons.
2. **Quality score** — `Score: 6/10 • missing: verification, context`
3. **Anti-pattern tip** (gray) — dismissable, one at a time

### Buttons
- **Primary:** `Improve (⌘↵)` — blue, prominent
- **Secondary:** `Improve & Send (⌘⇧↵)` — outline
- **Disabled state:** Gray, shows spinner during loading or countdown during rate limit
- **Loading:** Show spinner + keep original label (never replace text with "Loading...")
- Hit target ≥ 24px

### Dropdowns
- **Preset dropdown:** Top-left. Shows last-used on open. Updates on slash command.
- **Model dropdown:** Top-right. Persists selection.
- **Session dropdown:** Bottom-left. Refresh button (🔄). Claude Code panes highlighted.

### Diff View
- Additions: green background + green text
- Deletions: red strikethrough (rare — improvements are additive)
- Toggle: `[Diff ↔ Plain]` button near output field
- Auto-disables when user edits output (baseline no longer meaningful)

### Annotations
- Below output field, above action bar
- Pattern names as subtle badges
- Rationale as one-line gray text
- Intent + confidence as small badge

## Accessibility

- Visible focus rings (`:focus-visible`)
- `aria-label` on all icon-only buttons
- `aria-live="polite"` on feedback line and toasts
- Skip to content link
- Keyboard navigation for all interactive elements
- Non-breaking spaces in keyboard shortcut labels: `⌘&nbsp;+&nbsp;Enter`

## Animation Rules

- Honor `prefers-reduced-motion` — provide reduced variant
- Animate only `transform` and `opacity` (compositor-friendly)
- Panel show/hide: 150ms ease-out (or instant if reduced motion)
- Loading spinner: CSS animation, not JS
- No autoplay animations
