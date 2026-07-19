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

- [ ] T-1: [type:behavior] spec-injector.generateCompactContext returns shape <!-- commit: -->
  - **refs**: DS-1
  - **spec_ref**: specs/platform-gen/spec.md#compact-context-map-surface
  - **files**: src/core/spec-injector.ts, src/types/spec-injector.ts, tests/core/spec-injector.test.ts
  - **acceptance**: given fixture bp dir with 3 specs / 2 conventions / 1 active change in_progress / 1 archived change / 2 rules, generateCompactContext returns object with arrays populated, activeChange non-null, rules.length === 2

- [ ] T-2: [type:behavior] spec-injector title extraction with H1/H2 fallback to file stem <!-- commit: -->
  - **refs**: DS-1
  - **spec_ref**: specs/platform-gen/spec.md#compact-context-map-surface
  - **files**: src/core/spec-injector.ts, tests/core/spec-injector.test.ts
  - **acceptance**: when a spec file starts with `# Heading`, title is `Heading`; when it has no `#` line, title equals the file stem

- [ ] T-3: [type:behavior] spec-injector activeChange is null when all changes archived <!-- commit: -->
  - **refs**: DS-1
  - **files**: src/core/spec-injector.ts, tests/core/spec-injector.test.ts
  - **acceptance**: when every entry in `bp/changes/*` has status `archived`, result.activeChange is null

- [ ] T-4: [type:behavior] formatContextCompact emits <bp-context> markdown block <!-- commit: -->
  - **refs**: DS-1
  - **spec_ref**: specs/platform-gen/spec.md#compact-payload-budget
  - **files**: src/core/spec-injector.ts, tests/core/spec-injector.test.ts
  - **acceptance**: output starts with `<bp-context>` and ends with `</bp-context>`, rules render as `- artifact: ...`

- [ ] T-5: [type:behavior] formatContextCompactJson round-trips through JSON.stringify <!-- commit: -->
  - **refs**: DS-1
  - **spec_ref**: specs/platform-gen/spec.md#compact-payload-budget
  - **files**: src/core/spec-injector.ts, tests/core/spec-injector.test.ts
  - **acceptance**: JSON.parse(formatContextCompactJson(result)) deep-equals input (excluding generatedAt)

- [ ] T-6: [type:behavior] Compact payload size stays under 4 KB at 200 specs stress <!-- commit: -->
  - **refs**: DS-1
  - **spec_ref**: specs/platform-gen/spec.md#compact-payload-budget
  - **files**: src/core/spec-injector.ts, tests/core/spec-injector.test.ts
  - **acceptance**: under stress fixture with 200 specs, formatContextCompact(result).length <= 4096 or throws

- [ ] T-7: [type:scaffolding] bp context CLI scaffold registered in commander <!-- commit: -->
  - **refs**: DS-2
  - **files**: src/commands/bp-context.ts, src/cli.ts
  - **acceptance**: `bp context --help` lists `--format <full|compact|json>` and `--change <name>`; default format is `full`

- [ ] T-8: [type:behavior] bp context --format=full matches existing terminal snapshot <!-- commit: -->
  - **refs**: DS-2
  - **files**: src/commands/bp-context.ts, tests/commands/bp-context.test.ts
  - **acceptance**: invoking with `--format=full` against a fixture bp project produces stdout matching snapshot

- [ ] T-9: [type:behavior] bp context --format=compact emits <bp-context> block <!-- commit: -->
  - **refs**: DS-2
  - **files**: src/commands/bp-context.ts, tests/commands/bp-context.test.ts
  - **acceptance**: stdout contains `<bp-context>` and `</bp-context>`; exit code 0

- [x] T-10: [type:behavior] bp context --format=json emits parseable JSON with all CompactContext fields <!-- commit: e89ee53 -->
  - **refs**: DS-2
  - **files**: src/commands/bp-context.ts, tests/commands/bp-context.test.ts
  - **acceptance**: stdout is JSON.parse-able; fields `specs`, `conventions`, `activeChange`, `rules`, `generatedAt` all present

- [ ] T-11: [type:behavior] bp context --change <unresolved> exits non-zero with clean error <!-- commit: -->
  - **refs**: DS-2
  - **files**: src/commands/bp-context.ts, tests/commands/bp-context.test.ts
  - **acceptance**: exit code != 0; stderr contains `Change 'does-not-exist' not found under bp/changes/`

- [ ] T-12: [type:behavior] bp context exits non-zero when bp/config.yaml missing <!-- commit: -->
  - **refs**: DS-2
  - **files**: src/commands/bp-context.ts, tests/commands/bp-context.test.ts
  - **acceptance**: empty dir exits non-zero; stderr mentions `bp/config.yaml` and `bp init`

## Wave 2: context.jsonl artifact + validation (PR-3)

- [ ] T-13: [type:behavior] ContextRefRowSchema accepts valid row, rejects missing required fields
- [ ] T-14: [type:behavior] parseContextJsonl reads file line-by-line, preserves order, surfaces errors
- [ ] T-15: [type:behavior] validateContextJsonl rejects unresolved paths and out-of-bounds ranges
- [ ] T-16: [type:behavior] validateContextJsonl filters rows by current phase and reports mismatch
- [ ] T-17: [type:behavior] validateChange() surfaces context.jsonl errors with line numbers
- [ ] T-18: [type:behavior] integration test: planner writes context.jsonl from design.md refs
- [ ] T-19: [type:behavior] EXECUTOR_PROMPT reads context.jsonl, refuses missing files
- [ ] T-20: [type:behavior] REVIEWER_PROMPT re-validates every context.jsonl row's reason
- [ ] T-21: [type:behavior] PLANNER_PROMPT writes context.jsonl covering every spec/convention
- [ ] T-22: [type:behavior] workflow/plan.ts drops bp context call, references auto-injection
- [ ] T-23: [type:behavior] workflow/apply.ts and review.ts drop bp context calls
- [ ] T-24: [type:behavior] workflow/shared.ts adds context.jsonl schema reminder block

## Wave 3: OMP Extension generator pipeline (PR-4)

- [ ] T-25: [type:scaffolding] src/templates/omp/extension.ts.tmpl shell
- [ ] T-26: [type:scaffolding] src/templates/omp/legacy-shim.ts.tmpl shell
- [ ] T-27: [type:behavior] extension-runtime.session_start default agent payload
- [ ] T-28: [type:behavior] extension-runtime.session_start planner payload with <roadmap-state>
- [ ] T-29: [type:behavior] extension-runtime.session_start executor inline context.jsonl
- [ ] T-30: [type:behavior] extension-runtime.session_start reviewer <review-context>
- [ ] T-31: [type:behavior] extension-runtime.before_agent_start workflow-state message
- [ ] T-32: [type:behavior] extension-runtime.session_before_compact timestamp
- [ ] T-33: [type:behavior] extension-runtime.context post-compaction re-injection

## Wave 4: Dogfood + e2e + docs (PR-5 + PR-6)

- [ ] T-34..T-52: Dogfood, e2e, stale-spec refresh, docs
