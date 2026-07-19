# Tasks: bp-auto-context-injection

<!--
  Structured implementation checklist. Produced by the planner agent.
  Executors receive ONE wave at a time and implement its tasks via TDD.
-->

## TDD Type Annotations

| type | Meaning | TDD Protocol | Commit type |
|------|---------|-------------|-------------|
| `behavior` | Business behavior - observable, testable feature | RED -> GREEN -> REFACTOR | test + feat + refactor |
| `config` | Configuration - env vars, CI/CD, lint, tsconfig | Direct implementation | chore |
| `refactor` | Improve structure without changing behavior | Verify tests -> refactor -> verify | refactor |
| `docs` | Documentation - README, API docs, comments | Direct implementation | docs |
| `scaffolding` | Skeleton code - module shells, directory structure | Direct implementation | chore |

## Wave 1: Compact context surface (PR-1 + PR-2)

- [x] T-1: [type:behavior] spec-injector.generateCompactContext returns shape <!-- commit: a6811ae -->
  - **refs**: DS-1
  - **spec_ref**: specs/platform-gen/spec.md#compact-context-map-surface
  - **files**: src/core/spec-injector.ts, src/types/spec-injector.ts, tests/core/spec-injector.test.ts
  - **acceptance**: given fixture bp dir with 3 specs / 2 conventions / 1 active change in_progress / 1 archived change / 2 rules, generateCompactContext returns object with arrays populated, activeChange non-null, rules.length === 2

- [x] T-2: [type:behavior] spec-injector title extraction with H1/H2 fallback to file stem <!-- commit: a6811ae -->
  - **refs**: DS-1
  - **spec_ref**: specs/platform-gen/spec.md#compact-context-map-surface
  - **files**: src/core/spec-injector.ts, tests/core/spec-injector.test.ts
  - **acceptance**: when a spec file starts with `# Heading`, title is `Heading`; when it has no `#` line, title equals the file stem

- [x] T-3: [type:behavior] spec-injector activeChange is null when all changes archived <!-- commit: a6811ae -->
  - **refs**: DS-1
  - **files**: src/core/spec-injector.ts, tests/core/spec-injector.test.ts
  - **acceptance**: when every entry in `bp/changes/*` has status `archived`, result.activeChange is null

- [x] T-4: [type:behavior] formatContextCompact emits <bp-context> markdown block <!-- commit: a6811ae -->
  - **refs**: DS-1
  - **spec_ref**: specs/platform-gen/spec.md#compact-payload-budget
  - **files**: src/core/spec-injector.ts, tests/core/spec-injector.test.ts
  - **acceptance**: output starts with `<bp-context>` and ends with `</bp-context>`, rules render as `- artifact: ...`

- [x] T-5: [type:behavior] formatContextCompactJson round-trips through JSON.stringify <!-- commit: a6811ae -->
  - **refs**: DS-1
  - **spec_ref**: specs/platform-gen/spec.md#compact-payload-budget
  - **files**: src/core/spec-injector.ts, tests/core/spec-injector.test.ts
  - **acceptance**: JSON.parse(formatContextCompactJson(result)) deep-equals input (excluding generatedAt)

- [x] T-6: [type:behavior] Compact payload size stays under 4 KB at 200 specs stress <!-- commit: a6811ae -->
  - **refs**: DS-1
  - **spec_ref**: specs/platform-gen/spec.md#compact-payload-budget
  - **files**: src/core/spec-injector.ts, tests/core/spec-injector.test.ts
  - **acceptance**: under stress fixture with 200 specs, formatContextCompact(result).length <= 4096 or throws descriptive error

- [x] T-7: [type:scaffolding] bp context CLI scaffold registered in commander <!-- commit: 2ef105b -->
  - **refs**: DS-2
  - **files**: src/commands/bp-context.ts, src/cli.ts
  - **acceptance**: `bp context --help` lists `--format <full|compact|json>` and `--change <name>`; default format is `full`

- [x] T-8: [type:behavior] bp context --format=full matches existing terminal snapshot <!-- commit: a6811ae -->
  - **refs**: DS-2
  - **files**: src/commands/bp-context.ts, tests/commands/bp-context.test.ts
  - **acceptance**: invoking with `--format=full` against a fixture bp project produces stdout matching snapshot

- [x] T-9: [type:behavior] bp context --format=compact emits <bp-context> block <!-- commit: a6811ae -->
  - **refs**: DS-2
  - **files**: src/commands/bp-context.ts, tests/commands/bp-context.test.ts
  - **acceptance**: stdout contains `<bp-context>` and `</bp-context>`; exit code 0

- [x] T-10: [type:behavior] bp context --format=json emits parseable JSON with all CompactContext fields <!-- commit: a6811ae -->
  - **refs**: DS-2
  - **files**: src/commands/bp-context.ts, tests/commands/bp-context.test.ts
  - **acceptance**: stdout is JSON.parse-able; fields `specs`, `conventions`, `activeChange`, `rules`, `generatedAt` all present

- [x] T-11: [type:behavior] bp context --change <unresolved> exits non-zero with clean error <!-- commit: a6811ae -->
  - **refs**: DS-2
  - **files**: src/commands/bp-context.ts, tests/commands/bp-context.test.ts
  - **acceptance**: exit code != 0; stderr contains `Change 'does-not-exist' not found under bp/changes/`

- [x] T-12: [type:behavior] bp context exits non-zero when bp/config.yaml missing <!-- commit: a6811ae -->
  - **refs**: DS-2
  - **files**: src/commands/bp-context.ts, tests/commands/bp-context.test.ts
  - **acceptance**: empty dir exits non-zero; stderr mentions `bp/config.yaml` and `bp init`

## Wave 2: context.jsonl artifact + validation (PR-3)

- [x] T-13: [type:behavior] Zod schema accepts valid context row and rejects missing required fields <!-- commit: 7c0f098 -->
  - **refs**: DS-3
  - **spec_ref**: specs/platform-gen/spec.md#context-jsonl-reference-list-artifact
  - **files**: src/types/context-refs.ts, src/core/context-refs.ts, tests/core/context-refs.test.ts
  - **acceptance**: valid `{file, reason}` parses; missing `file`, missing `reason`, and malformed JSON are rejected.
  - **RED**: GIVEN row JSON with and without required fields WHEN parsed THEN valid rows are returned and invalid rows report a structured error.

- [x] T-14: [type:behavior] Parse context.jsonl line-by-line while preserving order and line-numbered errors <!-- commit: 60b08cd -->
  - **refs**: DS-3
  - **spec_ref**: specs/platform-gen/spec.md#context-jsonl-validation-gate
  - **files**: src/core/context-refs.ts, tests/core/context-refs.test.ts
  - **acceptance**: a three-row file with row 2 malformed returns rows 1 and 3 in order plus a `PARSE_ERROR` at line 2.
  - **RED**: GIVEN three JSONL lines with a malformed middle line WHEN parsed THEN valid rows preserve order and the error identifies line 2.

- [x] T-15: [type:behavior] Validate context references against repository paths and file ranges <!-- commit: d3ac318 -->
  - **refs**: DS-3
  - **spec_ref**: specs/platform-gen/spec.md#context-jsonl-validation-gate
  - **files**: src/core/context-refs.ts, tests/core/context-refs.test.ts
  - **acceptance**: unresolved files report `PATH_UNRESOLVED`; ranges outside file bounds report `RANGE_OOB`.
  - **RED**: GIVEN a missing file and an out-of-bounds range WHEN validated THEN each row receives its corresponding structured error.

- [x] T-16: [type:behavior] Filter context rows by workflow phase without phase errors <!-- commit: 1e0f592 -->
  - **refs**: DS-3
  - **spec_ref**: specs/platform-gen/spec.md#context-jsonl-validation-gate
  - **files**: src/core/context-refs.ts, tests/core/context-refs.test.ts
  - **acceptance**: rows for another phase are silently filtered; no phase mismatch error is emitted, and `phase: all` rows apply at every step.
  - **RED**: GIVEN plan/apply/review rows WHEN validated for one current phase THEN only matching/all rows remain, filtered rows are counted, and filtered rows produce no errors.

- [x] T-17: [type:behavior] Artifact validation surfaces context.jsonl errors with line numbers <!-- commit: c7a03ae -->
  - **refs**: DS-3
  - **spec_ref**: specs/platform-gen/spec.md#context-jsonl-validation-gate
  - **files**: src/core/artifact-validator.ts, tests/core/artifact-validator.test.ts
  - **acceptance**: `validateChange()` returns `contextJsonl.errors` containing line-numbered errors and marks the result invalid.
  - **RED**: GIVEN a change with invalid context.jsonl WHEN the change is validated THEN context errors include their source line numbers.

- [x] T-18: [type:behavior] Planner writes context.jsonl from design.md references <!-- commit: a8d3c86 -->
  - **refs**: DS-5
  - **spec_ref**: specs/platform-gen/spec.md#context-jsonl-planner-write-contract
  - **files**: tests/integration/planner-writes-context-jsonl.test.ts
  - **acceptance**: `bp plan` on a fixture whose design references three specs and two conventions produces at least five context rows.
  - **RED**: GIVEN design.md and tasks.md references WHEN the planner workflow runs THEN context.jsonl contains every referenced path.

- [x] T-19: [type:behavior] Executor prompt reads auto-injected context.jsonl and refuses missing files <!-- commit: 1598fa3 -->
  - **refs**: DS-5
  - **spec_ref**: specs/platform-gen/spec.md#context-jsonl-executor-read-contract
  - **files**: src/templates/agents/index.ts, tests/templates/agents-executor.test.ts
  - **acceptance**: prompt says not to call `bp context <step>` and refuses to start when a row file is missing on disk.
  - **RED**: GIVEN the executor prompt WHEN inspected THEN it contains both auto-injection and missing-file refusal instructions.

- [x] T-20: [type:behavior] Reviewer prompt re-validates every context row reason <!-- commit: 7d8a000 -->
  - **refs**: DS-5
  - **spec_ref**: specs/platform-gen/spec.md#context-jsonl-reviewer-re-validation-contract
  - **files**: src/templates/agents/index.ts, tests/templates/agents-reviewer.test.ts
  - **acceptance**: prompt tells the reviewer to check every row's `reason` is still satisfied.
  - **RED**: GIVEN the reviewer prompt WHEN inspected THEN it contains the row reason re-validation contract.

- [ ] T-21: [type:behavior] Planner prompt writes context.jsonl for all referenced specs, conventions, and artifacts <!-- commit: -->
  - **refs**: DS-5
  - **spec_ref**: specs/platform-gen/spec.md#context-jsonl-planner-write-contract
  - **files**: src/templates/agents/index.ts, tests/templates/agents-planner.test.ts
  - **acceptance**: prompt instructs writing `context.jsonl` covering every spec path from design.md and tasks.md plus every convention path.
  - **RED**: GIVEN the planner prompt WHEN inspected THEN it contains the complete context.jsonl write contract.

- [ ] T-22: [type:behavior] Plan workflow relies on OMP auto-injection instead of bp context calls <!-- commit: -->
  - **refs**: DS-5
  - **spec_ref**: specs/platform-gen/spec.md#workflow-template-auto-injection-contract
  - **files**: src/templates/workflows/plan.ts, tests/templates/workflow-plan.test.ts
  - **acceptance**: plan workflow has no `Run \`bp context plan\`` instruction and says context is auto-injected by the OMP Extension.
  - **RED**: GIVEN the plan workflow template WHEN inspected THEN the legacy self-call is absent and auto-injection is explicit.

- [ ] T-23: [type:behavior] Apply and review workflows rely on OMP auto-injection <!-- commit: -->
  - **refs**: DS-5
  - **spec_ref**: specs/platform-gen/spec.md#workflow-template-auto-injection-contract
  - **files**: src/templates/workflows/apply.ts, src/templates/workflows/review.ts, tests/templates/workflow-apply-review.test.ts
  - **acceptance**: apply and review templates omit their bp context self-calls and both mention auto-injection.
  - **RED**: GIVEN apply and review workflow templates WHEN inspected THEN neither asks the agent to run bp context and both describe auto-injection.

- [ ] T-24: [type:behavior] Shared workflow exports the context.jsonl schema reminder <!-- commit: -->
  - **refs**: DS-5
  - **spec_ref**: specs/platform-gen/spec.md#workflow-template-auto-injection-contract
  - **files**: src/templates/workflows/shared.ts, tests/templates/workflow-shared.test.ts
  - **acceptance**: `CONTEXT_JSONL_REMINDER` is exported and contains literal `file:`, `reason:`, `phase:`, `read:`, and `range:` fields.
  - **RED**: GIVEN the shared workflow constants WHEN inspected THEN the context.jsonl reminder names every schema field.
***

## Wave 3: OMP Extension generator pipeline (PR-4)

- [ ] T-25..T-33: Extension template, runtime, shim generator

## Wave 4: Dogfood + e2e + docs (PR-5 + PR-6)

- [ ] T-34..T-52: Dogfood, e2e, stale-spec refresh, docs
