# Tasks: {{name}}

<!--
  Structured implementation checklist. Produced by the planner agent.
  Executors receive ONE wave at a time and implement its tasks via TDD.

  Quality bar:
  - Each task is independently testable (one behavioral path)
  - type:behavior tasks have RED descriptions (GIVEN/WHEN/THEN)
  - type:behavior tasks have spec_ref pointing to delta spec
  - Wave decomposition is based on real layer dependencies
  - depends_on is minimal (only when task B can't compile/test without task A)
  - Every DS-N in design.md is referenced by at least one task
-->

## TDD Type Annotations

<!--
  The type annotation determines how the executor handles this task.
  Choose carefully:
  - behavior: user-perceptible, test-assertable feature -> MUST do TDD
  - config: env vars, CI/CD, lint, tsconfig -> direct implementation
  - refactor: improve internal structure without changing behavior -> verify first
  - docs: README, API docs, comments -> direct implementation
  - scaffolding: module shells, directory structure, boilerplate -> direct implementation

  Rule: if the task's core output is "the system can now do X" -> behavior.
        if it's "file exists" or "config takes effect" -> config/scaffolding.
-->

| type | Meaning | TDD Protocol | Commit type |
|------|---------|-------------|-------------|
| `behavior` | Business behavior - observable, testable feature | RED -> GREEN -> REFACTOR | test + feat + refactor |
| `config` | Configuration - env vars, CI/CD, lint, tsconfig | Direct implementation | chore |
| `refactor` | Improve structure without changing behavior | Verify tests -> refactor -> verify | refactor |
| `docs` | Documentation - README, API docs, comments | Direct implementation | docs |
| `scaffolding` | Skeleton code - module shells, directory structure | Direct implementation | chore |

## Wave 1: {{theme}}

<!--
  Wave decomposition:
  - Default is 1 wave. Add more ONLY when tasks have layer dependencies.
  - Example of real layer dependency:
    Wave 1: data model + repository (can test independently)
    Wave 2: service layer (depends on Wave 1 models)
    Wave 3: API endpoints (depends on Wave 2 services)

  - Do NOT create multiple waves for tasks that are merely "related".
  - Do NOT create multiple waves for tasks in the same file.
  - Each wave must be independently verifiable (tsc + tests pass after wave completes).
-->

<!--
  Task fields:
  - [ ] checkbox (executor marks [x] with commit hash when done)
  - type: one of the TDD types above
  - refs: DS-N from design.md
  - spec_ref: REQUIRED for behavior tasks, points to delta spec requirement
  - files: full relative paths (comma-separated)
  - acceptance: binary pass/fail criteria (not subjective)
  - RED: GIVEN/WHEN/THEN for behavior tasks (describes observable behavior, not test implementation)
  - depends_on: only if task can't compile/test without another task
-->

- [ ] T-1: [type:behavior] {{task-title}}
  - **refs**: DS-{{id}}
  - **spec_ref**: specs/{{domain}}/spec.md#{{requirement-id}}
  - **files**: {{file-path-1}}, {{file-path-1-test}}
  - **acceptance**: {{binary-criteria - e.g., "toggle() changes theme from 'light' to 'dark'"}}
  - **RED**: GIVEN {{precondition}}
    WHEN {{action}}
    THEN {{observable-result}}
    AND {{additional-assertion}}

- [ ] T-2: [type:behavior] {{task-title}}
  - **refs**: DS-{{id}}
  - **spec_ref**: specs/{{domain}}/spec.md#{{requirement-id}}
  - **files**: {{file-path}}, {{file-path-test}}
  - **acceptance**: {{binary-criteria}}
  - **RED**: GIVEN {{precondition}}
    WHEN {{action}}
    THEN {{observable-result}}
  - **depends_on**: T-1

- [ ] T-3: [type:scaffolding] {{task-title}}
  - **refs**: DS-{{id}}
  - **files**: {{file-path}}
  - **acceptance**: {{criteria - e.g., "component file exists with correct imports"}}

## Wave 2: {{theme}}

<!--
  Only present if Wave 1 tasks are depended on by Wave 2 tasks.
  Remove this section if not needed.
-->

- [ ] T-4: [type:behavior] {{task-title}}
  - **refs**: DS-{{id}}
  - **spec_ref**: specs/{{domain}}/spec.md#{{requirement-id}}
  - **files**: {{file-path}}, {{file-path-test}}
  - **acceptance**: {{binary-criteria}}
  - **RED**: GIVEN {{precondition}}
    WHEN {{action}}
    THEN {{observable-result}}
  - **depends_on**: T-3

## Pre-Archive Checklist

<!--
  Verified by the orchestrator after all waves complete.
  These are the gates before review can run.
-->

- [ ] `tsc --noEmit` passes with no errors
- [ ] `vitest run` (or project test command) - all suites pass
- [ ] Every task in every wave is marked `[x]` with a commit hash
- [ ] No `{{` template placeholders remaining in any artifact
- [ ] All wave acceptance criteria confirmed
