# Tasks: add-pi-platform

<!--
  Structured implementation checklist for the add-pi-platform change.
  9 tasks, 1 wave. Every task maps to a DS-N in design.md.
  TDD: behavior tasks follow RED → GREEN → REFACTOR.
-->

## TDD Type Annotations

| type | Meaning | TDD Protocol | Commit type |
| ------ | --------- | ------------- | ------------- |
| `behavior` | Business behavior - observable, testable feature | RED -> GREEN -> REFACTOR | test + feat + refactor |
| `config` | Configuration - env vars, CI/CD, lint, tsconfig | Direct implementation | chore |
| `refactor` | Improve structure without changing behavior | Verify tests -> refactor -> verify | refactor |
| `docs` | Documentation - README, API docs, comments | Direct implementation | docs |
| `scaffolding` | Skeleton code - module shells, directory structure | Direct implementation | chore |

## Wave 1: pi platform (skills → agents → template → runtime → generator → provider → wiring → cleanup)

All 9 tasks live in one wave. Compile ordering is enforced with `depends_on`:
the provider (T-7) imports the generators (T-1/T-2/T-6), the extension generator
(T-6) imports the runtime re-export (T-4), and the runtime re-exports the
template (T-3). T-8 and T-9 are independent of the pi module and can be done
in any order after T-7.

- [ ] T-1: [type:behavior] Pi skills generator (11 skills at `.pi/skills/bp-<step>/SKILL.md`) <!-- commit: -->
  - **refs**: DS-1
  - **spec_ref**: specs/platform-gen/spec.md#pi-skills-generation
  - **files**: src/integrations/pi/skills.ts, src/integrations/pi/skills.test.ts, src/integrations/pi/**snapshots**/skills.test.ts.snap
  - **acceptance**: `generatePiSkills({})` returns exactly 11 descriptors, every path matches `/^\.pi\/skills\/bp-[a-z-]+\/SKILL\.md$/`, each content has `name: bp:<step>` frontmatter + description + non-empty workflow body; snapshot matches
  - **RED**:
    - **GIVEN** a `ProjectConfig` and the shared WORKFLOW_REGISTRY (mirror of `codex/skills.test.ts`)
    - **WHEN** `generatePiSkills(config)` runs
    - **THEN** 11 descriptors are returned at `.pi/skills/bp-<step>/SKILL.md` with `name: bp:<step>` frontmatter, no `argument-hint`, and workflow bodies from the registry
    - **AND** two invocations produce byte-identical output, and `bp-plan` content length > 200 chars
  - **depends_on**: (none)

- [ ] T-2: [type:behavior] Pi agents generator (6 agents at `.pi/agents/bp-<role>.md`) <!-- commit: -->
  - **refs**: DS-3
  - **spec_ref**: specs/platform-gen/spec.md#pi-agents-generation
  - **files**: src/integrations/pi/agents.ts, src/integrations/pi/agents.test.ts, src/integrations/pi/**snapshots**/agents.test.ts.snap
  - **acceptance**: `generatePiAgents({})` returns 6 descriptors at `.pi/agents/bp-<role>.md`; each parses via `parseFrontmatter()` with `name: bp-<role>`, string description, non-empty body; snapshot matches
  - **RED**:
    - **GIVEN** a `ProjectConfig` and `AGENT_PROMPTS` (mirror of `src/integrations/agent/agents.test.ts`)
    - **WHEN** `generatePiAgents(config)` runs
    - **THEN** 6 agent files are returned at `.pi/agents/bp-<role>.md` with generic frontmatter (no `modelRoles`, no `thinkingLevel`)
    - **AND** `bp-refactorer.md` contains `name: bp-refactorer`, the consolidation description, and "behavior preservation is mandatory", and each file body is non-empty
  - **depends_on**: (none)

- [ ] T-3: [type:behavior] Pi extension template source (`EXTENSION_SOURCE` in `src/templates/pi/extension.tmpl.ts`) <!-- commit: -->
  - **refs**: DS-4
  - **spec_ref**: specs/platform-gen/spec.md#pi-extension-context-contract, specs/platform-gen/spec.md#pi-extension-generation
  - **files**: src/templates/pi/extension.tmpl.ts, src/integrations/pi/extension.test.ts, src/integrations/pi/**snapshots**/extension.test.ts.snap
  - **acceptance**: `EXTENSION_SOURCE` is a static string containing `session_start`, `before_agent_start`, `context` registrations, the `bp_subagent` `defineTool` registration, the `BP_HOOKS`/`BP_DISABLE_HOOKS` bypass, and `"bp-workflow-state"`; snapshot matches; the string is byte-identical across imports
  - **RED**:
    - **GIVEN** the template module is imported (mirror of the OMP extension template marker test)
    - **WHEN** `EXTENSION_SOURCE` is inspected
    - **THEN** it contains `api.on("session_start"`, `api.on("before_agent_start"`, `api.on("context"`, `name: "bp_subagent"`, `process.env.BP_HOOKS === "0"`, `customType: "bp-workflow-state"`, and `@earendil-works/pi-coding-agent`
    - **AND** importing the module twice yields identical string content, and the emitted source snapshot matches (run `npx vitest run --update` once to create the snapshot)
  - **depends_on**: (none)

- [ ] T-4: [type:behavior] Pi extension context runtime handlers (`createPiExtension()` in `src/integrations/pi/extension-runtime.ts`) <!-- commit: -->
  - **refs**: DS-5
  - **spec_ref**: specs/platform-gen/spec.md#pi-extension-context-contract, specs/platform-gen/spec.md#pi-extension-bypass-and-config-skip
  - **files**: src/integrations/pi/extension-runtime.ts, src/integrations/pi/extension-runtime.test.ts
  - **acceptance**: with a temp fixture project, `handleSessionStart` emits one `bp-context` message augmented per detected agent type (planner Roadmap State / executor+fixer GUARD-RAIL rows / reviewer Invariants+tasks.md / refactorer Refactor Targets / default paths-only); `handleBeforeAgentStart` returns a message once then `undefined`; `handleContext` re-injects `bp-workflow-state` only when absent; all handlers no-op under `BP_HOOKS=0` or missing `bp/config.yaml`
  - **RED**:
    - **GIVEN** a temp bp project (bp/config.yaml + change with context.jsonl + tasks.md + bp/.refactor-report.md) and an injected `PiExtensionContext` whose `getSystemPrompt()` returns a planner prompt
    - **WHEN** `handleSessionStart({}, ctx, api)` runs via `createPiExtension()`
    - **THEN** exactly one `bp-context` message is sent whose body contains `<bp-context>`, `## Roadmap State`, and the fixture milestone/phase summary
    - **AND** with an executor/fixer prompt the body inlines context.jsonl rows with `> GUARD-RAIL:` prefixes; with a reviewer prompt it contains `## Invariants` and `## tasks.md acceptance`; with a refactorer prompt it contains `## Refactor Targets`; with a default prompt it is paths-only; and with `BP_HOOKS=0` or no bp/config.yaml nothing is sent
    - **AND** `handleBeforeAgentStart` returns `undefined` on the second call (once-per-session gate), and `handleContext` returns messages without a workflow-state push when one exists and with a push when absent
  - **depends_on**: T-3 (runtime re-exports `EXTENSION_SOURCE` from the template)

- [ ] T-5: [type:behavior] Pi bp_subagent runtime helpers (discovery + spawn args + line parsing) <!-- commit: -->
  - **refs**: DS-5
  - **spec_ref**: specs/platform-gen/spec.md#pi-extension-subagent-tool
  - **files**: src/integrations/pi/extension-runtime.ts, src/integrations/pi/extension-runtime.test.ts
  - **acceptance**: `discoverPiAgents(cwd)` parses valid `.pi/agents/*.md` files (frontmatter name/description/tools + body) and skips invalid ones; `buildSubagentArgs` returns the exact argv for a given agent/task/model/tools/prompt-file combo; `parseJsonLine` extracts `message_end` assistant messages
  - **RED**:
    - **GIVEN** a temp dir with `.pi/agents/bp-planner.md` (valid frontmatter) and `broken.md` (no name)
    - **WHEN** `discoverPiAgents(dir)` runs
    - **THEN** exactly one `PiAgentConfig` is returned with `name: 'bp-planner'`, `tools` parsed from string or array form, `systemPrompt` equal to the frontmatter body, and `broken.md` skipped
    - **AND** `buildSubagentArgs(agent, 'plan change', { model: 'm/x', thinkingLevel: 'high', systemPromptFile: '/tmp/p.md' })` returns `['--mode','json','-p','--no-session','--model','m/x','--thinking','high','--append-system-prompt','/tmp/p.md','Task: plan change']` (plus `--tools` when agent.tools non-empty)
    - **AND** `parseJsonLine('{"type":"message_end","message":{"role":"assistant","content":"done"}}')` yields the assistant message and malformed lines yield `null`
  - **depends_on**: T-4 (same file, additive — commit order)

- [ ] T-6: [type:behavior] Pi extension generator (emits `.pi/extensions/bp/index.ts` descriptor) <!-- commit: -->
  - **refs**: DS-6
  - **spec_ref**: specs/platform-gen/spec.md#pi-extension-generation
  - **files**: src/integrations/pi/extension.ts
  - **acceptance**: `generatePiExtension({})` returns exactly `[{ path: '.pi/extensions/bp/index.ts', content: EXTENSION_SOURCE }]`; two invocations are byte-identical
  - **RED**:
    - **GIVEN** the pi extension runtime module
    - **WHEN** `generatePiExtension(config)` runs twice
    - **THEN** both runs return a single descriptor with `path === '.pi/extensions/bp/index.ts'` and identical `content`, and `content === EXTENSION_SOURCE` (re-exported via `extension-runtime.js`, no inline literal)
  - **depends_on**: T-3, T-4 (generator imports `EXTENSION_SOURCE` from the runtime re-export)

- [ ] T-7: [type:behavior] Pi provider registration + dispatch (registerPiProvider + barrel + generators startup) <!-- commit: -->
  - **refs**: DS-2
  - **spec_ref**: specs/platform-gen/spec.md#pi-platform-support
  - **files**: src/integrations/pi/index.ts, src/integrations/index.ts, src/generators/index.ts, src/integrations/pi/index.test.ts
  - **acceptance**: after `registerPiProvider()`, `PlatformRegistry.resolve('pi')` returns `{ id: 'pi', name: 'Pi Coding Agent', capabilities: { supportsCommands: false } }`; `generateAll({ platform: ['pi'] })` emits 18 files (11 skills + 6 agents + 1 extension), all under `.pi/`; duplicate registration does not throw; `src/integrations/index.ts` exports the `pi` namespace and `src/generators/index.ts` calls `registerPiProvider()` at load
  - **RED**:
    - **GIVEN** a fresh isolated PlatformRegistry (mirror of `src/generators/codex.test.ts`)
    - **WHEN** `registerPiProvider()` runs followed by `generateAll(config({ platform: ['pi'] }))`
    - **THEN** no unknown-platform error is thrown, the provider resolves with id/name/capabilities as specified, and exactly 18 descriptors are emitted with paths under `.pi/`
    - **AND** calling `registerPiProvider()` again does not throw, and generating twice yields identical file sets
  - **depends_on**: T-1, T-2, T-6 (provider imports all three generators)

- [ ] T-8: [type:behavior] `bp update` stale cleanup for `.pi/` (bp-update.ts + tests) <!-- commit: -->
  - **refs**: DS-7
  - **spec_ref**: specs/platform-gen/spec.md#pi-update-cleanup
  - **files**: src/commands/bp-update.ts, tests/commands/bp-update.test.ts
  - **acceptance**: with a temp project configured without pi, `bp update` removes seeded stale `.pi/skills/bp-plan/`, `.pi/agents/bp-fixer.md`, and `.pi/extensions/bp/` while preserving `.pi/settings.json` and `.pi/skills/user-skill/SKILL.md`; with `platform: [pi]` all 18 files are generated and nothing `.pi/` is pruned
  - **RED**:
    - **GIVEN** a `bp init --yes` temp project whose config has `platform: [omp]`, seeded with stale `.pi/skills/bp-plan/SKILL.md`, `.pi/agents/bp-fixer.md`, `.pi/extensions/bp/index.ts`, plus user-owned `.pi/settings.json` and `.pi/skills/user-skill/SKILL.md`
    - **WHEN** `node bin/cli.js update --dir bp` runs in the project
    - **THEN** the three stale bp-owned artifacts are removed (log lines `✓ Removed stale: .pi/...`), the user-owned `.pi/settings.json` and `.pi/skills/user-skill/` remain, and the command exits 0
    - **AND** with `platform: [pi]` in config the update generates 18 `.pi/` files and removes none of them
  - **depends_on**: T-7 (repo must compile with the registered pi provider before the update flow runs in tests)

- [ ] T-9: [type:config] Add `pi` to repo `bp/config.yaml` platform list <!-- commit: -->
  - **refs**: DS-7
  - **spec_ref**: specs/platform-gen/spec.md#pi-platform-support
  - **files**: bp/config.yaml
  - **acceptance**: `bp/config.yaml` platform list contains `- pi` after `codex`; `bp context` / `bp update` still load the config (no schema error)
  - **depends_on**: (none)

## Pre-Archive Checklist

<!--
  Verified by the orchestrator after all waves complete.
  These are the gates before review can run.
-->

- [ ] type-check/build passes with no errors
- [ ] test suite passes (per project test command)
- [ ] Every task in every wave is marked `[x]` with a commit hash
- [ ] No `{{` template placeholders remaining in any artifact
- [ ] All wave acceptance criteria confirmed
