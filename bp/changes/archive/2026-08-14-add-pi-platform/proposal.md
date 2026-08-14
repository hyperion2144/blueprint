# Proposal: add-pi-platform

## Level

**Level**: standard
**Auto-assessed**: auto-assessed (new platform integration — cross-module, new runtime behavior)

## Intent

Blueprint generates workflow files for AI coding harnesses (OMP, Claude Code, .agent, Codex, OpenCode). Pi is missing. Developers using the pi coding agent (including this repo's own maintainers — this session runs in pi) get no generated platform files: no skills, no sub-agents, and — critically — no auto context injection. In pi sessions, the OMP Extension's context contract (session-start bp-context, per-session workflow-state, post-compaction re-injection) does not exist, so blueprint changes run without roadmap state, guard-rail invariants, or tasks.md acceptance context.

This change adds a pi platform provider generating to `.pi/` (skills, agents, extension), closing the parity gap with OMP.

## Scope

### In Scope

- New `pi` PlatformProvider registered in PlatformRegistry, generating into `.pi/`
- `.pi/skills/bp-<step>/SKILL.md` — 11 workflow-step skills (Agent Skills standard format)
- `.pi/agents/bp-<role>.md` — 6 sub-agent definitions (planner, executor, reviewer, codebase-scanner, refactorer, fixer)
- `.pi/extensions/bp/index.ts` — extension: full OMP context-injection port + bp sub-agent invocation tool
- `bp update` stale-file cleanup for `.pi/` (mirrors existing `.agents/` handling)
- `pi` added to this repo's `bp/config.yaml` platform list
- Tests: snapshot tests for skills + agents, extension determinism + runtime tests

### Out of Scope

- Theme generation (`.pi/themes/`) — not part of bp workflow value
- Settings generation (`.pi/settings.json`) — no bp-owned settings needed
- Migrating existing `.agents/skills/` (codex platform output) into `.pi/` — codex keeps its output
- Native pi-core agent discovery — pi core does not discover `.pi/agents/`; agents are invoked via the bp extension's subagent tool (pi's documented example-extension pattern)

## Research Landscape

> This change was informed by investigation of:
>
> - Pi docs (skills.md, extensions.md, examples/extensions/subagent/): pi loads project skills from `.pi/skills/`; extensions from `.pi/extensions/*/index.ts`; agent definitions at `.pi/agents/*.md` are a convention of the shipped subagent example extension (frontmatter name/description/tools + body = system prompt), NOT discovered by pi core. Pi extension events map 1:1 to OMP hooks: `session_start`, `before_agent_start` (returns `{message: {customType, ...}}`), `context` (mutates `event.messages`).
> - src/templates/omp/extension.tmpl.ts: the OMP extension contract to port — 3 handlers, `_bpStateInjected` once-per-session gate, `BP_HOOKS=0`/`BP_DISABLE_HOOKS=1` bypass, no-op without `bp/config.yaml`.
> - src/integrations/codex/ (skills.ts, index.ts): the provider registration pattern for a skills-only CLI platform (supportsCommands: false).

## Approach

Mirror the codex integration for provider shape (id `pi`, display name "Pi Coding Agent", `supportsCommands: false`), and the OMP integration for the extension contract. Three generated artifact groups, all under `.pi/`:

1. **Skills**: 11 `bp:<step>` skills from WORKFLOW_REGISTRY (same steps/descriptions as codex, pi path `.pi/skills/bp-<step>/SKILL.md`).
2. **Agents**: 6 `bp-<role>.md` files from src/templates/agents/ system prompts (frontmatter: name, description, tools; body = system prompt).
3. **Extension**: `.pi/extensions/bp/index.ts` — self-contained TS source emitted from a byte-deterministic template (src/templates/pi/extension.tmpl.ts), with a testable TS runtime counterpart (src/integrations/pi/extension-runtime.ts) following the OMP extension.tmpl.ts / extension-runtime.ts split. The extension ports the 3 context handlers to pi's API (agent type detected from system prompt text since pi has no agentTemplate) and registers a `bp_subagent` tool that discovers `.pi/agents/` and spawns isolated pi subprocesses (json mode) — the example-extension pattern, lean version.

Registration, config, cleanup: register provider in src/generators/index.ts + integrations barrel, add `pi` to bp/config.yaml, extend `cleanupStaleFiles` in bp-update to remove stale `.pi/extensions/bp/`, `.pi/skills/bp-*`, `.pi/agents/bp-*` when pi is no longer configured.

Known accepted tradeoff: when both `codex` and `pi` are configured, `bp-*` skills exist in both `.agents/skills/` and `.pi/skills/`. Confirmed acceptable — only one harness runs at a time; pi tolerates duplicate skill names (user decision, recorded in grilling Q2).

## Deliverables

### PR-1: Pi platform provider + skills

- **Domain**: specs/platform-gen/spec.md
- **Behavior**: The system SHALL register a `pi` PlatformProvider (display name "Pi Coding Agent", `supportsCommands: false`) whose generate() emits 11 skill files at `.pi/skills/bp-<step>/SKILL.md`, one per workflow step (init, roadmap, propose, plan, apply, check, archive, continue, ff, loop, refactor), with Agent-Skills-standard frontmatter (`name: bp:<step>`, description) and bodies from WORKFLOW_REGISTRY.

**Rationale**: User request: "新增一个pi的平台支持，生成目录为.pi". Grilling Q1: skills + agents + extension all three; Q2: duplicate bp-* skills across .agents/skills (codex) and .pi/skills (pi) accepted — pi handles duplicates. Skills are the passive-disclosure layer: descriptions always in context, bodies load on demand. pi reads `.pi/skills/` natively (project skills, after trust).

**Research**:

| Source | Finding | Impact |
|--------|---------|--------|
| pi docs/skills.md | `.pi/skills/` discovered; dirs with SKILL.md recursive; root .md also individual skills | Path = `.pi/skills/bp-<step>/SKILL.md` |
| src/integrations/codex/skills.ts | 11-step defs, WORKFLOW_REGISTRY bodies, frontmatter name/description only | Reuse step list + description wording; swap path to `.pi/skills/` |

**Alternatives Considered**:

| Alternative | Reason Rejected |
|-------------|----------------|
| Reuse codex's `.agents/skills/` output for pi (no pi skills) | User explicitly wants `.pi/` output; pi platform must be self-contained (not depend on codex being configured) |

**Risks & Mitigations**:

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Duplicate bp-* skill names when codex + pi both configured | med | Accepted by user; pi tolerates duplicates; only one harness runs at a time |

- **Verify**: `node bin/cli.js update` with `platform: [pi]` emits exactly 11 `.pi/skills/bp-<step>/SKILL.md`; snapshot test matches codex pattern; each file has name/description frontmatter and non-empty body.
- **Files**: src/integrations/pi/index.ts, src/integrations/pi/skills.ts, src/integrations/pi/**snapshots**/skills.test.ts.snap

### PR-2: Sub-agent definitions

- **Domain**: specs/platform-gen/spec.md
- **Behavior**: The system SHALL emit 6 agent definition files at `.pi/agents/bp-<role>.md` (planner, executor, reviewer, codebase-scanner, refactorer, fixer), each with frontmatter (`name: bp-<role>`, description, tools) and body equal to the corresponding system prompt from src/templates/agents/, per pi's subagent-example agent format.

**Rationale**: Grilling Q1: pi needs skill, agent, extension — all three. pi core does not natively discover `.pi/agents/`; the format comes from pi's shipped examples/extensions/subagent (agents.ts: loadAgentsFromDir parses frontmatter name/description/tools + body as systemPrompt; discoverAgents finds `<cwd>/.pi/agents`). Agent files are consumed by the bp extension's subagent tool (PR-3) — that is pi's documented project-local agent pattern.

**Research**:

| Source | Finding | Impact |
|--------|---------|--------|
| examples/extensions/subagent/agents.ts | Frontmatter {name, description, tools?, model?} + body = systemPrompt; dir = CONFIG_DIR_NAME/agents | Exact file format + discovery path |
| src/templates/agents/index.ts | 6 agent system prompts (planner, executor, reviewer, codebase-scanner, refactorer, fixer) | Bodies; tools lists per role |

**Alternatives Considered**:

| Alternative | Reason Rejected |
|-------------|----------------|
| Hardcode agent prompts inside extension only (no files) | User asked for agent files; file-based matches OMP/Claude `.agents/` pattern and allows user edits without touching extension |

**Risks & Mitigations**:

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Agents inert without the bp extension loaded | low | Extension ships with same platform; documented in extension header |

- **Verify**: generate with `platform: [pi]` emits 6 `.pi/agents/bp-<role>.md`; snapshot test; each file parses via frontmatter with non-empty body.
- **Files**: src/integrations/pi/agents.ts, src/integrations/pi/**snapshots**/agents.test.ts.snap

### PR-3: bp extension (context injection + subagent tool)

- **Domain**: specs/platform-gen/spec.md
- **Behavior**: The system SHALL emit `.pi/extensions/bp/index.ts` implementing the OMP context contract on pi's extension API: (1) `session_start` appends a `bp-context` custom message (compact block, augmented per detected agent type: planner → ## Roadmap State, executor/fixer → context.jsonl GUARD-RAIL rows, reviewer → ## Invariants + tasks.md acceptance, refactorer → ## Refactor Targets); (2) `before_agent_start` injects a `bp-workflow-state` message once per session (flag-gated); (3) `context` re-injects `bp-workflow-state` after compaction when no recent copy exists. It SHALL honor `BP_HOOKS=0`/`BP_DISABLE_HOOKS=1` bypass and no-op when `bp/config.yaml` is missing. It SHALL also register a `bp_subagent` tool that discovers agents from `.pi/agents/` and spawns isolated pi subprocesses (json mode, single/parallel) for planner/executor/reviewer/codebase-scanner/refactorer/fixer tasks.

**Rationale**: Grilling Q3: full extension port, OMP contract parity. Pi's API differences from OMP: `before_agent_start` returns `{message: {customType, content, display}}`; `context` mutates `event.messages`; no `agentTemplate` — agent type detected from `event.systemPrompt` text (planner/executor/reviewer/refactorer/fixer markers); `activeChangeName` not provided by ctx — derived from `bp state --json` output. Subagent tool ports the pi example extension pattern (spawn `pi --mode json -p --no-session`, temp system-prompt file, parse message_end events), lean version (no TUI rendering), scoped name `bp_subagent` to avoid clobbering user tools.

**Research**:

| Source | Finding | Impact |
| -------- | --------- | -------- |
| pi docs/extensions.md | before_agent_start message injection; context event messages mutation; session_start; ctx.sessionManager; systemPromptOptions | Handler mapping + injection API |
| src/templates/omp/extension.tmpl.ts | 3-handler contract, _bpStateInjected gate, BP_HOOKS bypass, config-missing no-op, role-augmented payloads | Contract to port verbatim |
| examples/extensions/subagent/index.ts | Spawn pi json-mode subprocess, --append-system-prompt temp file, model/tools inheritance, single+parallel modes | Subagent tool skeleton |

**Alternatives Considered**:

| Alternative | Reason Rejected |
| ------------- | ---------------- |
| Skills only, no extension | User chose full port (grilling Q3); without extension pi sessions lack all context injection |
| Ship subagent example extension as-is | Wrong scope (user agents, TUI deps); bp needs bp-scoped agents only |

**Risks & Mitigations**:

| Risk | Likelihood | Mitigation |
| ------ | ----------- | ------------ |
| Generated extension drifts from tested runtime | med | Byte-deterministic template + extension-runtime.ts counterpart + sync warning comment (OMP pattern) |
| pi API changes break extension | low | Runtime test imports the generated source and exercises handlers |
| bp_subagent spawn cost (fresh pi process per task) | low | Same model as pi's shipped example; parallel mode caps concurrency |

- **Verify**: extension.test.ts: emitted source byte-stable (snapshot); runtime handlers emit bp-context with planner augmentation; BP_HOOKS=0 short-circuits; no bp/config.yaml → no messages; context re-inject fires after simulated compaction.
- **Files**: src/templates/pi/extension.tmpl.ts, src/integrations/pi/extension.ts, src/integrations/pi/extension-runtime.ts, src/integrations/pi/extension.test.ts, src/integrations/pi/**snapshots**/extension.test.ts.snap

### PR-4: Registration, config, update cleanup

- **Domain**: specs/platform-gen/spec.md
- **Behavior**: The system SHALL register the `pi` provider at startup (src/generators/index.ts + src/integrations/index.ts barrel), SHALL include `pi` in this repo's bp/config.yaml platform list, and SHALL extend `bp update` stale cleanup to remove `.pi/extensions/bp/`, `.pi/skills/bp-*`, and `.pi/agents/bp-*` when pi is no longer configured (preserving user-owned files, mirroring the existing `.agents/` handling).

**Rationale**: Grilling Q4 (add pi to repo config — dogfood, this session runs in pi), Q6 (cleanup — mirror existing patterns). Without cleanup, removing pi from config leaves stale generated files; the existing cleanupStaleFiles already handles .agents/skills/bp-* by directory — extend the same rule to .pi/.

**Research**:

| Source | Finding | Impact |
|--------|---------|--------|
| src/commands/bp-update.ts | cleanupStaleFiles pattern: bp-* prefix check, generatedSet membership, user files untouched | Reuse for .pi/ |

**Alternatives Considered**:

| Alternative | Reason Rejected |
|-------------|----------------|
| No cleanup for .pi/ | Inconsistent with every other platform; stale extension would keep injecting context |

**Risks & Mitigations**:

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Cleanup deletes user-owned .pi files | low | Only bp-prefixed paths removed; extension dir removal keyed to generated set |

- **Verify**: unit test on cleanupStaleFiles (or manual): config without pi → stale .pi/bp-* files removed, non-bp .pi files preserved; `node bin/cli.js update` with pi configured emits .pi/ files.
- **Files**: src/generators/index.ts, src/integrations/index.ts, src/commands/bp-update.ts, bp/config.yaml

### PR-5: Tests

- **Domain**: specs/platform-gen/spec.md
- **Behavior**: The system SHALL ship tests matching existing platform test patterns: skills snapshot test (11 files, frontmatter + body), agents snapshot test (6 files, parseable frontmatter), extension determinism + runtime tests (PR-3), and a cleanup test for .pi/ stale removal.

**Rationale**: Grilling Q5: add tests. Platform generators are snapshot-covered in this repo (codex skills.test.ts.snap, agent/**snapshots**, claude-code snapshots). The extension is real runtime behavior — needs behavioral tests, not just snapshots.

**Research**: (covered in PR-1..PR-4 research)

**Alternatives Considered**:

| Alternative | Reason Rejected |
|-------------|----------------|
| Skip tests for agent/extension | Repo convention requires snapshots; runtime behavior untested = regression risk |

**Risks & Mitigations**:

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Snapshot churn on template edits | low | Run `npx vitest run --update` after intentional changes (repo convention) |

- **Verify**: `npx vitest run tests/` — new pi tests pass; full suite green.
- **Files**: src/integrations/pi/*.test.ts, **snapshots**/ (skills, agents, extension)

## Dependencies

- None

## Roadmap Reference

- **Milestone**: M1 - v2 Architecture Refactoring (ongoing platform integration work)
- **Phase**: (not bound to a roadmap phase; platform additions tracked in M1 deliverables)
