# PromptBetter Technical Specification

**Version:** 3.0  
**Status:** Draft  
**Last Updated:** March 2026

---

## 1. Architecture Overview

### 1.1 System Architecture

PromptBetter is a lightweight floating panel desktop application built on Electron. The architecture follows a modular design with clear separation between the UI layer, business logic, and system integration.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Electron Main Process                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Global    │  │   Window    │  │     IPC Handler         │  │
│  │   Shortcut  │  │   Manager   │  │  (Renderer ↔ Main)      │  │
│  │   Manager   │  │             │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    Keytar   │  │  electron-  │  │      tmux               │  │
│  │   (Keychain)│  │    store    │  │    Integration          │  │
│  │             │  │  (Settings) │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ IPC
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Electron Renderer Process                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     React + Tailwind UI                      ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ ││
│  │  │  Input   │  │  Output  │  │  History │  │  Settings   │ ││
│  │  │  Panel   │  │  Panel   │  │  Panel   │  │   Panel     │ ││
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Zustand State Management                  ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ ││
│  │  │  Prompt  │  │  Presets │  │  History │  │   Settings  │ ││
│  │  │  State   │  │  State   │  │  State   │  │   State     │ ││
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (OpenRouter API)
                              ▼
                    ┌─────────────────┐
                    │   OpenRouter    │
                    │      API        │
                    └─────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Version | Rationale |
|-------|------------|---------|----------|
| Shell | Electron | ^33.0.0 | Cross-platform, global hotkeys, child_process for tmux, system tray |
| Frontend | React | ^18.3.0 | Component model, hooks for state, fast re-renders |
| Styling | Tailwind CSS | ^3.4.0 | Utility-first, rapid prototyping, dark mode support |
| State | Zustand | ^5.0.0 | Minimal boilerplate, works well with Electron IPC |
| Storage | electron-store | ^10.0.0 | JSON-based, no database overhead, settings + history |
| Keychain | keytar | ^7.9.0 | OS-level keychain for API key (macOS Keychain, Windows Credential Vault) |
| Build | electron-builder | ^25.0.0 | Cross-platform packaging (.dmg, .exe, .AppImage) |
| API | OpenRouter REST | latest | Single endpoint, model switching via model parameter |
| Diff | diff-match-patch | ^1.0.5 | Lightweight, battle-tested text diff for prompt diff view |
| CLI | commander | ^12.0.0 | Argument parsing for `pb` CLI mode |
| Clipboard | clipboardy | ^4.0.0 | Cross-platform clipboard access (macOS/Windows/Linux) |

### 1.3 Process Model

**Main Process (Node.js)**
- Window management (floating panel, settings window)
- Global shortcut registration
- System tray integration
- IPC communication hub
- Secure credential storage
- tmux integration
- Native dialogs

**Renderer Process (Chromium)**
- React UI rendering
- User interaction handling
- State management (Zustand)
- API communication via IPC to main

---

## 2. Pattern Engine

### 2.1 Pattern Definitions

The seven core prompting patterns that PromptBetter can inject:

| Pattern | Signal Type | Description | Best For |
|---------|-------------|-------------|----------|
| **Intensity Calibration** | Explicit effort level | "Do a thorough, methodical review with fresh eyes" | Code review, debugging |
| **Scope Control** | Boundary definition | "Focus only on X, ignore Y" | Planning, refactoring |
| **Self-Verification** | Quality gates | "Verify your changes compile and tests pass" | Implementation, refactoring |
| **Fresh Eyes** | Perspective shift | "Take a step back and evaluate the approach" | Code review, planning |
| **Temporal Awareness** | Time context | "This is a greenfield module" vs "legacy system" | All intents |
| **Context Anchoring** | Reference points | "Following our existing patterns in /src/utils" | Implementation, refactoring |
| **First-Principles** | Reasoning depth | "Explain from fundamentals, don't assume" | Research, exploration |

### 2.2 Architecture: Single LLM Call

**PromptBetter uses a single LLM call for both classification and improvement.** The system prompt (Section 4.1) handles intent classification, pattern selection, and prompt improvement in one pass. This is critical for the < 3 second response time target.

- **Auto-detect mode:** One call. The LLM classifies intent AND improves in the same response.
- **Preset mode:** One call. The intent and patterns are fixed — the system prompt is modified to skip classification and use the preset's pattern set instead (see Section 4.2).
- **No separate classification call.** Section 3.1 defines intent types for reference; the classification prompt in Section 3.2 is the fallback keyword matcher used only for the offline rule-based fallback (P2).

### 2.2b Offline Fallback Matrix (P2 Only)

This matrix is **only used when the LLM is unavailable** (offline rule-based fallback, P2). It is NOT used in normal operation — the LLM handles pattern selection.

```typescript
type IntentType = 'code-review' | 'debugging' | 'planning' | 'implementation' | 'exploration' | 'refactoring' | 'documentation' | 'research';

const FALLBACK_MATRIX: Record<IntentType, string[]> = {
  'code-review':    ['intensity-calibration', 'fresh-eyes', 'self-verification'],
  'debugging':      ['intensity-calibration', 'fresh-eyes', 'self-verification', 'scope-control'],
  'planning':       ['scope-control', 'first-principles', 'temporal-awareness'],
  'implementation': ['self-verification', 'context-anchoring', 'scope-control'],
  'exploration':    ['first-principles', 'temporal-awareness', 'scope-control'],
  'refactoring':    ['self-verification', 'context-anchoring', 'scope-control'],
  'documentation':  ['scope-control', 'context-anchoring', 'temporal-awareness'],
  'research':       ['first-principles', 'scope-control', 'temporal-awareness'],
};
```

### 2.3 Built-in Preset Mappings

When a preset is selected, the following fixed pattern sets are used (bypassing auto-detection):

| Preset | Patterns (fixed set, max 4) |
|--------|----------|
| Auto-detect | LLM classifies intent and selects patterns dynamically (single call) |
| Code Review | Intensity Calibration + Fresh Eyes + Self-Verification |
| Debugging | Intensity Calibration + Fresh Eyes + Self-Verification + Scope Control |
| Planning | Scope Control + First-Principles + Temporal Awareness |
| Implementation | Self-Verification + Context Anchoring + Scope Control |
| Exploration | First-Principles + Temporal Awareness + Scope Control |
| Refactoring | Self-Verification + Context Anchoring + Scope Control |
| Documentation | Scope Control + Context Anchoring + Temporal Awareness |
| Research | First-Principles + Scope Control + Temporal Awareness |

**Note:** These preset mappings are intentionally identical to the Offline Fallback Matrix (Section 2.2b). When a preset is selected, the system prompt is modified to skip classification and inject only the preset's patterns (see Section 4.2).

### 2.4 Pattern Injection Rules

1. **Additive only**: Never remove intent from the original prompt. Only add signal
2. **Every word earns its place**: No padding, no filler. Surgical injection only
3. **Preserve voice**: The output should sound like a better version of what they wrote, not a rewrite
4. **Skip what's covered**: Don't double-apply patterns the user already covers well
5. **Natural language**: Add patterns as natural language woven into the prompt, not as metadata tags
6. **Max patterns**: Never inject more than 4 patterns per prompt
7. **Min patterns**: Only inject if at least 1 pattern applies (score >= 0.3)
8. **No preamble**: Output the improved prompt only. No explanation, no meta-commentary

---

## 3. Intent Classification

### 3.1 Intent Types

| Intent | Description | Trigger Keywords |
|--------|-------------|------------------|
| `code-review` | Analyze code for issues, bugs, improvements | review, check, audit, analyze |
| `debugging` | Find and fix bugs, investigate issues | fix, bug, error, issue, problem, broken |
| `planning` | Design solutions, architecture, approach | plan, design, architecture, approach, how to |
| `implementation` | Write new code, features | implement, add, create, build, write |
| `exploration` | Understand codebase, learn | explore, understand, what is, how does |
| `refactoring` | Improve existing code structure | refactor, restructure, improve, clean |
| `documentation` | Generate or improve docs | document, docs, readme, comment |
| `research` | Investigate options, compare | research, compare, evaluate, alternatives |

### 3.2 Classification Approach

**Primary (online):** The LLM classifies intent inline as part of the single improvement call (see Section 4.1). No separate classification call is made.

**Fallback (offline, P2):** When the LLM is unavailable, a simple keyword matcher classifies intent locally:

```typescript
function classifyByKeyword(prompt: string): { intent: IntentType; confidence: number } {
  const lower = prompt.toLowerCase();
  const KEYWORD_MAP: [IntentType, RegExp, number][] = [
    ['debugging',       /\b(fix|bug|error|issue|problem|broken|crash)\b/, 0.7],
    ['code-review',     /\b(review|check|audit|analyze|inspect)\b/,       0.7],
    ['planning',        /\b(plan|design|architect|approach|how to)\b/,     0.6],
    ['implementation',  /\b(implement|add|create|build|write|make)\b/,     0.5],
    ['refactoring',     /\b(refactor|restructure|clean|simplify)\b/,       0.7],
    ['documentation',   /\b(document|docs|readme|comment)\b/,             0.7],
    ['research',        /\b(research|compare|evaluate|alternatives)\b/,    0.6],
    ['exploration',     /\b(explore|understand|what is|how does)\b/,       0.5],
  ];
  for (const [intent, regex, confidence] of KEYWORD_MAP) {
    if (regex.test(lower)) return { intent, confidence };
  }
  return { intent: 'implementation', confidence: 0.3 }; // safe default
}
```

### 3.3 LLM Response Parsing

When annotation mode is on, the LLM appends metadata after a `---` separator. Parsing must handle common LLM formatting issues:

```typescript
function parseImprovementResponse(raw: string): {
  improvedPrompt: string;
  intent?: string;
  confidence?: number;
  patterns?: string[];
} {
  const separator = raw.lastIndexOf('---');
  if (separator === -1) {
    return { improvedPrompt: raw.trim() };
  }
  const improvedPrompt = raw.substring(0, separator).trim();
  const metadata = raw.substring(separator + 3).trim();

  // Parse annotation metadata (tolerant of formatting variations)
  const intentMatch = metadata.match(/Intent:\s*([\w-]+)\s*\(confidence:\s*([\d.]+)\)/i);
  const patternsMatch = metadata.match(/Patterns:\s*(.+)/i);

  return {
    improvedPrompt,
    intent: intentMatch?.[1],
    confidence: intentMatch?.[2] ? parseFloat(intentMatch[2]) : undefined,
    patterns: patternsMatch?.[1]?.split(',').map(s => s.trim()),
  };
}
```

---

## 4. System Prompt Design

### 4.1 Core System Prompt

This is the heart of PromptBetter — the core intellectual property. It encodes the classification logic, pattern injection rules, and output constraints.

**Core principles encoded in the system prompt:**
- Preserve the user's voice and intent. The output should sound like a better version of what they wrote
- Additive only. Never remove intent from the original prompt
- Surgical injection. Every added word must earn its place. No padding
- Skip patterns the user already covers well. Don't double-apply
- Output the improved prompt only. No preamble, no explanation, no meta-commentary
- In annotated mode, append a separator and brief pattern annotations after the prompt

```
You are PromptBetter, an AI prompt improvement engine. Your task is to take a user's rough prompt and surgically enhance it with proven prompting patterns while preserving their voice.

## Your Mission
1. Classify the user's intent (code-review, debugging, planning, implementation, exploration, refactoring, documentation, research)
2. Select the 2-4 most relevant patterns from the seven below
3. Inject those patterns naturally into the prompt
4. Never pad, never add unnecessary words — every added word must earn its place
5. Preserve the user's original tone and terminology — the output should sound like a better version of what they wrote, not a rewrite
6. Never remove intent from the original prompt — additive only

## The Seven Patterns

### 1. Intensity Calibration
Use when: User wants thorough, comprehensive work
Signal: "Do a thorough, methodical review with fresh eyes" or "Be exhaustive in your analysis"
Never use: If user already specifies intensity

### 2. Scope Control  
Use when: User needs focused work on specific areas
Signal: "Focus specifically on X, ignore Y" or "Concentrate only on the authentication flow"
Never use: If user already defines scope

### 3. Self-Verification
Use when: User wants quality assurance
Signal: "Verify your changes compile and all tests pass" or "Double-check your implementation"
Never use: If user already mentions verification

### 4. Fresh Eyes
Use when: User wants unbiased perspective
Signal: "Take a step back and evaluate the approach before diving in" or "Look at this with fresh eyes"
Never use: If user already mentions review approach

### 5. Temporal Awareness
Use when: Context about codebase age/state matters
Signal: "This is a legacy system (5+ years old)" or "This is a greenfield module"
Never use: If user already provides context

### 6. Context Anchoring
Use when: User wants alignment with existing patterns
Signal: "Follow the patterns in src/utils" or "Match the style of existing handlers"
Never use: If user already specifies constraints

### 7. First-Principles
Use when: User wants fundamental reasoning
Signal: "Explain from fundamentals, don't assume prior knowledge" or "Work through this from first principles"

## Rules
- Output ONLY the improved prompt, nothing else
- Never add preamble like "Here's your improved prompt:"
- Never add explanation or meta-commentary
- If no patterns apply, return the original prompt unchanged
- Never inject more than 4 patterns
- Never inject patterns the user already covers well
- Keep additions minimal and surgical — every word must earn its place
- Never remove or rewrite existing intent — additive only

## Annotation Mode
If annotation mode is enabled, append this at the end:
---
Patterns: [pattern1], [pattern2], [pattern3]
Rationale: [one sentence explaining why these patterns were selected]
Intent: [detected intent] (confidence: [0.0-1.0])
```

### 4.2 Preset-Mode System Prompt

When a preset is selected (not Auto-detect), replace the "Your Mission" step 1-2 with fixed instructions:

```
## Your Mission
1. The user has selected the "{presetName}" preset. The intent is {intent}.
2. Inject the following patterns naturally into the prompt: {patternList}
3. Never pad, never add unnecessary words — every added word must earn its place
...(rest identical to core system prompt)
```

This avoids wasted tokens on classification when the user has already specified their intent.

### 4.3 API Request Format

```typescript
interface OpenRouterRequest {
  model: string;           // e.g., "anthropic/claude-3-haiku"
  messages: [
    {
      role: "system";
      content: string;     // SYSTEM_PROMPT (auto-detect) or PRESET_PROMPT (preset selected)
    },
    {
      role: "user";
      content: string;     // built by buildUserMessage()
    }
  ];
  temperature: 0.3;        // Low temperature for consistent outputs
  max_tokens: 1000;        // Keep responses short
}

function buildUserMessage(
  userInput: string,
  terminalContext?: string,
  gitDiff?: string
): string {
  let message = userInput;
  if (terminalContext) {
    message += `\n\n## Recent Terminal Output (last 50 lines)\n${terminalContext}`;
  }
  if (gitDiff) {
    message += `\n\n## Current Git Changes\n${gitDiff}`;
  }
  return message;
}
```

**Token budget estimate:** System prompt ~800 tokens + user prompt ~100 tokens + terminal context ~500 tokens (capped) + git diff ~750 tokens (capped) = **~2,150 input tokens** typical. At Haiku pricing ($0.25/M input), this is ~$0.0005 per call.

### 4.4 Response Handling

```typescript
interface OpenRouterResponse {
  choices: [
    {
      message: {
        content: string;  // The improved prompt
      };
    }
  ];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}
```

---

## 5. tmux Integration

### 5.1 Session Discovery

```typescript
interface TmuxSession {
  name: string;
  attached: boolean;
  created: string;
  isClaudeCode: boolean;  // detected via pane_current_command
}

async function listSessions(): Promise<TmuxSession[]> {
  const result = await execAsync('tmux list-sessions -F "#{session_name}:#{session_attached}:#{session_created}"');
  return result.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [name, attached, created] = line.split(':');
      return {
        name,
        attached: attached === '1',
        created: new Date(parseInt(created) * 1000).toISOString(),
        isClaudeCode: false, // populated by detectClaudeCodeSessions()
      };
    });
}
```

### 5.1b Smart Session Detection

For auto-detecting which panes are running Claude Code, inspect `pane_current_command`:

```typescript
async function detectClaudeCodeSessions(): Promise<Map<string, string>> {
  const result = await execAsync(
    'tmux list-panes -a -F "#{session_name}:#{pane_id}:#{pane_current_command}"'
  );
  const claudePanes = new Map<string, string>();
  result.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .forEach(line => {
      const [session, paneId, command] = line.split(':');
      if (command?.includes('claude') || command?.includes('Claude')) {
        claudePanes.set(session, paneId);
      }
    });
  return claudePanes;
}
```

Claude Code sessions are highlighted in the dropdown and auto-selected when only one exists.

### 5.2 Prompt Dispatch (set-buffer Approach)

For multi-line prompts, we use `tmux load-buffer` from stdin (no shell interpolation) followed by `paste-buffer` and `send-keys`:

```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);

// Validate session name: alphanumeric, underscores, hyphens, dots only
function sanitizeSessionName(name: string): string {
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new Error(`Invalid tmux session name: ${name}`);
  }
  return name;
}

async function sendToTmux(prompt: string, sessionName: string): Promise<boolean> {
  try {
    const target = sanitizeSessionName(sessionName);

    // Step 1: Load prompt into tmux buffer via stdin (no shell interpolation)
    const child = require('child_process').spawn(
      'tmux', ['load-buffer', '-b', 'promptbetter', '-'],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );
    child.stdin.write(prompt);
    child.stdin.end();
    await new Promise((resolve, reject) => {
      child.on('close', (code: number) => code === 0 ? resolve(null) : reject(new Error(`tmux load-buffer exited ${code}`)));
    });

    // Step 2: Paste the buffer (uses execFile, not execAsync — no shell)
    await execFileAsync('tmux', ['paste-buffer', '-b', 'promptbetter', '-t', target]);

    // Step 3: Send Enter key
    await execFileAsync('tmux', ['send-keys', '-t', target, 'C-m']);

    return true;
  } catch (error) {
    console.error('tmux send failed:', error);
    return false;
  }
}
```

**Security notes:**
- Uses `spawn`/`execFile` (array args), never `exec` (shell string). This eliminates shell injection.
- Session names are validated against a strict allowlist regex before use.
- Prompt content is piped via stdin to `tmux load-buffer -`, so it never touches a shell.

### 5.3 Clipboard Fallback

If tmux is unavailable or fails. Uses `clipboardy` for cross-platform support (macOS/Windows/Linux):

```typescript
import clipboardy from 'clipboardy';

async function sendViaClipboard(prompt: string): Promise<boolean> {
  try {
    await clipboardy.write(prompt);
    return true;
  } catch (error) {
    console.error('Clipboard fallback failed:', error);
    return false;
  }
}
```

### 5.4 Terminal History Context Capture

Capture the last N lines from the target tmux pane to provide follow-up context to the improvement LLM. This makes prompts like "fix that error" fully contextualized.

```typescript
async function captureTerminalContext(
  sessionName: string,
  paneId?: string,
  lines: number = 50
): Promise<string | null> {
  try {
    const target = sanitizeSessionName(
      paneId ? `${sessionName}:${paneId}` : sessionName
    );
    // execFileAsync: no shell, args as array
    const result = await execFileAsync(
      'tmux', ['capture-pane', '-p', '-t', target, '-S', `-${lines}`]
    );
    const output = result.stdout.trim();
    if (!output || output.length < 20) return null;
    return output;
  } catch (error) {
    console.warn('Terminal context capture failed:', error);
    return null;
  }
}
```

**When to capture:** On every improvement request when a tmux session is selected. The context is fed to the LLM alongside the user's prompt (see Section 4.2 `buildUserMessage`).

**Token budget:** Terminal context is truncated to ~2,000 tokens to leave room for the prompt and system prompt within the model's context window.

### 5.5 Git Diff Auto-Injection

When the detected intent is `code-review` or `debugging`, automatically capture the current git diff from the tmux pane's working directory.

```typescript
async function captureGitDiff(
  sessionName: string,
  mode: 'diff' | 'staged' = 'diff'
): Promise<string | null> {
  try {
    const target = sanitizeSessionName(sessionName);

    // Get the working directory of the tmux pane (execFileAsync: no shell)
    const cwdResult = await execFileAsync(
      'tmux', ['display-message', '-t', target, '-p', '#{pane_current_path}']
    );
    const cwd = cwdResult.stdout.trim();
    if (!cwd || !/^\//.test(cwd)) return null; // must be absolute path

    // Check if it's a git repo (execFileAsync with cwd option)
    const gitCheck = await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
    if (gitCheck.stdout.trim() !== 'true') return null;

    // Capture diff (stat + truncated full diff)
    const diffArgs = mode === 'staged' ? ['diff', '--staged'] : ['diff'];
    const statResult = await execFileAsync('git', [...diffArgs, '--stat'], { cwd });
    const diffResult = await execFileAsync('git', diffArgs, { cwd });

    const stat = statResult.stdout.trim();
    const diff = diffResult.stdout.trim();
    if (!stat) return null;

    // Truncate full diff to ~3000 chars to stay within token budget
    const truncatedDiff = diff.length > 3000
      ? diff.substring(0, 3000) + '\n... [truncated]'
      : diff;

    return `${stat}\n\n${truncatedDiff}`;
  } catch (error) {
    console.warn('Git diff capture failed:', error);
    return null;
  }
}
```

**Trigger:** Auto-injected when intent is `code-review` or `debugging`. User sees a small indicator ("Git context included") in the UI. Can be disabled in settings.

### 5.6 Edge Cases

| Scenario | Handling |
|----------|----------|
| No tmux installed | Show warning, use clipboard only |
| No active sessions | Show "No sessions" in dropdown, use clipboard |
| Session dies during send | Detect failure, offer clipboard fallback with toast |
| Very long prompt (>10KB) | Warn user, truncate or use clipboard |
| Special characters in prompt | Proper shell escaping, base64 if needed |
| Multiple tmux clients | Target specific session by name |
| tmux version < 3.0 | Detect version, show warning about potential issues |
| Configured session no longer exists | Fall back to clipboard, show notification |
| Multiple Claude Code panes | Show all in dropdown, let user choose |

---

## 6. UI Layout

### 6.1 Main Panel (Floating)

The floating panel appears on `Cmd+Shift+P`. Warm toggle (hide/show) within 200ms; cold start (first activation after launch) within 500ms. It's a compact, focused interface. The preset selector is at the top so users choose context first, then type.

```
┌─────────────────────────────────────────────────────────────┐
│  PromptBetter                                    [📌] [×]  │
├─────────────────────────────────────────────────────────────┤
│  Preset: [Auto-detect ▼]  Model: [Claude Haiku ▼]         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ /review check the auth flow...                      │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  Score: 6/10 • missing: verification, context              │
│  ⚠ Detected: API key (sk-****) — [Remove] [I've reviewed]  │
│                                                             │
│  [Improve (⌘↵)]  [Improve & Send (⌘⇧↵)]                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Improved prompt appears here (editable)...          │   │
│  │ + Do a thorough, methodical review with fresh eyes  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  Patterns: intensity-calibration, fresh-eyes  [Diff ↔ Plain]│
│  🌿 Git context included (3 files changed)                  │
│                                                             │
│  Target: [claude-session ▼] [🔄]  [ ] Annotation           │
│  [Copy to Clipboard]  [Send to Terminal (⌘⇧↵)]            │
└─────────────────────────────────────────────────────────────┘
```

**Dimensions:** 600px width × 520px height (resizable)  
**Position:** Center of screen, floating above all windows (always-on-top)  
**Behavior:** Auto-hides after successful Improve & Send dispatch (Quick Mode). Focus returns to previous app on hide.  
**Output field:** Editable — the edited version is what gets dispatched, not the raw improvement.  

**Below-input feedback (one line at a time, priority order):**
1. **Secret detection** (highest) — Red warning replaces other feedback. Blocks Improve/Send until user clicks "I've reviewed" or removes the secret.
2. **Quality score** — Shows `Score: N/10 • missing: X, Y`. Updates as user types (debounced 300ms).
3. **Anti-pattern tip** — Subtle gray tip, only shown when no secret warning is active. One tip at a time. Dismissed tips stored in settings.

Showing only one feedback line at a time prevents the UI from overflowing. The panel height stays fixed.

**Diff view:** Toggle between diff view (additions in green) and plain text. Diff is computed between original input and LLM output. When the user edits the output, diff view auto-disables (switches to plain) since the baseline is no longer meaningful. Re-clicking [Diff] recomputes against the edited version.

**Slash commands:** Typing `/review`, `/debug`, `/plan` etc. as prefix auto-selects preset; prefix stripped before improvement. Slash command **wins** over the dropdown. Deleting the slash prefix **reverts the dropdown to its previous selection** (stored in a local variable, not persisted).

**Decomposition:** When the "Break into steps?" suggestion is accepted, auto-hide is paused until all sub-prompts are sent or the user clicks [Done]. A small [Undo → single prompt] link restores the original improved prompt.

**Git context indicator:** When git diff is auto-injected, a green indicator shows file count below the output.  
**Annotation line:** When annotation mode is enabled, shows applied patterns and rationale inline below the output field.

**Feedback toast (post-dispatch):** Appears as a **system notification** (Electron `Notification` API), not inside the panel. This works even when the panel is hidden (Quick Mode). Clicking the notification opens a minimal inline feedback UI if the panel is reopened. For clipboard dispatches, the toast still appears but without agent output capture (user rates based on their own observation).

### 6.2 Pinned Window Mode

When pinned, the panel becomes a persistent window with tabs:

```
┌─────────────────────────────────────────────────────────────┐
│  PromptBetter                                    [─] [□] [×]│
├─────────────────────────────────────────────────────────────┤
│  [Improve]  [History]  [Presets]  [Settings]              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  (Tab content varies)                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 History Panel

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Search history...                                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ "check code for bugs" → "Do a thorough review..."   │   │
│  │ Code Review • 2 min ago                             │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ "add auth to api" → "Implement authentication..."   │   │
│  │ Implementation • 1 hour ago                         │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ "fix login bug" → "Debug the login flow..."         │   │
│  │ Debugging • Yesterday                               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 6.4 Presets Panel

```
┌─────────────────────────────────────────────────────────────┐
│  Built-in Presets                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔍 Code Review    → Intensity + Fresh Eyes          │   │
│  │ 🐛 Debugging      → Intensity + Self-Verification   │   │
│  │ 📋 Planning       → Scope + First-Principles        │   │
│  │ 🛠️  Implementation → Self-Verification + Context    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Custom Presets                          [+ New Preset]    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📝 My Security Review                                │   │
│  │ 📝 Performance Audit                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 6.5 Settings Panel

```
┌─────────────────────────────────────────────────────────────┐
│  API Configuration                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ OpenRouter API Key: [••••••••••••••••] [Test]       │   │
│  │ Default Model:     [Anthropic Claude 3 Haiku ▼]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Hotkeys                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Toggle Panel:    ⌘⇧P                                │   │
│  │ Improve:         ⌘↵                                 │   │
│  │ Improve & Send:  ⌘⇧↵                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Behavior                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [✓] Start at login                                  │   │
│  │ [✓] Show in menu bar                                │   │
│  │ [ ] Always on top (when pinned)                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Data                                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ History entries: 127  |  [Clear History]           │   │
│  │ Storage used: 2.3 MB                                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Settings & Storage

### 7.1 electron-store Schema

```typescript
interface StoreSchema {
  schemaVersion: number;      // current: 1. Bump on breaking changes; migrate on load.
  installedAt: string;        // ISO timestamp of first launch (for annotation auto-disable timer)
  settings: {
    apiKey: string;           // Stored in keytar, not here
    defaultModel: string;
    terminalMode: 'tmux' | 'clipboard';
    tmuxSession: string | 'auto-detect';
    annotations: boolean;
    theme: 'dark' | 'light' | 'system';
    hotkeys: {
      toggle: string;
      improve: string;
      improveAndSend: string;
    };
    behavior: {
      startAtLogin: boolean;
      showInMenuBar: boolean;
      alwaysOnTop: boolean;
      autoHideAfterSend: boolean;
    };
    powerFeatures: {
      terminalContext: boolean;       // capture last 50 lines from tmux pane
      gitDiffInjection: boolean;      // auto-inject git diff for review/debug
      qualityScore: boolean;          // show live prompt quality score
      antiPatternCoaching: boolean;   // show inline coaching tips
      secretDetection: boolean;       // always true, not user-configurable
      diffView: boolean;              // show diff between raw and improved
      effectivenessFeedback: boolean; // show thumbs up/down after dispatch
    };
    dismissedAntiPatterns: string[];  // anti-pattern IDs the user has dismissed
  };
  presets: {
    builtIn: Preset[];
    custom: Preset[];
    lastUsed: string;         // preset id, persists across sessions
  };
  history: HistoryEntry[];
  // Aggregated feedback survives history pruning (fixes data loss on prune)
  feedbackAggregates: Record<string, { positive: number; negative: number }>;
  // Key format: "intent:pattern" e.g. "code-review:fresh-eyes"
  // Used by effectiveness feedback loop (Section 10.7) to adjust pattern weights
}

// Schema migration: on app load, check schemaVersion.
// If missing or < current, apply migrations sequentially.
// electron-store supports `defaults` — missing fields get default values automatically.
// Example: store.get('schemaVersion') ?? 0 < 1 → set installedAt, set schemaVersion=1

interface Preset {
  id: string;
  name: string;
  patterns: string[];
  isBuiltIn: boolean;
}

interface HistoryEntry {
  id: string;
  originalPrompt: string;
  improvedPrompt: string;
  editedPrompt?: string;     // if user edited the output before dispatching
  intent: string;
  confidence: number;
  patternsApplied: string[];
  model: string;
  timestamp: string;
  wasSent: boolean;
  dispatchMode: 'tmux' | 'clipboard' | null;
  qualityScore?: number;             // raw prompt quality score (1-10)
  effectivenessRating?: 'positive' | 'negative' | null;  // user feedback
  terminalContextIncluded?: boolean; // optional: may not exist on older entries
  gitDiffIncluded?: boolean;         // optional: may not exist on older entries
  decomposed?: boolean;              // was this part of a decomposed sequence
}
```

### 7.1b Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| OpenRouter API Key | String (encrypted) | None | Stored in system keychain via keytar |
| Default Model | Dropdown | claude-3.5-haiku | OpenRouter model for prompt improvement |
| Terminal Mode | Dropdown | tmux | tmux or clipboard-paste |
| tmux Session | Dropdown | Auto-detect | Target session for dispatch; auto-detects Claude Code panes |
| Annotations | Toggle | Off | Show/hide pattern annotations inline below output |
| Theme | Toggle | System | Dark, light, or system preference |
| Global Hotkey | Key combo | Cmd+Shift+P | System-wide activation shortcut |
| Auto-hide after send | Toggle | On | Panel hides after successful dispatch (Quick Mode) |
| Terminal context | Toggle | On | Capture last 50 lines from tmux pane for follow-up awareness |
| Git diff injection | Toggle | On | Auto-inject git diff when intent is code-review or debugging |
| Quality score | Toggle | On | Show live 1–10 quality score with gap analysis below input |
| Anti-pattern coaching | Toggle | On | Show inline tips for weak prompting patterns |
| Secret detection | Toggle | On (locked) | Scan for API keys/passwords; always on, cannot be disabled |
| Diff view | Toggle | Off | Show visual diff between raw and improved prompt |
| Effectiveness feedback | Toggle | On | Show thumbs up/down toast 30s after dispatch |

### 7.2 Keytar Integration

API key stored securely in system keychain:

```typescript
import keytar from 'keytar';

const SERVICE_NAME = 'PromptBetter';
const ACCOUNT_NAME = 'openrouter-api-key';

async function saveApiKey(key: string): Promise<void> {
  await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, key);
}

async function getApiKey(): Promise<string | null> {
  return await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
}

async function deleteApiKey(): Promise<boolean> {
  return await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
}
```

---

## 8. Keyboard Shortcuts

### 8.1 Global Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd+Shift+P` | Toggle panel visibility | Global (configurable) |
| `Cmd+Shift+Enter` | Improve & send to tmux | Panel focused |
| `Escape` | Hide panel, return focus to previous app | Panel focused |

### 8.2 Panel Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Enter` | Improve prompt |
| `Cmd+Shift+Enter` | Improve & send to terminal |
| `Cmd+1` | Switch to Improve tab |
| `Cmd+2` | Switch to History tab |
| `Cmd+3` | Switch to Presets tab |
| `Cmd+4` | Switch to Settings tab |
| `Cmd+K` | Clear input and output |
| `Cmd+H` | Toggle history panel |
| `Cmd+,` | Open settings |
| `Cmd+C` (in output) | Copy improved prompt |

---

## 9. Security Considerations

### 9.1 Electron Security

- **Context isolation enabled** — renderer process cannot access Node.js APIs directly
- **nodeIntegration disabled** — all Node.js access goes through the preload script's contextBridge
- **Preload script** exposes only the minimum required API surface to the renderer
- **Content Security Policy** — restrict script sources and connections

### 9.2 API Key Security

- **Never store API keys in plain text** — use system keychain via keytar
- **Validate key format** before saving (check prefix, length)
- **Implement key rotation** — allow user to update key without losing settings
- **No logging of keys** — API keys never appear in log files or error reports

### 9.3 Network Security

- All API calls to OpenRouter use HTTPS
- No proxy through external servers — direct connection only
- Prompt history stored locally only; never transmitted except to OpenRouter for improvement
- No telemetry or analytics in V1
- tmux dispatch runs locally via child_process; no network exposure

### 9.4 Input Handling

- **Prompt injection:** Not mitigated in V1. The user's prompt is sent verbatim to the LLM. Since the user is also the operator (local desktop app), prompt injection is a self-attack with no meaningful threat model. If multi-user features are added in V2, revisit.
- **tmux dispatch:** Uses `spawn`/`execFile` with array args (Section 5.2). No shell interpolation. Session names validated against allowlist regex.
- **Prompt length:** Hard cap at 10,000 characters. Prompts exceeding this are rejected with an error message before any API call.

### 9.5 Local Data

- History stored locally only — no cloud sync
- User can delete all data from settings
- History entries encrypted at rest (future enhancement)
- Maximum 1,000 history entries; oldest pruned on overflow

---

## 10. Power Features (Technical)

### 10.1 Secret Detection Engine

Real-time scanning of prompt input for accidentally included secrets. Runs on every keystroke (debounced 200ms).

```typescript
interface SecretPattern {
  name: string;
  regex: RegExp;
  example: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  { name: 'AWS Access Key',    regex: /AKIA[0-9A-Z]{16}/,                    example: 'AKIA...' },
  { name: 'GitHub Token',      regex: /gh[ps]_[a-zA-Z0-9]{36}/,              example: 'ghp_...' },
  { name: 'OpenAI Key',        regex: /sk-(?!or-)[a-zA-Z0-9]{20,}/,          example: 'sk-...' },
  { name: 'Stripe Key',        regex: /sk_(live|test)_[a-zA-Z0-9]{24,}/,     example: 'sk_live_...' },
  { name: 'Private Key',       regex: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/, example: 'PEM key' },
  { name: 'Connection String', regex: /(?:mongodb|postgres|mysql):\/\/[^\s]+:[^\s]+@/, example: 'db://user:pass@...' },
  { name: 'Slack Token',       regex: /xox[bpras]-[a-zA-Z0-9-]+/,            example: 'xoxb-...' },
];
// NOTE: Generic high-entropy pattern (base64) removed — too many false positives
// in a developer tool where users routinely paste code. Better to catch specific
// known formats than to cry wolf on every long string.

function detectSecrets(text: string): { name: string; match: string }[] {
  return SECRET_PATTERNS
    .flatMap(pattern => {
      const matches = text.match(pattern.regex);
      return matches ? [{ name: pattern.name, match: matches[0].substring(0, 8) + '****' }] : [];
    });
}
```

**Behavior:** Warning banner appears immediately. Improve/Send buttons disabled until user clicks "I've reviewed this" or removes the secret. Cannot be disabled in settings (security-critical).

### 10.2 Slash Command Parser

Prefix-based preset activation. Parsed before any other processing.

```typescript
const SLASH_COMMANDS: Record<string, string> = {
  '/review':    'code-review',
  '/debug':     'debugging',
  '/plan':      'planning',
  '/implement': 'implementation',
  '/explore':   'exploration',
  '/refactor':  'refactoring',
  '/docs':      'documentation',
  '/research':  'research',
};

function parseSlashCommand(input: string): { preset: string | null; prompt: string } {
  const trimmed = input.trimStart();
  for (const [command, preset] of Object.entries(SLASH_COMMANDS)) {
    if (trimmed.startsWith(command + ' ') || trimmed === command) {
      return {
        preset,
        prompt: trimmed.substring(command.length).trim(),
      };
    }
  }
  return { preset: null, prompt: input };
}
```

**UI integration:** When a slash command is detected, the preset dropdown updates in real-time to reflect the selection. The `/command` prefix is highlighted in a different color in the input field.

### 10.3 Prompt Quality Scorer

Live rule-based scoring of raw prompts before improvement. Fast and local — no LLM call.

```typescript
interface QualityScore {
  score: number;          // 1-10
  gaps: string[];         // what's missing
  strengths: string[];    // what's already good
}

const QUALITY_SIGNALS = [
  { name: 'scope',          regex: /\b(focus|only|specific|ignore|exclude|just the)\b/i,   weight: 1.5 },
  { name: 'verification',   regex: /\b(verify|test|check|confirm|ensure|validate)\b/i,     weight: 1.5 },
  { name: 'context',        regex: /\b(existing|current|legacy|new|greenfield|pattern)\b/i, weight: 1.0 },
  { name: 'intensity',      regex: /\b(thorough|careful|exhaustive|methodical|deep)\b/i,    weight: 1.0 },
  { name: 'output format',  regex: /\b(list|table|markdown|json|step by step|numbered)\b/i, weight: 0.5 },
  // Specificity: reward named entities (file paths, function names, error codes) not word count.
  // "fix auth.spec.ts" (3 words) is more specific than "fix the problem with the thing" (7 words).
  { name: 'specificity',    test: (t: string) => /[\w.-]+\.(ts|js|py|rs|go|tsx|jsx|css|html|md|json|yaml|yml|spec|test)|\b[A-Z][a-z]+[A-Z]\w+\b|\b\d{3,}\b|\berror\s+\w+\b/i.test(t), weight: 1.0 },
  { name: 'actionable verb', regex: /^(review|fix|debug|implement|refactor|plan|design|analyze|create|build)/i, weight: 1.0 },
];

function scorePrompt(text: string, activePreset?: string): QualityScore {
  let rawScore = 0;
  const gaps: string[] = [];
  const strengths: string[] = [];

  for (const signal of QUALITY_SIGNALS) {
    const match = signal.regex
      ? signal.regex.test(text)
      : signal.test?.(text);
    if (match) {
      rawScore += signal.weight;
      strengths.push(signal.name);
    } else {
      gaps.push(signal.name);
    }
  }

  // Preset bonus: selecting a preset provides implicit scope + context
  if (activePreset && activePreset !== 'auto-detect') {
    rawScore += 1.5;
    // Don't show 'scope' as a gap when a preset is active
    const scopeIdx = gaps.indexOf('scope');
    if (scopeIdx !== -1) gaps.splice(scopeIdx, 1);
  }

  // Normalize to 1-10 (max raw ~8.0, so divide by 0.8)
  const score = Math.min(10, Math.max(1, Math.round(rawScore / 0.8)));
  return { score, gaps, strengths };
}
```

**Display:** Score badge next to input field (color-coded: red 1-3, yellow 4-6, green 7-10). Gap analysis shown as comma-separated list below input (only shown when score < 7 to avoid noise). Updates on 300ms debounce.

### 10.4 Anti-Pattern Coaching Engine

Detects weak prompting habits and shows contextual tips.

```typescript
interface AntiPattern {
  id: string;
  regex: RegExp;
  tip: string;
  replacement?: string;   // suggested rewrite
}

const ANTI_PATTERNS: AntiPattern[] = [
  {
    id: 'politeness-prefix',
    regex: /^(please |can you |could you |would you |I want you to |I need you to )/i,
    tip: 'Direct instructions perform better. State the task directly.',
    replacement: '',  // just remove the prefix
  },
  {
    id: 'vague-quality',
    regex: /\b(make it good|make it better|improve it|do a good job)\b/i,
    tip: '"Good" is ambiguous. Specify criteria: performant? readable? secure? maintainable?',
  },
  {
    id: 'unbounded-scope',
    regex: /\b(do everything|fix everything|check everything|review everything)\b/i,
    tip: 'Unbounded scope leads to unfocused output. Add boundaries: which files, which concerns.',
  },
  {
    id: 'double-negative',
    regex: /\bdon't not\b|\bnot un/i,
    tip: 'Double negatives confuse AI agents. Use positive framing instead.',
  },
  {
    id: 'filler-words',
    // Only fires when 2+ filler words appear — one "just" is fine, "basically just" is not
    regex: /\b(basically|actually|simply|obviously|clearly)\b.*\b(basically|actually|just|simply|obviously|clearly)\b/i,
    tip: 'Multiple filler words waste tokens without adding signal. Every word should earn its place.',
  },
];
```

**Display:** Subtle gray text below input. One tip at a time (highest-priority match). Includes small "x" dismiss button. Dismissed patterns stored in `settings.dismissedAntiPatterns`.

### 10.5 Prompt Diff Engine

Generates an inline diff between the raw prompt and the improved prompt.

```typescript
import { diff_match_patch } from 'diff-match-patch';

interface DiffSegment {
  type: 'equal' | 'insert' | 'delete';
  text: string;
}

function computePromptDiff(original: string, improved: string): DiffSegment[] {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(original, improved);
  dmp.diff_cleanupSemantic(diffs);

  return diffs.map(([op, text]) => ({
    type: op === 0 ? 'equal' : op === 1 ? 'insert' : 'delete',
    text,
  }));
}
```

**Rendering:** In diff view, `insert` segments render with green background + green text. `delete` segments render with red strikethrough (rare, since improvements are additive). `equal` segments render normally. Toggle button `[Diff ↔ Plain]` switches between views. Diff view is the default when the user has annotation mode on.

### 10.6 Prompt Decomposition Engine

Detects multi-intent prompts and offers to split them into focused sub-prompts.

```typescript
interface DecomposedPrompt {
  subPrompts: {
    text: string;
    intent: string;
    patterns: string[];
  }[];
  reasoning: string;
}

// Detection heuristic (fast, pre-LLM)
function detectMultiIntent(text: string): boolean {
  const intentVerbs = text.match(
    /\b(review|fix|debug|implement|refactor|plan|design|add|create|update|test|document)\b/gi
  );
  const conjunctions = text.match(/\b(and then|then|also|plus|additionally|as well as)\b/gi);
  return (intentVerbs?.length ?? 0) >= 3 || (conjunctions?.length ?? 0) >= 2;
}
```

**LLM decomposition prompt:** When multi-intent is detected, a separate LLM call decomposes the prompt:

```
Break the following complex prompt into 2-5 focused, sequential sub-prompts.
Each sub-prompt should have a single clear intent.
Return JSON: { "subPrompts": [{ "text": "...", "intent": "..." }], "reasoning": "..." }

Original prompt: "{userPrompt}"
```

**UI:** A collapsible "Break into steps?" suggestion appears above the output field. Accepting replaces the output with a numbered queue. Each sub-prompt has its own [Send] button and can be edited individually.

**Cost/latency warning:** Decomposition adds 1 LLM call for the split, plus 1 call per sub-prompt. A 4-part decomposition = 5 LLM calls total (~5× normal latency and cost). The "Break into steps?" suggestion shows this: "Split into 4 steps (~12s, ~5× cost)" so the user can make an informed choice.

### 10.7 Effectiveness Feedback Loop

Captures agent output after dispatch and collects user satisfaction ratings.

```typescript
interface FeedbackEntry {
  historyId: string;
  rating: 'positive' | 'negative';
  agentOutputSample?: string;  // first 500 chars of agent response
  patternsApplied: string[];
  intent: string;
  timestamp: string;
}

async function captureAgentOutput(
  sessionName: string,
  delayMs: number = 30000
): Promise<string | null> {
  await new Promise(resolve => setTimeout(resolve, delayMs));
  try {
    const target = sanitizeSessionName(sessionName);
    const result = await execFileAsync(
      'tmux', ['capture-pane', '-p', '-t', target, '-S', '-30']
    );
    return result.stdout.trim().substring(0, 500);
  } catch {
    return null;
  }
}

// On feedback received, update aggregates (survives history pruning)
function recordFeedback(
  store: StoreSchema,
  intent: string,
  patterns: string[],
  rating: 'positive' | 'negative'
): void {
  for (const pattern of patterns) {
    const key = `${intent}:${pattern}`;
    const agg = store.feedbackAggregates[key] ?? { positive: 0, negative: 0 };
    agg[rating]++;
    store.feedbackAggregates[key] = agg;
  }
}
```

**Feedback notification:** Uses Electron `Notification` API (system notification), not a panel toast. This works even when the panel is hidden in Quick Mode. Appears 30 seconds after dispatch. Auto-dismisses after 10 seconds. Thumbs-down optionally shows a text field for "What went wrong?" (single line).

**Clipboard dispatches:** Feedback notification still appears, but without agent output capture (since there's no tmux pane to read from). The user rates based on their own observation of how the improved prompt performed.

**Pattern weight adjustment:** Ratings are stored in `feedbackAggregates` (Section 7.1), NOT in history entries — so they survive history pruning. The feedback data informs V2's Adaptive Pattern Weights feature (Section 12.1). In V1, the data is collected but not yet used to modify behavior.

### 10.8 CLI / Pipe Mode

Standalone CLI binary that shares the core improvement engine.

```
Usage: pb [options] [prompt]

Arguments:
  prompt              Prompt text (or reads from stdin if omitted)

Options:
  --preset <name>     Apply a specific preset (review, debug, plan, etc.)
  --send <target>     Dispatch to tmux session (e.g., tmux:claude)
  --score             Show quality score only (no improvement)
  --diff              Show diff between original and improved
  --model <model>     Override default model
  --json              Output as JSON (original, improved, intent, score)
  --no-context        Skip terminal history context capture
  -h, --help          Show help

Examples:
  pb "fix the login bug"
  pb --preset review "check the auth flow"
  echo "fix bug" | pb | pbcopy
  pb --send tmux:claude --preset debug "the API returns 500"
  pb --score "review my code"
  pb --json "plan the migration" | jq .improved
```

**Implementation:** Thin wrapper using `commander`. Shares `src/core/` with the Electron app. Outputs improved prompt to stdout. Exit code 0 on success, 1 on error.

**API key resolution (priority order):**
1. `OPENROUTER_API_KEY` environment variable (works in SSH/headless)
2. keytar system keychain (same as Electron app; requires desktop session)
3. Prompt user to set one of the above

This fallback chain ensures the CLI works over SSH where keytar is unavailable.

**`--send` target parsing:**
```typescript
function parseSendTarget(target: string): { transport: 'tmux'; session: string } {
  // Format: "tmux:session-name" or just "session-name" (tmux implied)
  if (target.startsWith('tmux:')) {
    return { transport: 'tmux', session: target.substring(5) };
  }
  return { transport: 'tmux', session: target };
}
```

**Shell alias examples:**
```bash
alias cr='pb --preset review --send tmux:claude'
alias dbg='pb --preset debug --send tmux:claude'
alias plan='pb --preset plan'
```

---

## 11. Error Handling

### 11.1 Error Types

| Error | User Message | Recovery |
|-------|--------------|----------|
| No API key | "Please add your OpenRouter API key in Settings" | Link to settings |
| API error | "OpenRouter error: [details]. Try again?" | Retry button; original prompt preserved |
| Rate limit | "Rate limited. Wait [N]s and try again." | Countdown timer with visual progress; disable Improve button until timer expires |
| No tmux | "tmux not found. Using clipboard." | Auto-fallback to clipboard |
| Network offline | "No internet connection" | Retry when online; consider offline rule-based fallback (P2) |
| Session not found | "Session '[name]' no longer exists" | Fall back to clipboard; refresh session list |
| tmux version issue | "tmux version [X] may have compatibility issues" | Show warning, attempt dispatch anyway |

### 11.1b Rate Limiting

Simple client-side throttle to respect OpenRouter limits and prevent accidental rapid-fire:

```typescript
const RATE_LIMIT = {
  maxRequestsPerMinute: 20,
  minIntervalMs: 1000,      // minimum 1s between requests
};

let lastRequestTime = 0;
let requestCount = 0;
let windowStart = Date.now();

function canMakeRequest(): { allowed: boolean; waitMs: number } {
  const now = Date.now();
  // Reset window every 60s
  if (now - windowStart > 60_000) {
    requestCount = 0;
    windowStart = now;
  }
  // Check min interval
  const sinceLastRequest = now - lastRequestTime;
  if (sinceLastRequest < RATE_LIMIT.minIntervalMs) {
    return { allowed: false, waitMs: RATE_LIMIT.minIntervalMs - sinceLastRequest };
  }
  // Check per-minute cap
  if (requestCount >= RATE_LIMIT.maxRequestsPerMinute) {
    return { allowed: false, waitMs: 60_000 - (now - windowStart) };
  }
  return { allowed: true, waitMs: 0 };
}
```

**UI behavior:** When rate-limited, the Improve button shows a countdown ("Wait 3s...") and is disabled. No request queue — the user simply waits and tries again. This is the simplest approach and avoids the complexity of background queues.

### 11.2 Logging

- Use electron-log for file-based logging
- Log levels: error, warn, info, debug
- Include context: timestamp, operation, error details
- Rotate logs weekly, keep 4 weeks

---

## 12. V2 Roadmap

### 12.1 Post-V1 Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Prompt Analytics** | Weekly summary of which patterns you consistently miss; builds prompting muscle memory | P1 |
| **Custom Pattern Engine** | Users define their own patterns beyond the built-in seven | P1 |
| **Multiple LLM Providers** | Support Anthropic, OpenAI directly (skip OpenRouter) | P1 |
| **Claude Code Hook Mode** | Run as a native Claude Code hook that intercepts prompts within the CLI itself (skip Electron) | P1 |
| **Adaptive Pattern Weights** | Use accumulated effectiveness ratings to personalize pattern selection per user (builds on Section 10.7 data) | P1 |
| **Team Sharing** | Export/import presets and custom pattern configurations across teams | P2 |
| **Snippet Library** | Save frequently used prompt fragments that can be composed together | P2 |
| **Streaming Output** | Show streaming output from LLM for perceived performance improvement | P2 |
| **VS Code Extension** | Embedded panel in VS Code sidebar | P2 |
| **Multi-agent Dispatch** | Dispatch to multiple terminal sessions simultaneously for parallel agent workflows | P2 |
| **Agent Output Analysis** | Full agent response capture and quality analysis (builds on Section 10.7 feedback data) | P2 |
| **Plugin System** | Third-party pattern plugins | P3 |
| **OTA System Prompt Updates** | Update the core system prompt without requiring an app release | P3 |
| **Offline Rule-based Fallback** | Apply patterns via local rule engine when OpenRouter is unavailable | P3 |

### 12.2 Technical Debt

- Add unit tests for pattern engine, intent classification, secret detection, quality scorer
- Implement E2E tests with Playwright
- Add automated builds for macOS/Windows/Linux
- Performance optimization for large history (pagination, indexed search)
- Benchmark and optimize panel appearance latency (< 200ms target)
- Security audit of keytar integration and IPC surface area
- CLI mode packaging as standalone binary (vs requiring Node.js)

---

## 13. File Structure

```
promptbetter/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # Entry point
│   │   ├── window.ts            # Window management
│   │   ├── shortcuts.ts         # Global shortcuts
│   │   ├── ipc.ts               # IPC handlers
│   │   ├── tmux.ts              # tmux integration (sessions, dispatch, context capture)
│   │   ├── git.ts               # Git diff capture
│   │   ├── keytar.ts            # Secure storage
│   │   └── logger.ts            # Logging setup
│   ├── renderer/                # React frontend
│   │   ├── index.html           # HTML entry
│   │   ├── index.tsx            # React entry
│   │   ├── App.tsx              # Root component
│   │   ├── components/          # UI components
│   │   │   ├── InputPanel.tsx   # Input + quality score + anti-pattern tips
│   │   │   ├── OutputPanel.tsx  # Output + diff view toggle
│   │   │   ├── HistoryPanel.tsx
│   │   │   ├── PresetsPanel.tsx
│   │   │   ├── SettingsPanel.tsx
│   │   │   ├── SecretWarning.tsx    # Secret detection banner
│   │   │   ├── FeedbackToast.tsx    # Effectiveness feedback toast
│   │   │   ├── DecomposeQueue.tsx   # Decomposed sub-prompt queue
│   │   │   └── common/          # Shared components
│   │   ├── hooks/               # Custom hooks
│   │   │   ├── useQualityScore.ts
│   │   │   ├── useAntiPatterns.ts
│   │   │   ├── useSecretDetection.ts
│   │   │   └── useSlashCommands.ts
│   │   ├── stores/              # Zustand stores
│   │   │   ├── promptStore.ts
│   │   │   ├── historyStore.ts
│   │   │   ├── presetsStore.ts
│   │   │   ├── settingsStore.ts
│   │   │   └── feedbackStore.ts
│   │   └── styles/              # Tailwind styles
│   ├── core/                    # Shared core engine (used by Electron + CLI)
│   │   ├── improve.ts           # Prompt improvement pipeline
│   │   ├── classify.ts          # Intent classification
│   │   ├── score.ts             # Quality scorer
│   │   ├── secrets.ts           # Secret detection
│   │   ├── antiPatterns.ts      # Anti-pattern detection
│   │   ├── slashCommands.ts     # Slash command parser
│   │   ├── decompose.ts         # Prompt decomposition
│   │   ├── diff.ts              # Prompt diff engine
│   │   └── openrouter.ts        # OpenRouter API client
│   ├── shared/                  # Shared types/utils
│   │   ├── types.ts
│   │   ├── patterns.ts
│   │   └── constants.ts
│   ├── cli/                     # CLI / pipe mode
│   │   ├── index.ts             # CLI entry point (pb command)
│   │   └── args.ts              # Argument parsing
│   └── preload/                 # Preload scripts
│       └── index.ts
├── assets/                      # Icons, images
├── electron-builder.yml         # Build config
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

---

## 14. Acceptance Criteria (Technical)

### 14.1 Core
- [ ] Application launches without errors on macOS
- [ ] Global hotkey (Cmd+Shift+P) toggles panel from any application (warm: 200ms, cold: 500ms)
- [ ] API key stored securely in system keychain; never in plaintext files or logs
- [ ] Prompt improvement returns within 3 seconds (network permitting)
- [ ] Output field is editable; edited version is what gets dispatched
- [ ] tmux session list populates correctly; Claude Code panes auto-detected
- [ ] Prompt dispatch to tmux works for multi-line prompts via load-buffer (stdin) + paste-buffer; no shell interpolation
- [ ] Clipboard fallback works when tmux unavailable; toast confirmation shown
- [ ] Panel auto-hides after successful dispatch (Quick Mode); focus returns to previous app
- [ ] History stores at least 1,000 entries without performance degradation; oldest pruned on overflow
- [ ] History searchable by keyword; filterable by intent type and date range
- [ ] Preset selection persists across sessions
- [ ] Settings persist across application restarts
- [ ] Annotation mode shows applied patterns and rationale inline below output
- [ ] Context isolation enabled; nodeIntegration disabled in renderer
- [ ] Application builds to .dmg for macOS distribution
- [ ] Crash-free session rate > 99.5%

### 14.2 Power Features
- [ ] Secret detection catches AWS keys (AKIA...), GitHub tokens (ghp_...), OpenAI keys (sk-...), Stripe keys, PEM keys, and connection strings
- [ ] Secret detection blocks Improve/Send until user acknowledges; cannot be disabled
- [ ] Slash commands `/review`, `/debug`, `/plan`, `/implement`, `/explore`, `/refactor`, `/docs`, `/research` activate correct presets
- [ ] Slash command prefix is stripped from prompt before improvement; preset dropdown updates in real-time
- [ ] Terminal history context captures last 50 lines via `tmux capture-pane`; context fed to LLM
- [ ] Terminal context is truncated to ~2,000 tokens; fails gracefully if capture fails
- [ ] Prompt diff view shows additions in green, deletions in red; toggle between diff and plain view
- [ ] Quality score updates live as user types (debounced 300ms); shows score 1–10 with gap analysis
- [ ] Anti-pattern coaching detects at least 5 weak patterns; tips are dismissable and persist
- [ ] Git diff auto-injection activates for code-review and debugging intents; shows indicator in UI
- [ ] Git diff is truncated to ~3,000 chars; fails gracefully if not a git repo
- [ ] CLI mode (`pb` command) improves prompts from terminal; supports `--preset`, `--send`, `--score`, `--json`, stdin pipe
- [ ] CLI shares same core engine and API key as Electron app
- [ ] Prompt decomposition detects multi-intent prompts (3+ intent verbs or 2+ conjunctions)
- [ ] Decomposed sub-prompts display as numbered queue with individual Send buttons
- [ ] Effectiveness feedback appears as system notification 30s after dispatch (works even when panel hidden); auto-dismisses after 10s
- [ ] Feedback ratings stored in `feedbackAggregates` (survives history pruning); data collected for V2 adaptive weights
- [ ] Feedback notification appears for both tmux and clipboard dispatches

---

*Document Version: 3.0*  
*Maintained by: PromptBetter Engineering Team*
