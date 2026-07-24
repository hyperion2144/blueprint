# Proposal: add-codex-support

<!--
  Human-AI agreement. Captures WHY and WHAT, not HOW.
  Planner reads this to produce design.md, tasks.md, delta specs.
-->

## Level

**Level**: standard
**Auto-assessed**: yes (cross-module, new platform integration, medium risk; not critical because no auth/payment/data-integrity path)

## Intent

Blueprint currently generates platform integration files for `omp`, `claude-code`, and `agent`, but provides no first-class support for OpenAI's Codex CLI. Codex is now a widely-deployed coding agent with first-class hooks (`PreToolUse`/`PostToolUse`/`SessionStart`/`SessionStop`/`UserPromptSubmit`) and a project-scoped Skills mechanism (`.agents/skills/<name>/SKILL.md`) that replaces the deprecated `/prompts:` system. Users running Blueprint workflows inside Codex have to hand-craft the bridge, which is error-prone and drifts from `bp update`. This change adds `codex` as a first-class platform alongside `omp` and `claude-code`, so `bp init`/`bp update` regenerate the bridge automatically and stay in sync with workflow changes.

## Scope

### In Scope

- Add `codex` as a registered `PlatformProvider` alongside `omp`/`claude-code`/`agent`
- Generate project-scoped Skills at `.agents/skills/bp-<step>/SKILL.md` for all 10 workflow steps (init, roadmap, propose, plan, apply, review, archive, continue, ff, loop) — `name: bp:<step>` frontmatter so users invoke them as `/bp:init`, `/bp:propose`, etc.
- Generate `.codex/hooks.json` wiring all 5 Codex lifecycle events (`SessionStart`/`SessionStop`/`UserPromptSubmit`/`PreToolUse`/`PostToolUse`) to bp runtime — mirroring the OMP Extension contract (session_start emits bp-context, before/after agent hooks re-inject workflow-state, post-compaction recovery)
- Implement the hook handler scripts (TypeScript, compiled; same runtime contract as OMP Extension)
- Add `codex` to the `bp init` wizard platform picker with description of what files it generates
- Add `.codex/`, `.agents/` to the gitignore written by `bp init`
- Add stale-file cleanup in `bp update` for `.codex/hooks.json` and stale `.agents/skills/bp-*` (analogous to existing `.omp/skills/` and `.agent/skills/` cleanup)
- Add `codex` entry to `bp dispatch` `EXECUTOR_ISOLATION` and `FORMATS` tables — define Codex-specific sub-agent isolation model (codex `exec --cd <worktree>` equivalent or `git worktree add` fallback) and dispatch format (`tool: agent` or `tool: task` depending on what Codex MCP exposes)
- Update config template `platform` enum to include `codex`
- Update `specs/platform-gen/spec.md` with codex capability contract
- Update `docs/platform-integration.md`, `README.md`, `AGENTS.md` to document codex platform parity

### Out of Scope

- **Runtime dispatch awareness inside executor/dispatch** beyond the dispatch table entry — i.e., executor sub-agents do not need codex-specific prompt changes; the dispatch table change is sufficient. Defer deeper Codex MCP integration (e.g., executor calling `codex exec` as a tool) to a separate change.
- **Codex AGENTS.md generator** — Codex auto-loads project `AGENTS.md` files, but generating bp-specific AGENTS.md fragments is a separate concern (deferred to a polish change).
- **Codex Plugin marketplace packaging** (`codex plugin marketplace`) — that's an OpenAI marketplace distribution mechanism, not a workflow-bridge surface. Out of scope.
- **Migration from `/prompts:` to Skills** for users already on codex v0.89-0.139 — Codex deprecated `/prompts:` in v0.89 (2026-01). This change assumes users run codex v0.140+ where Skills is the supported mechanism. v0.125–0.139 users get no `codex` option in the init wizard.
- **Brownfield stack detection of codex** (e.g., detecting `.codex/` in existing repos during `bp init --brownfield`) — this is a follow-up change because it requires defining what "brownfield codex" means (existing `.codex/hooks.json`? existing `~/.codex/AGENTS.md`?). Defer.

## Approach

Add a new `src/integrations/codex/` directory mirroring the structure of `claude-code/` (compact platform with two surface types) and `omp/` (for the runtime Extension-equivalent in hooks.ts). The platform provider registers itself via the existing `PlatformRegistry` mechanism — no changes needed to `platform-registry.ts` beyond a comment update. Skills generation reuses the same `WORKFLOW_REGISTRY` and `AGENT_PROMPTS` sources that `omp`/`claude-code` already use; the only codex-specific concern is the SKILL.md frontmatter format (`name:`, `description:`, no `argument-hint`) and the file layout (one folder per skill, not flat files). Hook generation is more substantive: each of the 5 Codex events maps to a handler script that calls into the existing `bp` CLI (`bp context --format=compact`, `bp state`, etc.) — the handler source is a TypeScript template compiled to JS at update-time, mirroring OMP's `extension.tmpl.ts` byte-deterministic generation pattern.

The dispatch table entry requires deciding Codex's sub-agent isolation model. Codex `exec` supports `--cd <dir>` to set working directory but does not have a native worktree primitive equivalent to OMP's `isolated: true` or Claude's `.claude/worktrees/`. The pragmatic choice: **Codex uses `git worktree add` orchestration** (same as the existing `agent` platform's fallback path). Document this in the dispatch entry.

Alternatives considered:
- **Codex Plugin marketplace packaging** — rejected; marketplace is for API extensions, not workflow bridges.
- **Skills-only, skip hooks** — rejected; the user explicitly requested "command + hook" and 5-event hook parity with OMP Extension is the meaningful bridge.
- **Generate `.codex/skills/` instead of `.agents/skills/`** — rejected; Codex v0.140+ canonical lookup path is `.agents/skills/`, not `.codex/skills/`. Source: codex CLI docs + GitHub issue #13893.

## Deliverables

### PR-1: codex platform provider + skills/hooks generators

- **Source**: specs/platform-gen/spec.md (existing, will be extended in PR-3)
- **Behavior**: The system SHALL register a new `codex` `PlatformProvider` and expose `generateCodexSkills(config)` and `generateCodexHooks(config)` functions that emit `.agents/skills/bp-<step>/SKILL.md` (10 files) and `.codex/hooks.json` (1 file) with all 5 hook events wired to bp handler stubs.
- **Verify**: `npx vitest run src/integrations/codex/` passes; snapshot test of generated `.agents/skills/bp-propose/SKILL.md` matches the expected SKILL.md frontmatter (`name: bp:propose`, `description: ...`, no `argument-hint`); `bp update --dry-run` (when supported) lists 11 new files when `platform: [codex]` is in config.
- **Files**:
  - `src/integrations/codex/index.ts` (NEW)
  - `src/integrations/codex/skills.ts` (NEW)
  - `src/integrations/codex/hooks.ts` (NEW — JSON-only, no handler logic yet)
  - `src/integrations/codex/skills.test.ts` (NEW)
  - `src/integrations/codex/hooks.test.ts` (NEW)
  - `src/integrations/codex/__snapshots__/` (NEW — 2 snapshot files)
  - `src/integrations/index.ts` (MODIFIED — add `codex` export)
  - `src/generators/index.ts` (MODIFIED — register codex provider)
  - `src/core/platform-registry.ts` (MODIFIED — comment update only)
  - `src/integrations/omp/index.ts` (MODIFIED — comment update only)
  - `src/templates/artifacts/index.ts` (MODIFIED — add `codex` to config platform list at line 790)

### PR-2: integration touchpoints (init wizard, gitignore, update cleanup, dispatch)

- **Source**: specs/platform-gen/spec.md, specs/init/spec.md
- **Behavior**: The system SHALL treat `codex` as a first-class platform option in `bp init` (wizard picker), include `.codex/` and `.agents/` in the auto-generated `.gitignore`, clean up stale `.codex/hooks.json` and stale `.agents/skills/bp-*` directories in `bp update`, and emit codex-specific sub-agent dispatch instructions from `bp dispatch` with `EXECUTOR_ISOLATION.type: none` (orchestrator runs `git worktree add`) and `FORMATS.tool: task` (Codex MCP tool name TBD during implementation — default to `task` and document override path).
- **Verify**: `bp init` wizard shows a `Codex CLI` option in the platform multi-select; running `bp update` after manually creating `.codex/foo.txt` does NOT delete `.codex/foo.txt` (only `hooks.json`) and removes any `.agents/skills/bp-archive-old/` directories; `bp dispatch executor --change <name>` for codex platform prints dispatch instructions referencing `git worktree add`; `npx vitest run tests/integration/lifecycle.test.ts` passes with codex added to default platform list.
- **Files**:
  - `src/prompts/init-wizard.ts` (MODIFIED — add codex option)
  - `src/commands/bp-init.ts` (MODIFIED — add `.codex/`, `.agents/` to gitignore entries)
  - `src/commands/bp-update.ts` (MODIFIED — add cleanup for `.codex/hooks.json` and stale `.agents/skills/bp-*`)
  - `src/commands/bp-dispatch.ts` (MODIFIED — add `codex` entry to `EXECUTOR_ISOLATION` and `FORMATS`)
  - `tests/commands/bp-init.test.ts` (MODIFIED — assert codex option)
  - `tests/commands/bp-update.test.ts` (MODIFIED — assert cleanup behavior)
  - `tests/commands/bp-dispatch.test.ts` (MODIFIED — assert codex dispatch output)
  - `tests/integration/lifecycle.test.ts` (MODIFIED — add codex platform to greenfield scenario)

### PR-3: docs + spec + handler scripts (runtime)

- **Source**: specs/platform-gen/spec.md (delta spec)
- **Behavior**: The system SHALL implement the 5 Codex hook event handlers as a single TypeScript template (compiled to JS at update-time, byte-deterministic like OMP Extension), with each handler emitting a `bp-context`/`bp-workflow-state`-equivalent payload for codex's hook protocol. The system SHALL update `docs/platform-integration.md` with a "Codex" section parallel to the OMP section, add a codex platform row to `README.md` and `AGENTS.md` platform tables, and update `specs/platform-gen/spec.md` with a new `Requirement: codex-platform-support` covering Skills layout, hooks.json shape, and the 5-event contract.
- **Verify**: Generated `.codex/hooks.json` references the compiled handler script paths; running `bp update` with `platform: [codex]` produces a handler script under `.codex/` (path TBD during implementation, possibly `.codex/hooks/bp-handler.mjs`) and the hooks.json references it; `docs/platform-integration.md` includes a "## Codex" section; `specs/platform-gen/spec.md` includes the new requirement; `npx vitest run` full suite passes.
- **Files**:
  - `src/integrations/codex/handler.ts` (NEW — handler logic, calls `bp context`/`bp state`)
  - `src/templates/codex/handler.tmpl.ts` (NEW — byte-deterministic template)
  - `src/integrations/codex/hooks.ts` (MODIFIED — wire handler into hooks.json instead of stubs)
  - `src/integrations/codex/hooks.test.ts` (MODIFIED — assert handler references)
  - `docs/platform-integration.md` (MODIFIED — add Codex section)
  - `README.md` (MODIFIED — add codex to platform list)
  - `AGENTS.md` (MODIFIED — add codex to platform list)
  - `bp/specs/platform-gen/spec.md` (MODIFIED — add `Requirement: codex-platform-support`)
  - `bp/changes/add-codex-support/specs/platform-gen/` (NEW — delta spec directory)

## Dependencies

None — all prerequisite infrastructure (`PlatformProvider`/`PlatformRegistry`, `WORKFLOW_REGISTRY`, `AGENT_PROMPTS`, dispatch tables) already exists.

## Roadmap Reference

- **Milestone**: M1 - v2 Architecture Refactoring
- **Phase**: P1.3 - Platform Integration & Testing (will become 4/4 instead of 3/3 after this change)
