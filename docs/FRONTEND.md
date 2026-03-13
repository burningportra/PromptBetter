# Frontend Conventions — PromptBetter

> React/renderer patterns, Zustand conventions, and component rules.
> Read this before building or modifying anything in `src/renderer/`.

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | ^18.3.0 |
| Styling | Tailwind CSS | ^3.4.0 |
| State | Zustand | ^5.0.0 |
| Icons | Lucide React | latest |

## Component Rules

### File Organization
- One component per file. File name matches component name: `InputPanel.tsx`
- Co-locate tests: `InputPanel.test.tsx` next to `InputPanel.tsx`
- Co-locate hooks: component-specific hooks live in `hooks/`, shared by name

### Component Structure
```typescript
// 1. Imports (React, then libraries, then local)
import { useState, useCallback } from 'react';
import { usePromptStore } from '../stores/promptStore';
import type { Preset } from '../../shared/types';

// 2. Types (if component-specific)
interface InputPanelProps {
  onImprove: (prompt: string) => void;
}

// 3. Component (named export, not default)
export function InputPanel({ onImprove }: InputPanelProps) {
  // hooks first, then handlers, then render
}
```

### Naming
- Components: `PascalCase` — `InputPanel`, `SecretWarning`
- Hooks: `camelCase` with `use` prefix — `useQualityScore`, `useSecretDetection`
- Stores: `camelCase` with `Store` suffix — `promptStore`, `settingsStore`
- Event handlers: `on` prefix for props, `handle` prefix for internal — `onImprove` / `handleKeyDown`

## Zustand Conventions

### Store Pattern
```typescript
import { create } from 'zustand';

interface PromptState {
  input: string;
  output: string;
  loading: boolean;
  error: string | null;
  setInput: (input: string) => void;
  setOutput: (output: string) => void;
}

export const usePromptStore = create<PromptState>((set) => ({
  input: '',
  output: '',
  loading: false,
  error: null,
  setInput: (input) => set({ input }),
  setOutput: (output) => set({ output }),
}));
```

### Ephemeral vs Persisted
| Store | Ephemeral | Persisted via IPC |
|-------|-----------|-------------------|
| promptStore | ✓ (input, output, loading) | — |
| settingsStore | — | ✓ (electron-store) |
| presetsStore | — | ✓ (electron-store) |
| historyStore | — | ✓ (electron-store) |
| feedbackStore | — | ✓ (electron-store) |

Persisted stores use **write-through**: every `set()` immediately calls IPC to persist.

### Hydration
On app mount, `useHydrateStores()` fetches all persisted state via IPC. UI shows skeleton during hydration.

## IPC Communication

The renderer NEVER imports from `src/main/`. All main-process communication goes through the preload context bridge.

```typescript
// In renderer — call via window.api (exposed by preload)
const result = await window.api.improvePrompt(input, options);
const sessions = await window.api.listTmuxSessions();
await window.api.dispatchPrompt(prompt, session);
```

### IPC Channels (defined in preload)
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `improve-prompt` | renderer → main → renderer | Core improvement flow |
| `dispatch-prompt` | renderer → main | Send to tmux or clipboard |
| `list-sessions` | renderer → main → renderer | tmux session discovery |
| `get-settings` | renderer → main → renderer | Hydrate settings store |
| `set-setting` | renderer → main | Persist a setting change |
| `get-history` | renderer → main → renderer | Hydrate history store |
| `add-history` | renderer → main | Save new history entry |
| `get-api-key` | renderer → main → renderer | Check if key exists (not the key itself!) |
| `set-api-key` | renderer → main | Save key to keytar |

## Real-Time Features (run in renderer via core/)

These `src/core/` functions run directly in the renderer for instant feedback — no IPC round-trip:

| Feature | Module | Trigger |
|---------|--------|---------|
| Secret detection | `core/secrets.ts` | Every keystroke (debounced 200ms) |
| Quality score | `core/score.ts` | Every keystroke (debounced 300ms) |
| Anti-pattern detection | `core/antiPatterns.ts` | Every keystroke (debounced 300ms) |
| Slash command parsing | `core/slashCommands.ts` | Every keystroke (immediate) |

This is safe because these modules are pure functions with no Node.js dependencies.

## Keyboard Handling

- Use `useEffect` with `keydown` listener on the panel container
- Check `e.metaKey` (macOS Cmd) for shortcuts
- `e.preventDefault()` on handled shortcuts to prevent browser defaults
- Tab shortcuts (`Cmd+1-4`) only active in pinned mode

## Form Rules

- Auto-focus input field on panel open
- `Cmd+Enter` submits (improve); `Enter` in textarea adds newline
- Never block paste in input fields
- Loading buttons show spinner + keep original label
- Trim whitespace from input before processing
- Warn on unsaved changes (custom presets only)
