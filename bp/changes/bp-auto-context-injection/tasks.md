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

- [x] T-21: [type:behavior] Planner prompt writes context.jsonl for all referenced specs, conventions, and artifacts <!-- commit: 4403e45 -->
  - **refs**: DS-5
  - **spec_ref**: specs/platform-gen/spec.md#context-jsonl-planner-write-contract
  - **files**: src/templates/agents/index.ts, tests/templates/agents-planner.test.ts
  - **acceptance**: prompt instructs writing `context.jsonl` covering every spec path from design.md and tasks.md plus every convention path.
  - **RED**: GIVEN the planner prompt WHEN inspected THEN it contains the complete context.jsonl write contract.

- [x] T-22: [type:behavior] Plan workflow relies on OMP auto-injection instead of bp context calls <!-- commit: 2c7a6dc -->
  - **refs**: DS-5
  - **spec_ref**: specs/platform-gen/spec.md#workflow-template-auto-injection-contract
  - **files**: src/templates/workflows/plan.ts, tests/templates/workflow-plan.test.ts
  - **acceptance**: plan workflow has no `Run \`bp context plan\`` instruction and says context is auto-injected by the OMP Extension.
  - **RED**: GIVEN the plan workflow template WHEN inspected THEN the legacy self-call is absent and auto-injection is explicit.

- [x] T-23: [type:behavior] Apply and review workflows rely on OMP auto-injection <!-- commit: ebd7a13 -->
  - **refs**: DS-5
  - **spec_ref**: specs/platform-gen/spec.md#workflow-template-auto-injection-contract
  - **files**: src/templates/workflows/apply.ts, src/templates/workflows/review.ts, tests/templates/workflow-apply-review.test.ts
  - **acceptance**: apply and review templates omit their bp context self-calls and both mention auto-injection.
  - **RED**: GIVEN apply and review workflow templates WHEN inspected THEN neither asks the agent to run bp context and both describe auto-injection.

- [x] T-24: [type:behavior] Shared workflow exports the context.jsonl schema reminder <!-- commit: 5c44ef7 -->
  - **refs**: DS-5
  - **spec_ref**: specs/platform-gen/spec.md#workflow-template-auto-injection-contract
  - **files**: src/templates/workflows/shared.ts, tests/templates/workflow-shared.test.ts
  - **acceptance**: `CONTEXT_JSONL_REMINDER` is exported and contains literal `file:`, `reason:`, `phase:`, `read:`, and `range:` fields.
  - **RED**: GIVEN the shared workflow constants WHEN inspected THEN the context.jsonl reminder names every schema field.
## Wave 3: OMP Extension generator pipeline (PR-4)

- [x] T-25: [type:scaffolding] Scaffold extension-runtime + extension + legacy-shim modules and .tmpl sources <!-- commit: c22efc7 -->
  - **refs**: D-4, D-5, D-6, D-7
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-generator-surface
  - **files**: src/integrations/omp/extension-runtime.ts, src/integrations/omp/extension.ts, src/integrations/omp/legacy-shim.ts, src/templates/omp/extension.ts.tmpl, src/templates/omp/legacy-shim.ts.tmpl
  - **acceptance**: extension-runtime.ts exports `EXTENSION_SOURCE` and `SHIM_SOURCE` string constants plus helper types; extension.ts and legacy-shim.ts return file descriptors; .tmpl files exist as string-constant modules; `tsc --noEmit` passes.

- [x] T-26: [type:behavior] session_start default emits paths-only compact block <!-- commit: 9ca7818 -->
  - **refs**: D-3
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-sub-agent-discrimination
  - **files**: src/integrations/omp/extension-runtime.ts, tests/integration/omp-extension.test.ts
  - **acceptance**: GIVEN ctx with `agentTemplate` not matching planner/executor/reviewer WHEN handleSessionStart runs THEN it emits a `<bp-context>...</bp-context>` block via `bp context --format=compact` and no augmentation.
  - **RED**: handler calls sendMessage with customType=bp-context, no roadmap block, no inline rows, no reasons.

- [x] T-27: [type:behavior] session_start planner appends roadmap state block <!-- commit: 90ed8ed -->
  - **refs**: D-3
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-sub-agent-discrimination
  - **files**: src/integrations/omp/extension-runtime.ts, tests/integration/omp-extension.test.ts
  - **acceptance**: GIVEN ctx with `agentTemplate` containing 'planner' WHEN handleSessionStart runs THEN the emitted message body contains a `## Roadmap State` section derived from `state.md` (or `bp state` JSON) — current milestone, current phase, next step name.
  - **RED**: handler sendMessage body contains `## Roadmap State` plus milestone/phase/next.

- [x] T-28: [type:behavior] session_start executor inlines context.jsonl rows with guard-rail prefix <!-- commit: 90ed8ed -->
  - **refs**: D-3
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-sub-agent-discrimination
  - **files**: src/integrations/omp/extension-runtime.ts, tests/integration/omp-extension.test.ts
  - **acceptance**: GIVEN ctx with `agentTemplate` containing 'executor' and a fixture context.jsonl whose rows include at least one `tag: guard-rail` row WHEN handleSessionStart runs THEN every row is rendered inline, and guard-rail rows are prefixed with `> GUARD-RAIL: `.
  - **RED**: handler sendMessage body contains each row's `file:` and `reason:`, and guard-rail rows have `> GUARD-RAIL:` prefix.

- [x] T-29: [type:behavior] session_start reviewer appends reason bullets and tasks.md acceptance criteria <!-- commit: 90ed8ed -->
  - **refs**: D-3
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-sub-agent-discrimination
  - **files**: src/integrations/omp/extension-runtime.ts, tests/integration/omp-extension.test.ts
  - **acceptance**: GIVEN ctx with `agentTemplate` containing 'reviewer' and a fixture context.jsonl + tasks.md WHEN handleSessionStart runs THEN each row's `reason:` renders as a bullet under `## Invariants` AND tasks.md acceptance-criteria text appears verbatim.
  - **RED**: handler sendMessage body contains `- <reason text>` for each row and the literal acceptance string.

- [x] T-30: [type:behavior] before_agent_start returns workflow-state custom message <!-- commit: 90ed8ed -->
  - **refs**: D-4
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-runtime-surface
  - **files**: src/integrations/omp/extension-runtime.ts, tests/integration/omp-extension.test.ts
  - **acceptance**: GIVEN ctx with cwd containing bp/config.yaml WHEN handleBeforeAgentStart runs THEN it returns `{ message: { role: 'custom', customType: 'bp-workflow-state', content: [...], timestamp: number } }` derived from `bp continue` output.
  - **RED**: handler return value is `{ message: { customType: 'bp-workflow-state', ... } }`.

- [x] T-31: [type:behavior] context post-compaction re-injects when missing <!-- commit: 90ed8ed -->
  - **refs**: D-8
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-post-compaction-recovery
  - **files**: src/integrations/omp/extension-runtime.ts, tests/integration/omp-extension.test.ts
  - **acceptance**: GIVEN ctx with `lastCompactionTs > lastInjectionTs` and `recentMessages` containing no `bp-workflow-state` entry WHEN handleContext runs THEN it returns `{ message: { customType: 'bp-workflow-state', ... } }` re-injecting the workflow state.
  - **RED**: handler return value is `{ message: { customType: 'bp-workflow-state', ... } }`.

- [x] T-32: [type:behavior] context no-compaction fast path returns no message <!-- commit: 90ed8ed -->
  - **refs**: D-8
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-post-compaction-recovery
  - **files**: src/integrations/omp/extension-runtime.ts, tests/integration/omp-extension.test.ts
  - **acceptance**: GIVEN ctx with `lastCompactionTs <= lastInjectionTs` (or undefined) WHEN handleContext runs THEN it returns `undefined` (no message).
  - **RED**: handler return value is `undefined`.

- [x] T-33: [type:behavior] BP_HOOKS=0 short-circuits every handler <!-- commit: 90ed8ed -->
  - **refs**: D-9
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-env-bypass
  - **files**: src/integrations/omp/extension-runtime.ts, tests/integration/omp-extension.test.ts
  - **acceptance**: GIVEN process.env.BP_HOOKS === '0' (or BP_DISABLE_HOOKS === '1') WHEN any of handleSessionStart / handleBeforeAgentStart / handleContext runs THEN it returns immediately without side effects.
  - **RED**: handlers return undefined and do not call api.sendMessage.

- [x] T-34: [type:behavior] handlers skip when bp/config.yaml is missing <!-- commit: 90ed8ed -->
  - **refs**: D-4
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-config-skip
  - **files**: src/integrations/omp/extension-runtime.ts, tests/integration/omp-extension.test.ts
  - **acceptance**: GIVEN ctx.cwd points to a directory without bp/config.yaml WHEN any handler runs THEN it returns immediately without side effects.
  - **RED**: handlers return undefined and do not call api.sendMessage.

- [x] T-35: [type:behavior] generator output is byte-deterministic across consecutive runs <!-- commit: 90ed8ed -->
  - **refs**: D-6
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-byte-determinism
  - **files**: src/integrations/omp/extension.ts, tests/integration/omp-extension.test.ts
  - **acceptance**: GIVEN the same ProjectConfig WHEN generateExtension is called twice in succession THEN both file descriptors are byte-identical (path and content equal).
  - **RED**: second-run content === first-run content.

- [x] T-36: [type:behavior] legacy shim generator emits a 5-line re-export of the Extension default <!-- commit: 90ed8ed -->
  - **refs**: D-7
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-legacy-shim
  - **files**: src/integrations/omp/legacy-shim.ts, tests/integration/omp-extension.test.ts
  - **acceptance**: generateLegacyShim returns `{ path: '.omp/hooks/pre/bp.ts', content }` where the content is exactly the 5-line shim that re-exports the default export from `../extensions/bp/index.js`.
  - **RED**: shim content matches the committed 5-line snapshot.
- [x] T-37: [type:behavior] .tmpl files are the single source of truth for generated sources <!-- commit: 6d08c2c -->
  - **refs**: D-6
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-template-source
  - **files**: src/templates/omp/extension.ts.tmpl, src/templates/omp/legacy-shim.ts.tmpl
  - **acceptance**: importing from the .tmpl modules resolves to non-empty string constants, and the generator functions in extension.ts / legacy-shim.ts use these constants as their content.
  - **RED**: imports resolve; constants are non-empty strings.

- [x] T-38: [type:behavior] snapshot test pins the generated Extension source to a committed file <!-- commit: 6d08c2c -->
  - **refs**: D-6
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-template-source
  - **files**: tests/integration/omp-extension.test.ts, tests/integration/__snapshots__/omp-extension.test.ts.snap
  - **acceptance**: a vitest `toMatchSnapshot()` assertion records the full EXTENSION_SOURCE in `tests/integration/__snapshots__/omp-extension.test.ts.snap` and the test passes deterministically.
  - **RED**: test fails when the snapshot is missing, passes when it matches.

- [x] T-39: [type:behavior] multi-platform snapshot is regenerated to include the new .omp/extensions/bp/index.ts <!-- commit: fd42398 -->
  - **refs**: D-4
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-generator-surface
  - **files**: src/generators/__snapshots__/multi-platform.test.ts.snap, src/integrations/omp/index.ts
  - **acceptance**: `src/generators/multi-platform.test.ts > all-platform golden-file snapshot` includes an entry for `.omp/extensions/bp/index.ts`.
  - **RED**: `npx vitest run src/generators/multi-platform.test.ts` passes with the regenerated snapshot.
- [x] T-40: [type:chore] delete src/integrations/omp/hook.ts (single source of truth = Extension generator) <!-- commit: d698416 -->
  - **refs**: D-4, D-6
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-generator-surface
  - **files**: src/integrations/omp/hook.ts
  - **acceptance**: `src/integrations/omp/hook.ts` is removed from the filesystem and from git; nothing in src/ or tests/ imports from `./omp/hook.js`.
  - **RED**: `git ls-files src/integrations/omp/hook.ts` returns nothing.

- [x] T-41: [type:refactor] swap inline HOOK_TEMPLATE for the Extension generator pipeline in bp-update and bp-init <!-- commit: 4619d5b -->
  - **refs**: D-6, D-7
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-template-source
  - **files**: src/commands/bp-update.ts, src/commands/bp-init.ts, src/integrations/omp/index.ts
  - **acceptance**: `src/commands/bp-update.ts` and `src/commands/bp-init.ts` no longer define or import a `HOOK_TEMPLATE` constant; the OMP provider's `generate()` returns the extension and shim file descriptors; `bp update` writes both `.omp/extensions/bp/index.ts` and `.omp/hooks/pre/bp.ts`; `bp init` does the same when `platform: [omp]`.
  - **RED**: `grep -n HOOK_TEMPLATE src/commands/` returns no matches.

- [x] T-42: [type:config] add @oh-my-pi/pi-coding-agent as a devDependency <!-- commit: 05eb777 -->
  - **refs**: D-5
  - **spec_ref**: specs/platform-gen/spec.md#omp-extension-runtime-surface
  - **files**: package.json
  - **acceptance**: `package.json` declares `"@oh-my-pi/pi-coding-agent": "^17.0.5"` (or compatible range) under `devDependencies`; no other package.json fields are removed; `npm install` succeeds; `tsc --noEmit` still passes.
  - **RED**: `node -e 'JSON.parse(require("fs").readFileSync("package.json","utf-8")).devDependencies["@oh-my-pi/pi-coding-agent"]'` is non-empty.
- [x] T-43: [type:behavior] e2e test — fake OMP runtime exercises generated Extension <!-- commit: pending -->
- [x] T-44: [type:behavior] Extend tests/integration/lifecycle.test.ts to assert generated files <!-- commit: 8538567 -->
- [x] T-45: [type:docs] AGENTS.md extended with Context Injection section <!-- commit: 8f8ea93 -->
- [x] T-46: [type:docs] docs/platform-integration.md created <!-- commit: 29e0ae5 -->
- [x] T-47: [type:docs] Refresh stale SHALs in bp/specs/platform-gen/spec.md <!-- commit: dd6b372 -->
  - **refs**: D-10
  - **spec_ref**: specs/platform-gen/spec.md
  - **files**: bp/specs/platform-gen/spec.md
  - **acceptance**: every `blueprint update` line replaced with `bp update`; `grep -F 'blueprint update' bp/specs/platform-gen/spec.md` returns 0 lines; `grep -c 'bp update' bp/specs/platform-gen/spec.md` returns ≥ 1.
