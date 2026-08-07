# Tasks: refactor-command

## TDD Type Annotations

| type | Meaning | TDD Protocol | Commit type |
|------|---------|-------------|-------------|
| `behavior` | Business behavior - observable, testable feature | RED -> GREEN -> REFACTOR | test + feat + refactor |
| `config` | Configuration - env vars, CI/CD, lint, tsconfig | Direct implementation | chore |
| `refactor` | Improve structure without changing behavior | Verify tests -> refactor -> verify | refactor |
| `docs` | Documentation - README, API docs, comments | Direct implementation | docs |
| `scaffolding` | Skeleton code - module shells, directory structure | Direct implementation | chore |

## Wave 1: Workflow template + threshold schema

<!--
  Wave 1 lays down the contract surface the rest of the change depends on:
  - The dual-export template module (DS-1)
  - The WORKFLOW_REGISTRY entry (DS-2)
  - The refactor.thresholds Zod block (DS-8)
  The dispatch role reuse mapping (DS-3 dispatch hook) is included here so
  sub-Wave 2 commands can resolve `refactorer` immediately.
  All Wave 1 tasks are independently verifiable (template, registry, schema,
  dispatch role wiring) and have no file-write side effects.
-->

- [ ] T-1: [type:behavior] Dual-export refactor workflow template + registry entry <!-- commit: -->
  - **refs**: DS-1, DS-2
  - **spec_ref**: bp/changes/refactor-command/specs/templates/spec.md#Refactor-Workflow-Template
  - **files**: `src/templates/workflows/refactor.ts`, `src/templates/workflows/refactor.test.ts`, `src/templates/workflows/registry.ts`
  - **acceptance**: `getRefactorSkillTemplate()` returns a `SkillTemplate` with the same `instructions` as `getRefactorCommandTemplate().content`; the body contains the four section headers `## Input`, `## Steps`, `## Output`, `## Guardrails`; `WORKFLOW_REGISTRY['refactor']` is a typed entry that resolves to the same body.
  - **RED**:
    - **GIVEN** the new `src/templates/workflows/refactor.ts` is not yet created
    - **WHEN** `getRefactorSkillTemplate()` and `getRefactorCommandTemplate()` are imported
    - **THEN** both return objects with `instructions` / `content` set to a non-empty string
    - **AND** the string contains `## Input`, `## Steps`, `## Output`, `## Guardrails` in order
    - **AND** `WORKFLOW_REGISTRY['refactor'].command().content === getRefactorCommandTemplate().content` holds.
  - **depends_on**: none

- [ ] T-2: [type:config] Extend ProjectConfigSchema with `refactor.thresholds` defaults <!-- commit: -->
  - **refs**: DS-8
  - **spec_ref**: bp/changes/refactor-command/specs/platform-gen/spec.md#Refactor-Analyzer-Contract
  - **files**: `src/core/config.ts`, `src/core/config.test.ts`
  - **acceptance**: An empty `bp/config.yaml` (no `refactor` section) loads with `config.refactor.thresholds` populated by defaults — `fragmentation.exportsMax=2`, `duplication.similarityMin=0.8`, `flatness.maxDepth=1`, `lowReuse.fanInMax=1`, `lowReuse.exportsMin=3`; a written config containing a custom threshold round-trips unchanged through `loadConfig` + `saveConfig`.
  - **RED**:
    - **GIVEN** a project with no `refactor` section in `bp/config.yaml`
    - **WHEN** `loadConfig(bpDir)` runs
    - **THEN** `result.refactor.thresholds.fragmentation.exportsMax === 2`
    - **AND** `result.refactor.thresholds.duplication.similarityMin === 0.8`
    - **AND** `result.refactor.thresholds.lowReuse.fanInMax === 1`.

- [ ] T-3: [type:behavior] Allow `refactorer` role in `bp dispatch` with executor isolation <!-- commit: -->
  - **refs**: DS-3, DS-6
  - **spec_ref**: bp/changes/refactor-command/specs/general/spec.md#Refactorer-Behavior-Preservation
  - **files**: `src/commands/bp-dispatch.ts`, `tests/commands/bp-dispatch.test.ts`
  - **acceptance**: `bp dispatch refactorer --target <module>` outputs a dispatch block whose `Isolation` section reports `Type: param` (or `auto`) for `omp` / `claude-code` and `Type: none` with the worktree instructions for `agent` / `codex` — exactly mirroring the executor isolation table; the role does not crash when `ROLE_TEMPLATES['refactorer']` is undefined (defaults to an empty template list).
  - **RED**:
    - **GIVEN** a configured project with `platform: [omp, agent]`
    - **WHEN** `bp dispatch refactorer --target src/core` runs
    - **THEN** stdout contains `### Isolation` followed by `Type: param` for OMP and `Type: none` with worktree instructions for the agent platform
    - **AND** no `Cannot read property 'map' of undefined` error is emitted.
  - **depends_on**: T-1

## Wave 2: Platform generator STEPS / AGENT_DEFS additions + snapshots

<!--
  Wave 2 enumerates the new step / role across every platform generator.
  All Wave 2 tasks are modifications to existing files; each task ends with
  regenerated snapshots confirming exactly one new file per platform for the
  refactor step and (where applicable) the refactorer agent.
-->

- [ ] T-4: [type:behavior] Append `refactor` to omp/claude-code/opencode/agent/codex STEP_DEFS / STEPS <!-- commit: -->
  - **refs**: DS-3
  - **spec_ref**: bp/changes/refactor-command/specs/platform-gen/spec.md#Refactor-Step-Generation
  - **files**: `src/integrations/omp/commands.ts`, `src/integrations/claude-code/commands.ts`, `src/integrations/opencode/commands.ts`, `src/integrations/agent/skills.ts`, `src/integrations/codex/skills.ts`
  - **acceptance**: Each platform's local `STEPS` (or `STEP_DEFS` for omp) array has a `refactor` entry with the agreed description and `argumentHint: '<target>'`. Generated file counts equal `STEPS.length`: omp = 11 commands, claude-code = 11 commands, opencode = 11 commands, agent = 11 skills, codex = 11 skills. Each generated file's path follows the existing `.omp/commands/bp-<step>.md` / `.claude/commands/bp-<step>.md` / `.opencode/commands/bp-<step>.md` / `.agent/skills/bp-<step>/SKILL.md` / `.agents/skills/bp-<step>/SKILL.md` pattern.
  - **RED**:
    - **GIVEN** a ProjectConfig with `platform: [omp, claude-code, opencode, agent, codex]`
    - **WHEN** `generateAll` produces the file list
    - **THEN** `.omp/commands/bp-refactor.md` is present
    - **AND** `.claude/commands/bp-refactor.md` is present with `name: bp:refactor` and `argument-hint`
    - **AND** `.opencode/commands/bp-refactor.md` is present
    - **AND** `.agent/skills/bp-refactor/SKILL.md` is present
    - **AND** `.agents/skills/bp-refactor/SKILL.md` is present with `name: bp:refactor`.

- [ ] T-5: [type:behavior] Append `refactorer` agent role to every platform agent generator <!-- commit: -->
  - **refs**: DS-3
  - **spec_ref**: bp/changes/refactor-command/specs/platform-gen/spec.md#Refactor-Step-Generation
  - **files**: `src/integrations/omp/agents.ts`, `src/integrations/claude-code/agents.ts`, `src/integrations/opencode/agents.ts`, `src/integrations/agent/agents.ts`
  - **acceptance**: Each platform's `AGENT_DEFS` array contains a `refactorer` entry with a non-empty description. `generateAll({ platform: [<each>] })` produces `<platform-specific-path>/bp-refactorer.md`. The body of each generated file resolves from `AGENT_PROMPTS['refactorer']`.
  - **RED**:
    - **GIVEN** the new `REFACTORER_PROMPT` constant (set by T-7's GREEN step) is exposed via `AGENT_PROMPTS`
    - **WHEN** `generateClaudeAgent({ role: 'refactorer', description: '...' })` runs
    - **THEN** the returned string contains `name: bp-refactorer` and embeds `AGENT_PROMPTS['refactorer']` as its body.

- [ ] T-6: [type:refactor] Regenerate golden-file snapshots for the new platform files <!-- commit: -->
  - **refs**: DS-3
  - **files**: `src/integrations/claude-code/__snapshots__/commands.test.ts.snap`, `src/integrations/claude-code/__snapshots__/agents.test.ts.snap`, `src/generators/multi-platform.test.ts`, `src/integrations/opencode/__snapshots__/commands.test.ts.snap` (if present), `tests/integration/lifecycle.test.ts`
  - **acceptance**: `npx vitest run --update` produces snapshots that include `bp-refactor.md` (and `bp-refactorer.md`) entries for every configured platform; an unaltered snapshot for files outside the new entries — verified by inspecting the `git diff` of the snapshot files.
  - **RED**: (snapshot regeneration)
  - **depends_on**: T-4, T-5

## Wave 3: Analyzer engine, refactorer prompt, OMP extension branch, CLI command

<!--
  Wave 3 implements the three user-facing capabilities:
  - The deterministic analyzer (DS-5) with report writer
  - The refactorer agent prompt (DS-6) + OMP extension discrimination branch
  - The `bp refactor` and `bp refactor analyze` CLI commands (DS-4)
  Each task is testable in isolation; the integration test that runs all
  three flows lives in T-12.
-->

- [ ] T-7: [type:behavior] Deterministic refactor analyzer engine + report writer <!-- commit: -->
  - **refs**: DS-5, DS-10
  - **spec_ref**: bp/changes/refactor-command/specs/platform-gen/spec.md#Refactor-Analyzer-Contract
  - **files**: `src/core/refactor-analyzer.ts`, `src/core/refactor-analyzer.test.ts`
  - **acceptance**: Given a fixture tree containing (a) two fragmented siblings with ≤2 exports and ≤50 non-blank lines each, (b) one duplicated 15-gram block pair across two files, (c) one flat module with no subdirectory, (d) one low-reuse module with `fanIn=0` and `exports≥3`, (e) one well-shaped module that triggers NO finding, `runRefactorAnalyzer` returns: 2 fragmentation findings, 1 duplication pair, 1 flatness finding, 1 low-reuse finding, 0 findings for the well-shaped module. The same fixture produces byte-identical `report` strings across two calls. The report contains a `## Summary` section followed by `## Module:` blocks. `writeRefactorReport(bpDir, report)` produces `<bpDir>/.refactor-report.md` whose contents equal `report`.
  - **RED**:
    - **GIVEN** a fixture tree under `tmpdir/refactor-fixture-<ts>` with the five module shapes above
    - **WHEN** `runRefactorAnalyzer({ rootDir, target: '.', thresholds: defaults, map: <built> })` runs
    - **THEN** `result.perModule.length === 5`
    - **AND** exactly one module reports `fragmentation.length === 2`
    - **AND** exactly one module reports `duplication.length >= 1`
    - **AND** exactly one module reports `flat === true`
    - **AND** exactly one module reports `lowReuse.fanIn === 0`
    - **AND** `result.report` contains `## Summary` and `## Module:` headers
    - **AND** running the function twice yields identical `fingerprint` strings.
  - **depends_on**: T-2

- [ ] T-8: [type:behavior] Refactorer agent prompt + AGENT_PROMPTS wiring <!-- commit: -->
  - **refs**: DS-6
  - **spec_ref**: bp/changes/refactor-command/specs/templates/spec.md#Refactorer-Agent-Prompt
  - **files**: `src/templates/agents/index.ts`, `tests/templates/agents-refactorer.test.ts`
  - **acceptance**: `AGENT_PROMPTS['refactorer']` is a non-empty string containing the keywords `## Role`, `## Inputs`, `## Behaviors`, `## Guardrails`, `behavior preservation`, `bp/.refactor-report.md`, `bp/specs/<domain>/spec.md`, and the stop-after-one-module guardrail. `REFACTORER_PROMPT === AGENT_PROMPTS['refactorer']` holds (reference equality).
  - **RED**:
    - **GIVEN** the new constant `REFACTORER_PROMPT` is not yet exported
    - **WHEN** `AGENT_PROMPTS['refactorer']` is read
    - **THEN** the value is a string whose length is greater than 200
    - **AND** it contains `## Role` and `## Guardrails`
    - **AND** it contains the substring `bp/.refactor-report.md`
    - **AND** it contains the substring `bp/specs/`.
  - **depends_on**: T-1

- [ ] T-9: [type:behavior] OMP extension: detect `refactorer` agent type + `## Refactor Targets` augmentation <!-- commit: -->
  - **refs**: DS-6
  - **spec_ref**: bp/changes/refactor-command/specs/platform-gen/spec.md#Refactor-Step-Generation
  - **files**: `src/integrations/omp/extension-runtime.ts`, `src/integrations/omp/extension-runtime.test.ts`, `tests/integration/omp-extension.test.ts`
  - **acceptance**: `detectAgentType({ agentTemplate: 'bp-refactorer' })` returns `'refactorer'`. `detectAgentType({ agentTemplate: 'bp:refactorer' })` returns `'refactorer'` (template-name substring match). When `agentType === 'refactorer'` and `bp/.refactor-report.md` exists in the cwd, `renderAugmentedBody` output contains `## Refactor Targets` followed by the report's `## Summary` block.
  - **RED**:
    - **GIVEN** an `ExtensionContext` whose `agentTemplate` is `'bp-refactorer'`
    - **WHEN** `detectAgentType(ctx)` runs
    - **THEN** the return value is `'refactorer'`
    - **AND** `renderAugmentedBody({ cwd, agentType: 'refactorer', activeChangeName: <name> })` includes `## Refactor Targets` followed by the report's summary text.
  - **depends_on**: T-7, T-8

- [ ] T-10: [type:behavior] `bp refactor <target>` CLI + `bp refactor analyze <target>` subcommand <!-- commit: -->
  - **refs**: DS-4, DS-10
  - **spec_ref**: bp/changes/refactor-command/specs/platform-gen/spec.md#Refactor-Step-Generation
  - **files**: `src/commands/bp-refactor.ts`, `src/commands/bp-refactor.test.ts`, `src/cli.ts`
  - **acceptance**: `bp refactor src/core` inside a `bp init` project prints the full refactor step instructions to stdout (orchestrator body, contains `## Input`/`## Steps`/`## Output`/`## Guardrails`). `bp refactor analyze src/core` calls `runRefactorAnalyzer`, writes `<bpDir>/.refactor-report.md`, and prints the stdout summary line. Both commands exit 0 on success and 1 when `bp/` is missing or when `findBpDir()` returns undefined. `src/cli.ts` imports `registerBpRefactor` and the help output lists `refactor [options] [target]`.
  - **RED**:
    - **GIVEN** an initialized bp project at `<tmp>/refactor-cli-test-<ts>` (bpDir exists, config.yaml valid)
    - **WHEN** `node bin/cli.js refactor src/core` runs
    - **THEN** exit code is `0`
    - **AND** stdout contains `## Input` and `## Steps` and `## Output` and `## Guardrails`
    - **AND** `node bin/cli.js refactor analyze src/core` writes `bp/.refactor-report.md` and prints a line beginning with `Refactor report for src/core:`.

- [ ] T-11: [type:scaffolding] Wire `bp refactor` into `src/cli.ts` <!-- commit: -->
  - **refs**: DS-4
  - **files**: `src/cli.ts`
  - **acceptance**: `src/cli.ts` contains `import { register as registerRefactor } from './commands/bp-refactor.js';` and `registerRefactor(program);`; running `node bin/cli.js --help` lists `refactor` in the Commands list.
  - **depends_on**: T-10

- [ ] T-12: [type:behavior] Integration: full refactor flow on fixture tree <!-- commit: -->
  - **refs**: DS-4, DS-5, DS-6, DS-7
  - **spec_ref**: bp/changes/refactor-command/specs/general/spec.md#Refactorer-Behavior-Preservation
  - **files**: `tests/integration/refactor-flow.test.ts`
  - **acceptance**: An integration test initializes a fixture repo, runs `bp refactor analyze <dir>`, asserts `bp/.refactor-report.md` exists with the four-metric findings, runs `bp dispatch refactorer --target <module>` and parses the output for `Type: param` / `Type: none` (matching platform isolation), and verifies `AGENT_PROMPTS['refactorer']` contains the behavior-preservation guardrail string.
  - **RED**:
    - **GIVEN** a fixture repo at `<tmp>/refactor-flow-<ts>` with one fragmented sibling, one duplicated block, one flat module, one low-reuse module
    - **WHEN** `bp refactor analyze .` runs
    - **THEN** the report file exists and references all four metric types
    - **AND** the stdout summary mentions each metric's count.
  - **depends_on**: T-7, T-8, T-9, T-10

## Wave 4: Delta spec docs + platform-integration docs

<!--
  Wave 4 carries the documentation half — the delta specs that archive
  will merge into the global specs and the platform-integration doc
  paragraph that ships with the change. No behavior change here; only
  text artifacts.
-->

- [x] T-13: [type:docs] Write archive-ready platform-gen delta spec <!-- commit: b4f500de57b173f50ffc1ab27a318c00fd458e39 -->
  - **refs**: DS-7, DS-9
  - **files**: `bp/changes/refactor-command/specs/platform-gen/spec.md`
  - **acceptance**: The file exists; contains `## ADDED Requirements` with `Refactor-Step-Generation` and `Refactor-Analyzer-Contract`; each requirement has at least one `#### Scenario:` block using the bolded `**GIVEN**` / `**WHEN**` / `**THEN**` format; the file passes the artifact validator (`npx vitest run tests/core/artifact-validator.test.ts`).
  - **depends_on**: none

- [x] T-14: [type:docs] Write archive-ready templates delta spec <!-- commit: b4f500de57b173f50ffc1ab27a318c00fd458e39 -->
  - **refs**: DS-7, DS-9
  - **files**: `bp/changes/refactor-command/specs/templates/spec.md`
  - **acceptance**: The file exists; contains `## ADDED Requirements` with `Refactor-Workflow-Template` and `Refactorer-Agent-Prompt`; each requirement has at least one `#### Scenario:` block in the bolded format; the file passes the artifact validator.
  - **depends_on**: none

- [x] T-15: [type:docs] Write archive-ready general delta spec (refactorer behavior preservation) <!-- commit: b4f500de57b173f50ffc1ab27a318c00fd458e39 -->
  - **refs**: DS-7, DS-9
  - **files**: `bp/changes/refactor-command/specs/general/spec.md`
  - **acceptance**: The file exists; contains `## ADDED Requirements` with `Refactorer-Behavior-Preservation`; the requirement has at least one scenario asserting that the refactorer dispatch uses executor isolation and preserves test-suite status.
  - **depends_on**: none

- [x] T-16: [type:docs] Update `docs/platform-integration.md` with the refactor step and analyzer section <!-- commit: 708d72d32c6831f35ccb77303494026240c9faf8 -->
  - **refs**: DS-7
  - **files**: `docs/platform-integration.md`
  - **acceptance**: A `## Refactor step` section describes `bp-refactor` per platform file paths, the four anti-pattern metrics, the configurable thresholds, the `bp/.refactor-report.md` artifact, and the per-module dispatch flow.

## Pre-Archive Checklist

- [ ] type-check/build passes with no errors
- [ ] test suite passes (per project test command)
- [ ] Every task in every wave is marked `[x]` with a commit hash
- [ ] No `{{` template placeholders remaining in any artifact
- [ ] All wave acceptance criteria confirmed
