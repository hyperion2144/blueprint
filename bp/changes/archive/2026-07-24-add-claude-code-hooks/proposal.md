# Proposal: add-claude-code-hooks

<!--
  Human-AI agreement. Captures WHY and WHAT, not HOW.
-->

## Level

**Level**: standard
**Auto-assessed**: yes (cross-module, new behavior, medium risk; not critical because no auth/payment/data-integrity path)

## Intent

Blueprint's `claude-code` platform integration currently generates only `commands` and `agents` (`.claude/commands/bp-*.md` + `.claude/agents/bp-*.md`). It does NOT generate Claude Code's native hook system at `.claude/settings.json`, even though Claude Code supports 9 hook events (PreToolUse/PostToolUse/UserPromptSubmit/Notification/Stop/SubagentStop/PreCompact/SessionStart/SessionEnd) with `command` payloads — a first-class extension point comparable to OMP's Extension and Codex's `.codex/hooks.json`. As a result, Blueprint users on Claude Code have no first-class `bp` context injection at session start, no workflow-state reinjection on tool use, and no pre-compaction recovery — they only get the file-based commands/agents. This change adds Claude Code hook support mirroring the recently-archived `add-codex-support` design (DS-1: provider + 5 events; DS-2: byte-deterministic handler runtime; DS-3: integration touchpoints) so the three platforms (omp, codex, claude-code) reach feature parity on the runtime contract.

## Scope

### In Scope

- Extend `claude-code` platform provider to emit `.claude/settings.json` with 5 hook events: `SessionStart`, `SessionStop`, `UserPromptSubmit`, `PreToolUse` (matcher `Bash`), `PostToolUse` (matcher `Bash`). Choose the 5-event set for codex parity per user direction (out of 9 supported events).
- Generate `.claude/hooks/bp-claude-handler.mjs` — independent runtime handler, NOT shared with the codex handler. Mirrors the codex design (byte-deterministic `HANDLER_SOURCE` template, DI seam for `execBpContext`).
- Apply identical handler semantics: SessionStart emits `additionalContext` populated by `bp context apply --format=compact`; UserPromptSubmit/PreToolUse/PostToolUse emit workflow-state; SessionStop is no-op. Same bypass rules (`BP_HOOKS=0` / `BP_DISABLE_HOOKS=1` / missing `bp/config.yaml`).
- Add stale-file cleanup in `bp update` for `.claude/settings.json` and `.claude/hooks/bp-claude-handler.mjs` (analogous to existing codex cleanup).
- Update `bp/specs/platform-gen/spec.md` with new `Requirement: claude-code-hook-runtime` plus a MODIFIED requirement for the existing 4-platform rule.
- Update `docs/platform-integration.md` with a "Claude Code — Settings and Hooks" section parallel to the Codex section.
- Update `README.md` and `AGENTS.md` to note that claude-code now includes hooks parity.
- Add unit + snapshot tests for the new generator functions and the new handler runtime.

### Out of Scope

- **The other 4 Claude Code hook events** (`Notification`, `Stop`, `SubagentStop`, `PreCompact`). Deferred — out of the chosen 5-event parity set. May be added in a follow-up change.
- **`.agent` platform hooks**. The `.agent` integration has no hook system; adding it would require a different surface (or no-op).
- **Shared handler between claude-code and codex**. Per user direction, each platform gets its own runtime handler. The two `handler.tmpl.ts` templates will be near-duplicates; consolidation is a future refactor (not a regression risk for this change).
- **Dispatch table changes**. `bp dispatch` for claude-code already has the right entry (`tool: agent`, `subagent_type: bp-<role>`); no worktree primitive needed because Claude Code does isolation natively.
- **Init wizard changes**. `codex` is already a wizard option; this change does not change wizard surface (no new option, no new exclusion).
- **Documentation sweep for `.agent`**. Out of scope.

## Approach

Add hook generation to the existing `src/integrations/claude-code/` directory. Two new source files mirror the codex layout: `hooks.ts` (emits `.claude/settings.json`) and `handler.ts` (exports testable helpers + byte-deterministic handler descriptor). One new template `src/templates/claude-code/handler.tmpl.ts` houses the `HANDLER_SOURCE` string constant, parallel to `src/templates/codex/handler.tmpl.ts`. The two template files will be near-duplicates; we explicitly do NOT extract a shared base in this change to keep each platform's handler independently readable.

Claude Code's settings.json schema differs from codex's hooks.json in one key way: the hooks are nested under a top-level `hooks` key (similar to codex) but each entry has a `matcher` and an array of hook objects with a `type` and `command`. The same JSON shape pattern as codex — only the file path differs (`.claude/settings.json` vs `.codex/hooks.json`).

The handler runtime contract is identical to codex (DI seam, byte-determinism, bypass on env). The only differences:
- Hook script lives at `.claude/hooks/bp-claude-handler.mjs` (not `.codex/hooks/bp-handler.mjs`)
- `bp context` invocation in the runtime uses the same `apply --format=compact` form
- JSON output format (the `continue` + `hookSpecificOutput.additionalContext` shape) is the same — codex and claude-code both follow the Claude Code hook JSON protocol (the codex team adopted it)

Alternatives considered:
- **Reuse codex handler** (`.codex/hooks/bp-handler.mjs` referenced by claude-code hooks.json) — rejected per user direction; cross-platform coupling is worse than a 100-line duplication.
- **Reuse codex HANDLER_SOURCE template by parametrizing** — rejected for v1; deferred as a "consolidate two platform handlers" follow-up change.
- **Generate handler.mjs into a shared `.bp/hooks/` directory** — rejected; breaks the platform-isolated mental model and complicates `.gitignore` (one more path to teach users).

## Deliverables

### PR-1: claude-code hooks generator + handler runtime

- **Source**: specs/platform-gen/spec.md (existing, will be extended in PR-3)
- **Behavior**: The system SHALL extend the `claude-code` `PlatformProvider` to emit `.claude/settings.json` (with the 5-event hook table) and `.claude/hooks/bp-claude-handler.mjs` (byte-deterministic handler sourced from `HANDLER_SOURCE` template). The handler SHALL populate `additionalContext` with the `bp context apply --format=compact` output and SHALL fall back to an empty `<bp-context></bp-context>` block on any failure (binary absent, non-zero exit, malformed output).
- **Verify**: `npx vitest run src/integrations/claude-code/` passes; snapshot test of `.claude/settings.json` matches expected JSON shape (5 events, Bash matchers on tool events, command paths reference `.claude/hooks/bp-claude-handler.mjs`); snapshot test of handler.mjs content shows the same byte-deterministic template; full test suite (277+ tests) passes.
- **Files**:
  - `src/integrations/claude-code/hooks.ts` (NEW)
  - `src/integrations/claude-code/handler.ts` (NEW)
  - `src/integrations/claude-code/hooks.test.ts` (NEW)
  - `src/integrations/claude-code/handler.test.ts` (NEW)
  - `src/integrations/claude-code/__snapshots__/hooks.test.ts.snap` (NEW)
  - `src/integrations/claude-code/__snapshots__/handler.test.ts.snap` (NEW)
  - `src/integrations/claude-code/index.ts` (MODIFIED — register hooks + handler in generate())
  - `src/templates/claude-code/handler.tmpl.ts` (NEW — HANDLER_SOURCE constant)
  - `src/core/platform-registry.ts` (MODIFIED — comment update only)
  - `src/integrations/omp/index.ts` (MODIFIED — comment update only)

### PR-2: integration touchpoints (bp update cleanup, config validation)

- **Source**: specs/platform-gen/spec.md, specs/init/spec.md
- **Behavior**: The system SHALL add cleanup of `.claude/settings.json` and `.claude/hooks/bp-claude-handler.mjs` in `bp update` (only the bp-generated entries, preserving user-added files). The system SHALL continue to accept `claude-code` in config validation; the existing 4-platform rule remains.
- **Verify**: `bp update` after manually creating `.claude/notes.txt` does NOT delete `notes.txt`; removes only the bp-generated `settings.json` and `bp-claude-handler.mjs`. Existing claude-code tests still pass.
- **Files**:
  - `src/commands/bp-update.ts` (MODIFIED — add cleanup for `.claude/settings.json` and `.claude/hooks/bp-claude-handler.mjs`)
  - `tests/commands/bp-update.test.ts` (MODIFIED — assert cleanup behavior)
  - `tests/integration/lifecycle.test.ts` (MODIFIED — assert 4-platform lifecycle still works)

### PR-3: docs + spec delta

- **Source**: specs/platform-gen/spec.md (delta spec)
- **Behavior**: The system SHALL add a `Requirement: claude-code-hook-runtime` to the platform-gen spec with Given/When/Then scenarios, update `docs/platform-integration.md` with a "Claude Code — Settings and Hooks" section parallel to the existing OMP and Codex sections, and add codex+claude-code platform rows to `README.md` and `AGENTS.md`.
- **Verify**: `docs/platform-integration.md` includes the new section; `bp/specs/platform-gen/spec.md` includes the new requirement; all docs builds and links pass.
- **Files**:
  - `bp/changes/add-claude-code-hooks/specs/platform-gen/spec.md` (NEW — delta spec)
  - `docs/platform-integration.md` (MODIFIED — add Claude Code section)
  - `README.md` (MODIFIED — note claude-code hooks parity)
  - `AGENTS.md` (MODIFIED — note claude-code hooks parity)
  - `bp/specs/platform-gen/spec.md` (MODIFIED — append new requirement; merge in via archive)

## Dependencies

None — all prerequisite infrastructure (`PlatformProvider`/`PlatformRegistry`, `WORKFLOW_REGISTRY`, `AGENT_PROMPTS`, dispatch tables, init wizard) already exists. The recently-archived `add-codex-support` change provides the design pattern to mirror; this change explicitly does not depend on codex's handler internals (intentional, per "independent handler" decision in Approach).

## Roadmap Reference

- **Milestone**: M1 - v2 Architecture Refactoring
- **Phase**: P1.3 - Platform Integration & Testing (will become 5/5 after this change, with claude-code reaching full hook parity with codex and OMP)
