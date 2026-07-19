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

- [ ] T-13..T-24: Context JSONL artifact, validation, template contracts

## Wave 3: OMP Extension generator pipeline (PR-4)

- [ ] T-25..T-33: Extension template, runtime, shim generator

## Wave 4: Dogfood + e2e + docs (PR-5 + PR-6)

- [ ] T-34..T-52: Dogfood, e2e, stale-spec refresh, docs
