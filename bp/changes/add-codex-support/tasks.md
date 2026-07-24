# Tasks: add-codex-support

## TDD Type Annotations

| type | Meaning | TDD Protocol | Commit type |
|------|---------|-------------|-------------|
| `behavior` | Business behavior - observable, testable feature | RED -> GREEN -> REFACTOR | test + feat + refactor |
| `config` | Configuration - env vars, CI/CD, lint, tsconfig | Direct implementation | chore |
| `refactor` | Improve structure without changing behavior | Verify tests -> refactor -> verify | refactor |
| `docs` | Documentation - README, API docs, comments | Direct implementation | docs |
| `scaffolding` | Skeleton code - module shells, directory structure | Direct implementation | chore |

## Wave 1: Codex provider and generation

- [x] T-1: [type:behavior] Generate ten Codex Skills with colon frontmatter <!-- commit: ed82bea -->
  - **refs**: DS-1
  - **spec_ref**: specs/platform-gen/spec.md#codex-platform-support
  - **files**: `src/integrations/codex/skills.ts`, `src/integrations/codex/skills.test.ts`
  - **acceptance**: exactly ten paths use `.agents/skills/bp-<step>/SKILL.md`; frontmatter contains `name: bp:<step>` and no `argument-hint`.
  - **RED**: GIVEN a valid ProjectConfig and shared workflow registry
    WHEN `generateCodexSkills(config)` runs
    THEN ten deterministic Skill descriptors are returned with Codex frontmatter and workflow bodies.
- [x] T-2: [type:behavior] Register Codex provider and dispatch generation <!-- commit: ed82bea -->
  - **refs**: DS-1
  - **spec_ref**: specs/platform-gen/spec.md#codex-platform-support
  - **files**: `src/integrations/codex/index.ts`, `src/integrations/index.ts`, `src/generators/index.ts`, `src/generators/codex.test.ts`
  - **acceptance**: `generateAll({platform:['codex']})` resolves successfully and returns Codex files; duplicate registration is a no-op.
  - **RED**: GIVEN config platform is `['codex']`
    WHEN the generator runs
    THEN the Codex provider is resolved and emits Skill and hook descriptors without an unknown-platform error.
  - **depends_on**: T-1
- [x] T-3: [type:behavior] Generate five-event hooks configuration <!-- commit: ed82bea -->
  - **refs**: DS-2
  - **spec_ref**: specs/platform-gen/spec.md#codex-platform-support
  - **files**: `src/integrations/codex/hooks.ts`, `src/integrations/codex/hooks.test.ts`
  - **acceptance**: hooks.json contains exactly five required event keys, Bash matchers on tool events, and handler commands with correct event arguments.
  - **RED**: GIVEN a valid ProjectConfig
    WHEN `generateCodexHooks(config)` runs
    THEN the returned JSON wires SessionStart, SessionStop, UserPromptSubmit, PreToolUse, and PostToolUse to the generated handler.
- [x] T-4: [type:behavior] Implement deterministic Codex handler runtime <!-- commit: ed82bea -->
  - **refs**: DS-2
  - **spec_ref**: specs/platform-gen/spec.md#codex-hook-runtime
  - **files**: `src/templates/codex/handler.tmpl.ts`, `src/integrations/codex/handler.ts`, `src/integrations/codex/handler.test.ts`
  - **acceptance**: handler emits context/state payloads for lifecycle events, skips cleanly when hooks are disabled or config is absent, and identical inputs produce byte-identical output.
  - **RED**: GIVEN a generated handler and a hook event payload
    WHEN the handler processes each supported event
    THEN it emits the expected bp-context or bp-workflow-state payload and exits successfully for disabled/missing-config cases.
  - **depends_on**: T-3

## Wave 2: CLI lifecycle and dispatch

- [ ] T-5: [type:behavior] Add Codex init picker and gitignore entries <!-- commit: -->
  - **refs**: DS-3
  - **spec_ref**: specs/platform-gen/spec.md#codex-platform-selection
  - **files**: `src/prompts/init-wizard.ts`, `src/commands/bp-init.ts`, `tests/commands/bp-init.test.ts`
  - **acceptance**: interactive options include Codex CLI and generated gitignore contains `.codex/` and `.agents/`; defaults remain OMP.
  - **RED**: GIVEN the init wizard is rendered
    WHEN platform options are inspected
    THEN Codex CLI is selectable with generation description and non-interactive defaults are unchanged.

- [ ] T-6: [type:behavior] Safely clean stale Codex files on update <!-- commit: -->
  - **refs**: DS-3
  - **spec_ref**: specs/platform-gen/spec.md#codex-update-cleanup
  - **files**: `src/commands/bp-update.ts`, `tests/commands/bp-update.test.ts`
  - **acceptance**: stale `bp-*` Skill directories and hooks.json are removed while arbitrary `.codex` files and non-bp Skills remain.
  - **RED**: GIVEN stale generated and unrelated Codex files
    WHEN `bp update` runs
    THEN only stale generated entries are removed and unrelated files still exist.

- [ ] T-7: [type:behavior] Add Codex dispatch isolation and format <!-- commit: -->
  - **refs**: DS-3
  - **spec_ref**: specs/platform-gen/spec.md#codex-dispatch-isolation
  - **files**: `src/commands/bp-dispatch.ts`, `tests/commands/bp-dispatch.test.ts`
  - **acceptance**: Codex executor output declares isolation `none`, tool `task`, and `git worktree add` orchestration.
  - **RED**: GIVEN Codex is configured and executor dispatch is requested
    WHEN `bp dispatch executor` runs
    THEN output contains worktree-add instructions and Codex task format fields.

- [ ] T-8: [type:behavior] Accept Codex in lifecycle/config generation <!-- commit: -->
  - **refs**: DS-1, DS-3
  - **spec_ref**: specs/platform-gen/spec.md#codex-platform-support
  - **files**: `src/templates/artifacts/index.ts`, `tests/integration/lifecycle.test.ts`
  - **acceptance**: config validation accepts Codex and a greenfield lifecycle generates all expected Codex files.
  - **RED**: GIVEN a project config containing `platform: [codex]`
    WHEN lifecycle generation runs
    THEN validation succeeds and the eleven Codex-owned outputs are present.

## Wave 3: documentation and contract

- [ ] T-9: [type:docs] Document Codex platform parity <!-- commit: -->
  - **refs**: DS-4
  - **files**: `docs/platform-integration.md`, `README.md`, `AGENTS.md`
  - **acceptance**: each document contains a Codex platform entry; integration docs describe Skills, five hooks, cleanup boundaries, and worktree dispatch.

- [ ] T-10: [type:docs] Add and archive-ready platform delta spec <!-- commit: -->
  - **refs**: DS-4
  - **files**: `bp/specs/platform-gen/spec.md`, `bp/changes/add-codex-support/specs/platform-gen/spec.md`
  - **acceptance**: global spec contains the codex capability contract and delta spec has complete ADDED/MODIFIED requirements with Given/When/Then scenarios.

## Pre-Archive Checklist

- [ ] type-check/build passes with no errors
- [ ] test suite passes (per project test command)
- [ ] Every task in every wave is marked `[x]` with a commit hash
- [ ] No `{{` template placeholders remaining in any artifact
- [ ] All wave acceptance criteria confirmed
