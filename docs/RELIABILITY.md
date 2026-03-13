# Reliability — PromptBetter

> Performance targets, latency budgets, and reliability requirements.
> These are acceptance criteria — code that misses these targets is not shippable.

## Latency Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Warm toggle (hide/show) | < 200ms | Keypress → panel visible |
| Cold start (first activation) | < 500ms | Keypress → panel visible |
| API improvement call | < 3s | Request sent → response parsed |
| Secret detection | < 5ms | `detectSecrets()` on typical input |
| Quality scoring | < 10ms | `scorePrompt()` on typical input |
| Slash command parsing | < 1ms | `parseSlashCommand()` |
| History load (1000 entries) | < 100ms | Store read → Zustand hydrated |
| Zustand hydration (all stores) | < 100ms | IPC round-trip → stores populated |
| electron-store write | < 5ms | JSON serialization + disk write |

## Reliability Targets

| Metric | Target |
|--------|--------|
| Crash-free sessions | > 99.5% |
| tmux dispatch success | > 95% |
| Build success rate | 100% |
| Security incidents (key exposure) | 0 |
| Unhandled promise rejections | 0 |

## Resource Budgets

| Resource | Budget |
|----------|--------|
| System prompt tokens | ~800 |
| User prompt (typical) | ~100 tokens |
| Terminal context cap | ~2,000 tokens |
| Git diff cap | ~3,000 chars (~750 tokens) |
| Total input tokens (typical call) | ~2,150 |
| Max response tokens | 1,000 |
| History entries | 1,000 max (oldest pruned) |
| Prompt length cap | 10,000 characters |
| Log retention | 4 weeks, rotate weekly |

## Error Recovery

Every error MUST have a recovery path. See `docs/design-docs/technical-specification.md` Section 11 for the full error table.

| Error Class | Recovery |
|-------------|----------|
| Network | Retry button, auto-retry on reconnect |
| API (server) | Retry with exponential backoff (max 3) |
| API (auth) | Link to settings |
| Rate limit (client) | Countdown timer on button |
| Rate limit (server) | Respect `Retry-After` header |
| tmux failure | Auto-fallback to clipboard |
| Missing config | First-run banner with setup link |

## Testing Requirements

| Layer | Coverage Target | Framework |
|-------|----------------|-----------|
| `src/core/` | > 90% line coverage | Vitest |
| `src/main/` (tmux, IPC) | Integration tests | Vitest |
| End-to-end | 7 critical scenarios | Playwright/Spectron |
| Performance | All latency targets | Benchmark assertions |

## Monitoring (Local Only)

All metrics are local-only counters in electron-store. No network transmission.

- API call latency (p50, p95)
- Dispatch success/fail rate
- Secret detection trigger count
- Slash command usage frequency
- Quality score distribution (pre/post improvement)
