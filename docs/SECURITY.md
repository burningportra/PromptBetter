# Security — PromptBetter

> Non-negotiable security rules. Read this if your change touches:
> API keys, shell commands, IPC, user input, network calls, or stored data.

## API Key Security

| Rule | Detail |
|------|--------|
| Storage | System keychain via keytar. Never plaintext files, env vars (except CLI), or electron-store |
| Validation | Check `sk-or-` prefix and minimum length before saving |
| Logging | API keys NEVER appear in log files, error reports, or console output |
| Display | Masked in UI (`••••••••`) — never show full key |
| Rotation | User can update key without losing settings or history |
| IPC | Key retrieved in main process only; passed to `core/` as argument |

## Shell Command Safety

**Every `child_process` call uses `execFile` or `spawn` with array arguments.**

```typescript
// CORRECT — array args, no shell
await execFileAsync('tmux', ['paste-buffer', '-b', 'promptbetter', '-t', target]);

// FORBIDDEN — string interpolation, shell injection risk
await exec(`tmux paste-buffer -b promptbetter -t ${target}`);
```

- Session names validated: `^[a-zA-Z0-9._-]+$` — reject anything else
- Prompt content piped via stdin to `tmux load-buffer -` — never as a shell argument
- `cwd` option used for git commands — never `cd && git`

## Electron Security

| Setting | Value | Rationale |
|---------|-------|-----------|
| `contextIsolation` | `true` | Renderer cannot access Node.js APIs |
| `nodeIntegration` | `false` | No `require()` in renderer |
| `sandbox` | `true` | OS-level process isolation |
| Content Security Policy | Strict | Restrict script sources and connections |

The preload script exposes only the minimum IPC surface via `contextBridge`. No business logic in preload.

## Secret Detection

Secret detection is **always on** — no user toggle. The 7 patterns:

1. AWS Access Keys (`AKIA...`)
2. GitHub Tokens (`ghp_...`, `ghs_...`)
3. OpenAI Keys (`sk-` but NOT `sk-or-`)
4. Stripe Keys (`sk_live_...`, `sk_test_...`)
5. Private Keys (PEM format)
6. Connection Strings (`mongodb://user:pass@...`)
7. Slack Tokens (`xoxb-...`)

When detected: warning banner, Improve/Send buttons disabled until user acknowledges.

## Network Security

- All API calls use HTTPS (OpenRouter only)
- No proxy through external servers — direct connection
- Prompt history stored locally only; transmitted only to OpenRouter for improvement
- No telemetry, no analytics, no phone-home in V1
- tmux dispatch is local `child_process` — no network

## Input Handling

| Input | Validation | Location |
|-------|-----------|----------|
| User prompt | Length cap (10,000 chars), secret scan | Renderer (core/) |
| Slash commands | Prefix match against allowlist | Renderer (core/) |
| tmux session name | Regex allowlist | Main process |
| API key | Prefix + length check | Settings UI + main process |
| IPC messages | Type validation at handler entry | Main process |
| API responses | Parse with fallback (tolerant) | Core (openrouter.ts) |

## What NOT to Worry About

- **Prompt injection:** User is the operator. Local desktop app. Self-attack has no threat model. Revisit if multi-user features added in V2.
- **History encryption at rest:** Not in V1. electron-store writes JSON to user's home directory. OS-level disk encryption is sufficient.
