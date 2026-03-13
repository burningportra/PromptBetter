# PromptBetter Product Requirements Document

**Version:** 3.0  
**Status:** Draft  
**Last Updated:** March 2026

---

## 1. Executive Summary

### 1.1 Problem Statement

Developers using AI coding agents like Claude Code write hundreds of prompts weekly, but most prompts under-signal their true intent. A prompt like "check the code for bugs" conveys only a fraction of what the developer actually wants: a thorough, methodical review with fresh eyes, verifying changes compile and tests pass. This gap between intent and signal is the #1 source of mediocre AI agent sessions.

The cognitive overhead of crafting detailed, signal-rich prompts competes with actual development work, causing developers to default to brief, ambiguous prompts that produce suboptimal results. Over time, this creates a vicious cycle: brief prompts → mediocre output → developer blames the AI → never learns what good prompting looks like.

### 1.2 Solution Overview

PromptBetter is a lightweight floating panel desktop application activated by a global hotkey (Cmd+Shift+P). Users type their rough prompt, and PromptBetter sends it to a fast/cheap LLM via OpenRouter which:
1. Classifies the intent (code review, planning, debugging, etc.)
2. Injects 2-4 relevant prompting patterns surgically
3. Returns an improved prompt that preserves the user's voice

The improved prompt appears in an **editable output field** — the user can review, tweak, then dispatch directly into a running Claude Code tmux session or copy to clipboard.

### 1.3 Design Principles

| Principle | Description |
|-----------|-------------|
| **< 5 seconds end-to-end** | From hotkey to dispatched prompt, the entire interaction should take under 5 seconds for power users |
| **Additive only** | Never remove intent from the original prompt. Every added word must earn its place |
| **Preserve the user's voice** | The output should sound like a better version of what they wrote, not a rewrite |
| **Zero-friction workflow** | Quick Mode: hotkey → type → Cmd+Shift+Enter → auto-hide. No extra clicks required |
| **Trust through transparency** | Annotation mode teaches users which patterns were applied and why |
| **Local-first security** | All data stays on the user's machine. API keys in the system keychain, never in plaintext |

---

## 2. User & Business Goals

### 2.1 User Goals

| Goal | Priority | Description |
|------|----------|-------------|
| **Improve prompt quality** | P0 | Get better AI agent outputs without spending time crafting detailed prompts |
| **Reduce cognitive overhead** | P0 | Enhance prompts with one keyboard shortcut, not manual effort |
| **< 5 second workflow** | P0 | Hotkey → type → send, entire interaction under 5 seconds for power users |
| **Learn prompting patterns** | P1 | Understand which patterns improve outputs through annotation mode; internalize patterns over time |
| **Quick workflow integration** | P1 | Send improved prompts directly to tmux sessions without copy-paste |
| **Review before sending** | P1 | See and edit the improved prompt before it's dispatched |
| **Save frequently used patterns** | P2 | Create custom presets for recurring task types |

### 2.2 Business Goals

| Goal | Priority | Description |
|------|----------|-------------|
| **Demonstrate product value** | P0 | Show measurable improvement in AI agent session quality |
| **Build developer trust** | P0 | Reliability, security (API key in keychain), no data exfiltration, no telemetry in V1 |
| **Establish pattern education** | P1 | Position PromptBetter as the tool that teaches developers to prompt better; measure pattern internalization over time |
| **Drive adoption** | P2 | Word-of-mouth from power users, GitHub stars, developer community |
| **Create expansion path** | P2 | V1 proves value → V2 opens team sharing, analytics, Claude Code hook integration |

### 2.3 Non-Goals

| Non-Goal | Reason |
|----------|--------|
| **Full IDE integration** | V1 focuses on floating panel; IDE plugins are V2 |
| **Cloud sync** | All data stays local for security and simplicity |
| **Multiple LLM providers** | V1 uses OpenRouter only; direct provider support is V2 |
| **Prompt versioning/Git** | Overcomplicates V1; may add in future |
| **Team collaboration features** | Out of scope for individual developer tool |
| **Mobile support** | Desktop-only product for now |
| **Telemetry/analytics** | No data transmitted externally in V1; trust-first approach. Success metrics (Section 6) are tracked via local-only counters stored in electron-store. No network transmission of usage data. |
| **Claude Code hook integration** | Promising but V2; V1 uses tmux dispatch as the proven path |

---

## 3. User Stories

### 3.1 Core User Stories

**Story 1: Quick Prompt Enhancement**
> As a developer, I want to enhance a rough prompt with one keyboard shortcut, so that I can improve my AI agent's output quality without interrupting my flow.

**Story 2: Direct tmux Dispatch**
> As a developer using Claude Code in tmux, I want to send improved prompts directly to my active session, so that I don't have to copy-paste between windows.

**Story 3: Intent Auto-Detection**
> As a developer, I want the system to automatically detect my prompt's intent, so that I don't have to manually select the right category.

**Story 4: Pattern Learning**
> As a developer, I want to see which patterns were applied and why, so that I can learn to write better prompts over time.

**Story 5: History Search**
> As a developer, I want to search and reuse past improved prompts, so that I can quickly access prompts for similar tasks.

**Story 6: Quick Mode (Power User Flow)**
> As a power user, I want to hit a hotkey, type my prompt, press Cmd+Shift+Enter, and have the window auto-hide after sending, so that the entire interaction takes less than 5 seconds.

**Story 7: Editable Output**
> As a developer, I want to review and edit the improved prompt before dispatching it, so that the version sent to my terminal is exactly what I want (not just the raw AI improvement).

**Story 8: Custom Presets**
> As a developer with recurring workflows, I want to create and save custom presets, so that I can apply my preferred pattern combinations instantly.

**Story 9: Secure API Storage**
> As a security-conscious developer, I want my API key stored in the system keychain, so that it's not stored in plain text.

### 3.2 Edge Case User Stories

**Story 10: Clipboard Fallback**
> As a developer without tmux running, I want improved prompts copied to my clipboard automatically, so that I can still use the tool.

**Story 11: Offline Handling**
> As a developer with intermittent connectivity, I want clear error messages when offline, so that I understand why enhancement isn't working.

**Story 12: Pin for Browsing**
> As a developer reviewing history, I want to pin the panel as a persistent window, so that I can browse history and settings without re-opening each time.

**Story 13: Smart Session Detection**
> As a developer running multiple tmux sessions, I want PromptBetter to auto-detect which pane is running Claude Code, so that I don't have to manually configure the target session.

**Story 14: Focus Return**
> As a developer in the middle of coding, I want focus to return to my previous application after I hide the panel, so that I can immediately continue working.

### 3.3 Power Feature User Stories

**Story 15: Terminal History Context**
> As a developer sending follow-up prompts, I want PromptBetter to automatically read the last 50 lines from my tmux pane so that my prompts like "fix that error" become fully contextualized with the actual error message, stack trace, and agent output.

**Story 16: Prompt Diff View**
> As a developer learning to prompt better, I want to see a visual diff between my raw prompt and the improved version (additions highlighted in green) so that I can see exactly what was added and where, not just which pattern names were applied.

**Story 17: Slash Commands**
> As a power user, I want to type `/review check the auth flow` or `/debug the login is broken` to instantly activate a preset without touching the dropdown, so that I never need the mouse.

**Story 18: Git Diff Auto-Injection**
> As a developer asking for a code review, I want PromptBetter to automatically attach my current `git diff` when it detects a code-review or debugging intent, so that the agent receives the actual code changes without me copying anything.

**Story 19: Prompt Quality Score**
> As a developer, I want to see a live 1–10 quality score for my raw prompt with specific gap analysis (e.g., "missing scope, no verification step") before I even hit improve, so that I can learn to write better prompts and see the value PromptBetter adds.

**Story 20: CLI / Pipe Mode**
> As a terminal-native developer, I want to run `pb "fix the login bug"` or `echo "fix bug" | pb` from my shell without opening the Electron GUI, so that PromptBetter fits into my existing toolchain and shell aliases.

**Story 21: Prompt Decomposition**
> As a developer with a complex multi-part request, I want PromptBetter to offer to break my prompt into a sequence of focused sub-prompts that can be dispatched one after another, so that the agent doesn't get confused by sprawling, multi-intent prompts.

**Story 22: Secret Detection**
> As a security-conscious developer who pastes error logs and config files, I want PromptBetter to scan my prompt for accidentally included API keys, passwords, and tokens before sending to OpenRouter, so that I don't leak secrets to a third-party API.

**Story 23: Anti-Pattern Coaching**
> As a developer building prompting skills, I want to see inline coaching tips when I use weak patterns (e.g., "please can you..." or "make it good") so that I learn better habits at the moment of writing.

**Story 24: Effectiveness Feedback Loop**
> As a developer who wants PromptBetter to get smarter over time, I want to rate whether the agent's response was good or bad after dispatching, so that PromptBetter learns which patterns work best for my specific tasks and style.

---

## 4. Prioritized Requirements

### 4.1 P0 (Must Have)

| ID | Requirement | Description |
|----|-------------|-------------|
| P0-1 | Global hotkey activation | Cmd+Shift+P toggles floating panel from any application; warm toggle (hide/show) within 200ms; cold start (first activation after launch) within 500ms |
| P0-2 | Prompt input field | Multi-line text input; auto-focus on panel open; supports paste |
| P0-3 | Prompt improvement API | Send prompt to OpenRouter, receive enhanced prompt; handles errors gracefully |
| P0-4 | Intent classification | LLM classifies prompt intent (8 categories) |
| P0-5 | Pattern injection | System injects 2-4 relevant patterns based on intent |
| P0-6 | Editable output field | Improved prompt displayed in editable field; edited version is what gets dispatched |
| P0-7 | tmux session discovery | List available tmux sessions in dropdown; refresh button to re-scan |
| P0-8 | tmux prompt dispatch | Send improved prompt to selected tmux session via set-buffer + paste-buffer |
| P0-9 | Clipboard fallback | Copy to clipboard when tmux unavailable; show toast confirmation |
| P0-10 | Secure API key storage | Store API key in system keychain via keytar; never in plaintext files |
| P0-11 | Model selection | Dropdown to select OpenRouter model; persists selection across sessions |
| P0-12 | Basic history | Store original + improved prompt pairs locally with timestamp and intent |
| P0-13 | Settings panel | Configure API key, model, terminal mode, tmux session |
| P0-14 | Keyboard shortcuts | Cmd+Enter to improve; Cmd+Shift+Enter to improve + send; Escape to hide |
| P0-15 | Secret detection | Scan prompts for API keys, passwords, tokens before sending to OpenRouter; warn and block send until acknowledged |
| P0-16 | Slash commands | `/review`, `/debug`, `/plan`, etc. as instant preset shortcuts; prefix stripped before improvement |
| P0-17 | Auto-detect mode | LLM classifies intent and selects 2–4 patterns in a single call (default mode); this is how the system works without presets |
| P0-18 | Built-in presets | 9 presets (Auto-detect + 8 intent-based: Code Review, Debugging, Planning, Implementation, Exploration, Refactoring, Documentation, Research) selectable from dropdown; required by slash commands (P0-16) |

### 4.2 P1 (Should Have)

| ID | Requirement | Description |
|----|-------------|-------------|
| P1-1 | Dark/light theme | Theme toggle; respects system preference by default |
| P1-2 | History search & filter | Search past prompts by keyword; filter by intent type and date range |
| P1-3 | Custom presets | User can create, name, save, and delete custom pattern combinations |
| P1-4 | Annotation mode toggle | Inline display showing which patterns applied and one-line rationale below output |
| P1-5 | Export/import presets | Share presets via JSON file |
| P1-6 | Pin to window | Convert floating panel to persistent window with tabs |
| P1-7 | Tab navigation | Switch between Improve, History, Presets, Settings |
| P1-8 | Smart session detection | Auto-detect tmux panes running Claude Code by inspecting `pane_current_command` |
| P1-9 | Auto-hide after send | Panel hides automatically after successful dispatch (Quick Mode); focus returns to previous app |
| P1-10 | Streaming output | Show streaming output from LLM if model supports it for perceived performance |
| P1-11 | Terminal history context | Read last 50 lines from target tmux pane via `capture-pane`; feed as context to improvement LLM for follow-up awareness |
| P1-12 | Prompt diff view | Visual inline diff between raw and improved prompt; additions highlighted in green; more educational than annotation mode |
| P1-13 | Prompt quality score | Live 1–10 score for raw prompt with gap analysis ("missing scope, no verification"); updates as user types |
| P1-14 | Anti-pattern coaching | Real-time inline tips when weak patterns detected ("please can you...", "make it good"); dismissable per-pattern |

### 4.3 P2 (Nice to Have)

| ID | Requirement | Description |
|----|-------------|-------------|
| P2-1 | History pagination | Handle 1000+ history entries smoothly; oldest pruned on overflow |
| P2-2 | Start at login | Option to launch on system startup |
| P2-3 | Menu bar icon | Show icon in system tray/menu bar |
| P2-4 | Custom hotkey configuration | Allow users to rebind all shortcuts; detect conflicts on first run |
| P2-5 | Offline rule-based fallback | When OpenRouter is down, apply patterns via local keyword classifier + fallback matrix (degraded quality, but functional) |
| P2-6 | Remember panel position | Panel remembers last position instead of always centering |
| P2-7 | Git diff auto-injection | Auto-attach `git diff` summary when intent is code-review or debugging; detect project root from tmux pane path |
| P2-8 | CLI / pipe mode | `pb "fix the bug"` from terminal; reads stdin, writes stdout; shares core engine with Electron app; supports `--preset` and `--send` flags |
| P2-9 | Prompt decomposition | Detect multi-intent prompts; offer to split into focused sequential sub-prompts with individual pattern injection and dispatch buttons |
| P2-10 | Effectiveness feedback loop | After dispatch, show system notification for thumbs up/down rating; store aggregated feedback separately from history; use to inform V2 adaptive pattern weights |

---

## 5. Acceptance Criteria

### 5.1 Core Functionality

**AC-1: Global Hotkey**
```
GIVEN the PromptBetter application is running
WHEN the user presses Cmd+Shift+P from any application
THEN the floating panel appears centered on screen (warm toggle within 200ms; cold start within 500ms)
AND the input field is focused and ready for typing
AND the preset selector shows the last-used preset (default: Auto-detect)
```

**AC-2: Prompt Improvement**
```
GIVEN the user has entered a prompt in the input field
AND the user has configured an OpenRouter API key
WHEN the user presses Cmd+Enter
THEN the system sends the prompt to OpenRouter
AND the improved prompt appears in the editable output field within 3 seconds
AND the original and improved prompts are saved to history
```

**AC-3: Intent Classification**
```
GIVEN the user enters a prompt containing "fix the login bug"
WHEN the prompt is processed
THEN the system classifies the intent as "debugging"
AND the confidence score is captured
AND relevant patterns are selected based on debugging intent
```

**AC-4: Pattern Injection**
```
GIVEN the user enters "check my code for issues"
WHEN the prompt is improved
THEN the output contains intensity calibration signal
AND the output contains fresh eyes signal
AND the user's original phrasing is preserved
AND no more than 4 patterns are injected
```

**AC-5: Editable Output**
```
GIVEN the output field contains an improved prompt
WHEN the user edits the text in the output field
THEN the edited version is what gets dispatched (not the original improvement)
AND the edited version is what gets saved to history
```

**AC-5b: tmux Dispatch**
```
GIVEN the user has selected a tmux session from the dropdown
WHEN the user presses Cmd+Shift+Enter
THEN the improved (or edited) prompt is sent to the selected tmux session
AND the prompt appears in the tmux session and is executed
AND a success indicator is shown
```

**AC-6: Clipboard Fallback**
```
GIVEN no tmux session is available or tmux dispatch fails
WHEN the user attempts to send
THEN the improved prompt is copied to system clipboard
AND a "Copied to clipboard — paste into your terminal" toast is shown
```

**AC-6b: Auto-Hide After Send (Quick Mode)**
```
GIVEN the user presses Cmd+Shift+Enter (improve + send)
WHEN the dispatch succeeds (tmux or clipboard)
THEN the panel hides automatically
AND focus returns to the previously active application
```

**AC-6c: Focus Return**
```
GIVEN the floating panel is visible
WHEN the user presses Escape or the panel auto-hides
THEN focus returns to the application that was active before the panel appeared
```

**AC-7: API Key Security**
```
GIVEN the user enters their OpenRouter API key in settings
WHEN the key is saved
THEN the key is stored in the system keychain
AND the key is never stored in plain text files
AND the key is retrieved securely on application startup
```

### 5.2 Presets & Modes

**AC-8: Auto-Detect Mode**
```
GIVEN the mode dropdown is set to "Auto-detect"
WHEN a prompt is submitted
THEN the LLM determines the intent
AND the LLM selects the most relevant patterns
AND patterns are applied automatically
```

**AC-9: Built-in Presets**
```
GIVEN the user selects "Code Review" from the preset dropdown
WHEN prompts are submitted
THEN only the patterns defined in that preset are applied (no auto-detection)
AND the intent is forced to code-review
AND the preset selection persists across sessions
```

**AC-10: Custom Presets**
```
GIVEN the user creates a new preset named "Security Audit"
AND selects patterns: intensity-calibration, scope-control
WHEN the preset is saved
THEN it appears in the custom presets list
AND selecting it applies those patterns to all prompts
```

**AC-11: Annotation Mode**
```
GIVEN annotation mode is enabled
WHEN a prompt is improved
THEN the output includes "---"
AND pattern names are listed
AND a one-line rationale is included
```

### 5.3 History & Persistence

**AC-12: History Storage**
```
GIVEN the user has submitted 10 prompts
WHEN they view the history panel
THEN all 10 original/improved pairs are displayed
AND each entry shows timestamp and intent
AND entries are sorted by most recent first
```

**AC-13: History Search**
```
GIVEN the history contains 50 entries
WHEN the user types "login" in search
THEN only entries containing "login" (across original and improved prompts) are shown
AND results update as the user types
AND results can be filtered by intent type and date range
```

**AC-14: History Reload**
```
GIVEN the user clicks on a history entry
WHEN clicked
THEN the original prompt loads into the input field
AND the improved prompt loads into the output field
AND the user can edit and resubmit
```

**AC-14b: History Pruning**
```
GIVEN history exceeds 1,000 entries
WHEN a new entry is added
THEN the oldest entry is pruned automatically
AND the user is never interrupted by this process
```

### 5.4 Window Behavior

**AC-15: Pin to Window**
```
GIVEN the floating panel is displayed
WHEN the user clicks the pin button
THEN the panel converts to a standard window
AND tabs become visible (Improve, History, Presets, Settings)
AND the window persists until explicitly closed
AND pinned mode disables auto-hide after send
```

**AC-16: Escape to Hide**
```
GIVEN the floating panel is displayed
WHEN the user presses Escape
THEN the panel hides
AND focus returns to the previously active application
AND the panel can be re-opened with Cmd+Shift+P
```

**AC-16b: Smart Session Detection**
```
GIVEN tmux is running with multiple sessions/panes
WHEN the session dropdown is populated
THEN panes running Claude Code are detected by inspecting pane_current_command
AND Claude Code sessions are highlighted or auto-selected
AND a refresh button re-scans for new sessions
```

### 5.5 Power Features

**AC-20: Secret Detection**
```
GIVEN the user types or pastes text containing a pattern matching an API key (AKIA..., ghp_..., sk-..., etc.)
WHEN the secret pattern is detected
THEN a warning banner appears: "Your prompt contains what looks like an API key"
AND the Improve/Send buttons are disabled until the user acknowledges or removes the secret
AND the detection runs in real-time as the user types (debounced)
```

**AC-21: Slash Commands**
```
GIVEN the user types "/review check the auth flow" in the input field
WHEN the prompt is submitted
THEN the "/review" prefix activates the Code Review preset
AND the prefix is stripped from the prompt before improvement
AND the preset dropdown updates to reflect the slash command selection
```

**AC-22: Terminal History Context**
```
GIVEN a tmux session is selected and terminal context is enabled
WHEN the user submits a prompt for improvement
THEN the last 50 lines from the target tmux pane are captured via tmux capture-pane
AND the terminal context is fed to the improvement LLM alongside the user's prompt
AND follow-up prompts like "fix that error" are contextualized with the actual error from the terminal
```

**AC-23: Prompt Diff View**
```
GIVEN a prompt has been improved
WHEN the user toggles diff view (or it is enabled by default)
THEN the output field shows a visual inline diff
AND additions (injected patterns) are highlighted in green
AND the original text is shown unchanged
AND the user can toggle between diff view and plain text view
```

**AC-24: Prompt Quality Score**
```
GIVEN the user is typing in the input field
WHEN the input contains at least 5 characters
THEN a quality score (1–10) appears near the input field
AND the score updates live as the user types (debounced 300ms)
AND a brief gap analysis shows what's missing (e.g., "missing: scope, verification")
AND the score increases when the user addresses the gaps
```

**AC-25: Anti-Pattern Coaching**
```
GIVEN the user types a known weak pattern (e.g., "please can you", "I want you to", "make it good")
WHEN the pattern is detected
THEN a subtle inline tip appears below the input (e.g., "Tip: Direct instructions perform better than requests")
AND the tip is dismissable
AND dismissed tips respect a "don't show again" preference per anti-pattern
```

**AC-26: Git Diff Auto-Injection**
```
GIVEN the detected intent is code-review or debugging
AND a git repository is detected in the target tmux pane's working directory
WHEN the prompt is submitted for improvement
THEN the current git diff (or staged diff) is summarized and injected into the context
AND the user sees an indicator that git context was included
AND the injection is truncated to stay within token budget
```

**AC-27: CLI / Pipe Mode**
```
GIVEN the user runs `pb "fix the login bug"` from their terminal
WHEN the command executes
THEN the prompt is improved using the same engine as the Electron app
AND the improved prompt is written to stdout
AND flags --preset, --send, and --score are supported
AND stdin is accepted for piping: echo "fix bug" | pb
```

**AC-28: Prompt Decomposition**
```
GIVEN the user enters a prompt with multiple intents (e.g., "redesign auth, update routes, add tests, update docs")
WHEN multi-intent complexity is detected
THEN a prompt appears: "This covers 4 tasks. Break into focused steps?"
AND accepting shows a numbered queue of sub-prompts
AND each sub-prompt has its own pattern injection and individual Send button
AND the user can edit, reorder, or dismiss individual sub-prompts
```

**AC-29: Effectiveness Feedback Loop**
```
GIVEN a prompt was dispatched (tmux or clipboard)
WHEN 30 seconds have elapsed
THEN a system notification appears: "How was the result?" with thumbs up/down
AND the rating is stored in feedbackAggregates (keyed by intent:pattern, survives history pruning)
AND for tmux dispatches, agent output is captured for context
AND the notification auto-dismisses after 10 seconds if no interaction
```

### 5.6 Error Handling

**AC-17: Missing API Key**
```
GIVEN no API key is configured
WHEN the user attempts to improve a prompt
THEN an error message shows "Please add your OpenRouter API key"
AND a link to settings is provided
```

**AC-18: API Error**
```
GIVEN the OpenRouter API returns an error
WHEN the error is received
THEN the user sees a friendly error message
AND a retry button is available
AND the error details are logged
```

**AC-19: Network Offline**
```
GIVEN the user has no internet connection
WHEN they attempt to improve a prompt
THEN an error shows "No internet connection"
AND the user can retry when connectivity is restored
```

---

## 6. Success Metrics

### 6.1 Leading Indicators (Days to Weeks)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Activation rate** | 80% of installs improve at least 1 prompt on day 1 | Local usage counter |
| **Daily usage** | Power users improve 10+ prompts/day by week 2 | Local usage counter |
| **Time to dispatch** | < 5 seconds from hotkey to prompt sent | Timestamp logging |
| **Average response time** | < 3 seconds for API improvement call | Log API call duration |
| **Terminal dispatch rate** | 60%+ of dispatches use tmux (vs clipboard) | Dispatch mode counter |
| **tmux dispatch success** | > 95% success rate | Track successful vs failed dispatches |
| **Slash command adoption** | 30%+ of submissions use slash commands by week 3 | Track slash prefix usage |
| **Secret detection blocks** | 100% of detected secrets warned before send | Track detection events |
| **Quality score delta** | Average raw score < 5, average post-improve score > 7 | Track pre/post scores |

### 6.2 Lagging Indicators (Weeks to Months)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Weekly retention** | 70% at 4 weeks | App open events |
| **Perceived quality lift** | Users report better agent output in survey | Post-usage survey (NPS-style) |
| **Pattern internalization** | Users' raw prompts improve over 3 months (annotation frequency decreases as users learn) | History analysis of raw prompt quality over time |
| **Preset adoption** | > 30% use presets by month 2 | Track preset selection in submissions |
| **Custom preset creation** | > 15% create custom presets | Track custom preset count |
| **Anti-pattern reduction** | Users trigger 50% fewer coaching tips after 4 weeks | Track tip frequency per user over time |
| **Effectiveness feedback rate** | > 40% of dispatches receive a rating | Track feedback toast interactions |
| **Positive feedback ratio** | > 75% thumbs-up ratings | Track thumbs-up vs thumbs-down |
| **Community growth** | Preset sharing emerges organically | Feature requests / GitHub issues |

### 6.3 Quality Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| **Crash-free sessions** | > 99.5% | No unhandled exceptions |
| **Build success rate** | 100% | All builds produce valid .dmg |
| **Security incidents** | 0 | No API key exposures |
| **Panel appearance latency** | < 200ms | Time from hotkey to panel visible |

---

## 7. Open Questions

### 7.1 Technical Decisions

| Question | Options | Recommendation | Blocking? |
|----------|---------|----------------|----------|
| **Pattern selection algorithm** | Rule-based (matrix) vs LLM-determined | **Resolved:** Single LLM call handles classification + improvement. Keyword-based fallback matrix for offline mode (P2). See tech spec Section 2.2. | Non-blocking |
| **History storage limit** | Unlimited, 1000, 10000 entries | 1000 with pagination; oldest pruned on overflow. Feedback aggregates stored separately to survive pruning. | Non-blocking |
| **Log retention** | 1 week, 4 weeks, forever | 4 weeks, rotate weekly | Non-blocking |
| **Rate limiting strategy** | Per-user throttle, queue, error message | **Resolved:** Client-side token bucket (20 req/min, 1s min interval). Button shows countdown when limited. No queue. See tech spec Section 11.1b. | Non-blocking |
| **System prompt updates** | Bundled with app release vs OTA-updatable | Bundled for V1; OTA in V2 for faster iteration | Non-blocking |
| **Streaming support** | Full streaming vs wait-for-complete | Wait-for-complete in Alpha; streaming as P1 (Beta phase) | Non-blocking |
| **Windows tmux alternatives** | Windows Terminal + PowerShell, WSL tmux | WSL tmux only for V1. Clipboard fallback via `clipboardy` (cross-platform) is the primary dispatch path on Windows. PowerShell dispatch in V2. | Non-blocking |

### 7.2 UX Decisions

| Question | Options | Recommendation | Blocking? |
|----------|---------|----------------|----------|
| **Default panel position** | Center, remember last position | Center initially, remember position | Non-blocking |
| **Auto-detect vs manual** | Auto-detect default, manual default | Auto-detect default, manual available | Non-blocking |
| **History deletion** | Confirm each, confirm all, no confirm | Confirm all, no confirm individual | Non-blocking |
| **Annotation mode default** | On for new users (educational), off | **Resolved:** On by default. Auto-disables after 14 days (checked against `installedAt` timestamp in store schema). User can re-enable manually anytime. | Non-blocking |

### 7.3 Business Decisions

| Question | Options | Recommendation | Blocking? |
|----------|---------|----------------|----------|
| **Default model** | Haiku-class (speed) vs Sonnet-class (quality) | Haiku-class for < 3s response time; allow switching | **Blocking** |
| **Analytics** | None, opt-in, required | None in V1; opt-in in V2 | Non-blocking |
| **Updates** | Auto-update, manual only | Manual update initially | Non-blocking |
| **Pricing** | Free, freemium, paid | Free for V1 | Non-blocking |
| **CLI-only version** | No Electron, terminal-only for minimalists | Evaluate post-V1 based on demand | Non-blocking |

---

## 8. Timeline

### 8.1 Phases

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Alpha (Internal)** | Week 1–3 | All P0 features: core improvement engine (single LLM call), tmux dispatch, basic UI, settings, keytar, global hotkey, built-in presets, auto-detect mode, slash commands, secret detection, clipboard fallback |
| **Beta (Private)** | Week 4–6 | P1 features: history search, annotation mode, smart session detection, quality score, anti-pattern coaching, diff view, terminal context, dark/light theme, streaming, polish |
| **V1 Launch** | Week 7 | Full P0 + P1 feature set, cross-platform builds (.dmg), documentation, acceptance criteria pass |
| **V1.1 (Fast Follow)** | Week 8–9 | Bug fixes, performance tuning, community-requested presets, edge case handling |
| **V2 Planning** | Week 10+ | Analytics, team sharing, adaptive pattern weights, Claude Code hook integration |

**Scope note:** V1 targets 18 P0 + 14 P1 = 32 features over 7 weeks. P2 features (git diff injection, CLI mode, decomposition, effectiveness feedback, offline fallback) ship in V1.1+ based on demand. This is aggressive but achievable because most features are UI + glue code around a single LLM call.

### 8.2 Target Releases

| Release | Target | Gate Criteria |
|---------|--------|---------------|
| Alpha | End of Week 3 | Core P0 flow works: hotkey → improve → dispatch to tmux; all P0 features functional |
| Beta | End of Week 6 | All P0 + P1 features functional; < 3s response time; internal dogfooding |
| V1.0 | End of Week 7 | All acceptance criteria pass; .dmg builds successfully; 0 P0 bugs |
| V1.1 | End of Week 9 | Community feedback addressed; crash-free rate > 99.5%; select P2 features |

---

## 9. Risk Matrix

### 9.1 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **OpenRouter downtime** | Medium | High | Graceful degradation: show raw prompt, allow manual dispatch; consider offline rule-based fallback (P2) |
| **Improvement quality varies by model** | Medium | High | Default to proven Haiku-class model; allow switching; collect quality ratings in V2 |
| **Global hotkey conflicts** | Medium | Medium | Make hotkey configurable; detect conflicts on first run |
| **tmux version incompatibilities** | Medium | Medium | Test against tmux 3.0+; show clear errors on version mismatch; clipboard fallback |
| **API key security breach** | Low | Critical | keytar usage, no logging of keys, security audit, context isolation |
| **Poor pattern injection quality** | Medium | High | Extensive testing, user feedback loop, pattern refinement, annotation mode for transparency |
| **Prompt improvement adds latency** | Medium | High | Target < 2s response time; streaming output (P2) for perceived performance; auto-hide keeps user moving |
| **Low user adoption** | Medium | Medium | Developer community outreach, clear value prop, < 5s workflow as viral demo |
| **Performance issues with history** | Low | Medium | Pagination, indexed search, lazy loading, 1000-entry cap with pruning |
| **Electron update breaking changes** | Low | Medium | Version pinning, testing on updates |

### 9.2 Dependency Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| **OpenRouter** | API downtime, rate limits | Timeout handling, retry logic with backoff, user notification, queue heavy users |
| **keytar** | Platform-specific issues | Platform detection, fallback to encrypted electron-store |
| **tmux** | Not installed or incompatible version | Detect presence and version, show warning, clipboard-only mode |
| **Electron** | Security vulnerabilities, update churn | Context isolation enabled, nodeIntegration disabled, version pinning |

---

## 10. Appendix

### 10.1 Intent Types Reference

| Intent | Keywords | Primary Patterns |
|--------|----------|------------------|
| code-review | review, check, audit, analyze | intensity-calibration, fresh-eyes |
| debugging | fix, bug, error, issue, broken | intensity-calibration, self-verification |
| planning | plan, design, architecture, how to | scope-control, first-principles |
| implementation | implement, add, create, build | self-verification, context-anchoring |
| exploration | explore, understand, what is | first-principles, temporal-awareness |
| refactoring | refactor, restructure, improve | self-verification, context-anchoring |
| documentation | document, docs, readme | scope-control, context-anchoring |
| research | research, compare, evaluate | first-principles, scope-control |

### 10.2 Pattern Reference

| Pattern | Signal Phrase Example |
|---------|----------------------|
| intensity-calibration | "Do a thorough, methodical review" |
| scope-control | "Focus specifically on X, ignore Y" |
| self-verification | "Verify your changes compile and tests pass" |
| fresh-eyes | "Take a step back and evaluate the approach" |
| temporal-awareness | "This is a legacy system (5+ years old)" |
| context-anchoring | "Follow the patterns in src/utils" |
| first-principles | "Explain from fundamentals, don't assume" |

### 10.3 Keyboard Shortcuts Reference

| Shortcut | Action | Context |
|----------|--------|--------|
| Cmd+Shift+P | Toggle panel | Global |
| Cmd+Enter | Improve prompt | Panel focused |
| Cmd+Shift+Enter | Improve & send to terminal | Panel focused |
| Escape | Hide panel, return focus to previous app | Panel focused |
| Cmd+1–4 | Switch tabs (when pinned) | Panel focused |
| Cmd+K | Clear input and output | Panel focused |
| Cmd+H | Toggle history panel | Panel focused |
| Cmd+, | Open settings | Panel focused |
| Cmd+C (in output) | Copy improved prompt | Output focused |

---

## 11. V2+ Roadmap

Features to evaluate after V1 proves value:

| Feature | Description | Trigger |
|---------|-------------|--------|
| **Prompt Analytics** | Weekly summary of which patterns you consistently miss; builds prompting muscle memory | V1 retention > 50% |
| **Team Sharing** | Export/import presets and custom pattern configurations across teams | Community requests |
| **Claude Code Hook Mode** | Run as a native Claude Code hook that intercepts prompts within the CLI itself (skip Electron shell) | Claude Code API availability |
| **Adaptive Pattern Weights** | Use accumulated effectiveness ratings to personalize pattern selection per user | 500+ rated dispatches per user |
| **Snippet Library** | Save frequently used prompt fragments that can be composed together | Power user demand |
| **Multi-agent Dispatch** | Dispatch to multiple terminal sessions simultaneously for parallel agent workflows | Multi-agent workflow adoption |
| **VS Code Extension** | Embedded panel in VS Code sidebar | Developer demand |
| **Agent Output Analysis** | Full agent response capture and quality analysis (beyond thumbs up/down) | Feedback loop data sufficient |
| **Plugin System** | Third-party pattern plugins | Ecosystem maturity |
| **OTA System Prompt Updates** | Update the core system prompt without app release | Iteration speed needs |

---

*Document Version: 2.0*  
*Maintained by: PromptBetter Product Team*
