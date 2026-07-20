# bp-auto-context-injection

OMP Extension generates `<bp-context>` block on `session_start`. Sub-agents get context without calling `bp context <step>` themselves. Compact paths-only context map sized for OMP message budgets.

## Problem

Currently every sub-agent begins by running `bp context <step>` to load specs, conventions, and change artifacts. This call happens inside the agent's working context — meaning the agent spends 5-25 reads and 500-3000 tokens on every session fetching context the platform already could have supplied.

On the OMP Desktop runtime the agent session already has a `session_start` event that fires before the first agent turn. This is a natural injection point.

## Solution

The OMP Extension intercepts `session_start`, shells out to `bp context --format=compact`, and injects the result as a `<bp-context>...</bp-context>` block inside the initial agent message. The block contains only paths, titles, and line counts — never full file content — staying under 4 KB even at 200+ specs.

- **PR-1**: spec-injector core export `generateCompactContext` + `formatContextCompact` + `formatContextCompactJson`
- **PR-2**: `bp context <step> [--format=full|compact|json] [--change <name>]`
- **PR-3**: `context.jsonl` per-change artifact + Zod validator + planner-write contract
- **PR-4**: OMP Extension generator pipeline + runtime handlers
- **PR-5**: Update sub-agent prompts and workflow templates to declare auto-injection
- **PR-6**: Dogfood + e2e + stale-spec refresh + docs

### Context Budget

Compact = 4 KB ceiling (paths + titles + line counts only). Full-file injection lives until the executor actually reads a spec via `read <path>`.

## Must Have

- `bp context --format=compact` emits `<bp-context>` block paths-only
- OMP Extension `session_start` injects `<bp-context>` block
- Per-change `context.jsonl` artifact with Zod validation
- All three sub-agents (planner, executor, reviewer) get role-augmented context

## Must NOT Have

- No full-file injection at session start
- No lazy-load from agent prompt (agent must NOT need to call `bp context`)
- No changes to any third-party plugin or runtime outside Blueprint's own files
