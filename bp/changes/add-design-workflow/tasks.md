# Tasks: add-design-workflow

<!--
  Structured implementation checklist. Produced by the planner agent.
  Executors receive ONE wave at a time and implement its tasks via TDD.

  Quality bar:
  - Each task is a cohesive module/deliverable unit (NOT one task per behavior path)
  - type:behavior tasks have RED descriptions (GIVEN/WHEN/THEN)
  - type:behavior tasks have spec_ref pointing to delta spec
  - Wave decomposition is based on real layer dependencies
  - depends_on is minimal (only when task B can't compile/test without task A)
  - Every DS-N in design.md is referenced by at least one task
  - Granularity check: > 15 tasks per change = over-split, merge
-->

## TDD Type Annotations

| type | Meaning | TDD Protocol | Commit type |
| ------ | --------- | ------------- | ------------- |
| `behavior` | Business behavior - observable, testable feature | RED -> GREEN -> REFACTOR | test + feat + refactor |
| `config` | Configuration - env vars, CI/CD, lint, tsconfig | Direct implementation | chore |
| `refactor` | Improve structure without changing behavior | Verify tests -> refactor -> verify | refactor |
| `docs` | Documentation - README, API docs, comments | Direct implementation | docs |
| `scaffolding` | Skeleton code - module shells, directory structure | Direct implementation | chore |

## Wave 1: Design track end-to-end (templates -> role -> commands -> platforms -> artifacts)

<!--
  Single wave: every task edits template/generator-layer modules with no cross-layer
  compile ordering beyond the depends_on edges below. depends_on only where task B
  cannot compile/test without task A:
  - T-5 platform STEPS arrays are typed `WorkflowStep[]` (keyof WORKFLOW_REGISTRY) — the
    registry must already contain the design keys, else tsc fails → depends_on T-1.
  - T-4 commands read getWorkflowInstructions() from the registry → depends_on T-1.
  - T-6 pi-extension marker test asserts disjointness against AGENT_PROMPTS → depends_on T-2.
  - T-9 dogfood regenerates from the finished generators → depends_on T-5.
-->

- [x] T-1: [type:behavior] Design-track workflow step templates + registry (design, design-html, design-review, design-shotgun, plan-design-review) <!-- commit: d7decb1 -->
  - **refs**: DS-1
  - **spec_ref**: specs/design/spec.md#design-step-templates
  - **files**: src/templates/workflows/design.ts, design-html.ts, design-review.ts, design-shotgun.ts, plan-design-review.ts, src/templates/workflows/registry.ts, tests/templates/workflow-design-steps.test.ts
  - **acceptance**: WORKFLOW_REGISTRY has 16 keys including the five design steps; each new step's skill and command share byte-identical instructions; every new instructions string contains `## Input`, `## Steps`, `## Output`, `## Guardrails` in order; no `{{`, no `~/.gstack`/`Pretext`/`gstack-config`; every new description is free of `': '`
  - **RED**:
    - **GIVEN** the WORKFLOW_REGISTRY and the five new workflow template modules
    - **WHEN** the registry is read and each new step's `get<X>SkillTemplate()` and `get<X>CommandTemplate()` are called
    - **THEN** the registry contains 16 entries including `design`, `design-html`, `design-review`, `design-shotgun`, `plan-design-review`
    - **AND** for each new step the skill `instructions` equals the command `content`
    - **AND** each instructions string contains `## Input`, `## Steps`, `## Output`, `## Guardrails` in order, no `{{` placeholder, and none of `~/.gstack`, `Pretext`, `gstack-config`
    - **AND** every new skill/command `description` matches the regex `/:\s/` zero times (no colon-space — pi parseFrontmatter throws on it, see commit 02dd037)
  - **notes**: Instructions are bp-style orchestrator text (120-250 lines each), adapted from gstack phase structure with a provenance comment; `plan-design-review` is UI-audit-only (no platform gates, no codex design voice, no plan-mode EXIT machinery). Descriptions use the hyphen style from DS-1's table. Registry additions only — no transition-graph or continue changes (design steps are auxiliary like ff/loop/refactor).

- [x] T-2: [type:behavior] Designer sub-agent prompt (DESIGNER_PROMPT + AGENT_PROMPTS registration) <!-- commit: 3c00ec2 -->
  - **refs**: DS-2
  - **spec_ref**: specs/design/spec.md#designer-sub-agent
  - **files**: src/templates/agents/index.ts, tests/templates/agents-designer.test.ts
  - **acceptance**: AGENT_PROMPTS['designer'] is a non-empty English string identical to DESIGNER_PROMPT, containing `## Role`, `## Core Principles`, `## Inputs`, `## Behaviors`, `## Output`, `## Guardrails` in order, embedding the shared AGENT_CONSTRAINTS block, and containing the marker `Design Consultant`
  - **RED**:
    - **GIVEN** the AGENT_PROMPTS map exported from src/templates/agents/index.ts
    - **WHEN** `AGENT_PROMPTS['designer']` is read and scanned
    - **THEN** it is a non-empty string containing `## Role`, `## Core Principles`, `## Inputs`, `## Behaviors`, `## Output`, `## Guardrails`
    - **AND** it contains the substring `Design Consultant` and does NOT contain `Change Design Specialist`
    - **AND** it includes the shared constraints text `NEVER run bp continue` (AGENT_CONSTRAINTS embedded)
  - **notes**: Marker `Design Consultant` is deliberately disjoint from the planner's `Change Design Specialist` (which contains `Design Specialist` as a substring — D-3). Prompt mirrors PLANNER_PROMPT's ENGINEERING-CONSTRAINT/CAPABILITY-COMPENSATION comment structure; one role serving all five design steps, step-specific task supplied at dispatch; guardrails forbid source-code edits and `bp continue`.

- [x] T-3: [type:behavior] Designer dispatch output + model tier <!-- commit: 012f129 -->
  - **refs**: DS-3
  - **spec_ref**: specs/design/spec.md#designer-dispatch-and-model-tier
  - **files**: src/commands/bp-dispatch.ts, src/types/config.ts, tests/commands/bp-dispatch.test.ts
  - **acceptance**: `bp dispatch designer` prints a `## Dispatch: bp-designer` section per configured FORMATS platform, an Isolation block with `Read-only role — no isolation needed`, and `### Model Selection` with `Role: designer` and the resolved model; PROFILE_MODEL_MAP carries a `designer` tier per profile; `config.models.designer` overrides the printed model
  - **RED**:
    - **GIVEN** an initialized bp project with the default platform set
    - **WHEN** `node <cli> dispatch designer` runs
    - **THEN** stdout contains `## Dispatch: bp-designer (omp)`, `### Isolation`, and `### Model Selection` with `Role: designer`
    - **AND** stdout contains the line `bp template design-system` (ROLE_TEMPLATES['designer'] = ['design-system'])
    - **AND** after setting `models.designer: <model>` in bp/config.yaml, the printed Model line shows `<model>`
  - **notes**: FORMATS and EXECUTOR_ISOLATION are UNCHANGED (verified role-placeholder design — D-4); designer stays non-executor-like (read-only on source, like planner/reviewer). PROFILE_MODEL_MAP gains `designer` mirroring each profile's `planner` value: trivial/light `pi/task`, standard/critical `pi/plan`. `resolveModelsForLevel` needs no change.

- [x] T-4: [type:behavior] Five design CLI commands + cli.ts registration <!-- commit: 8f48466 -->
  - **refs**: DS-4
  - **spec_ref**: specs/design/spec.md#design-cli-commands
  - **files**: src/commands/bp-design.ts, bp-design-html.ts, bp-design-review.ts, bp-design-shotgun.ts, bp-plan-design-review.ts, src/cli.ts, tests/commands/bp-design-commands.test.ts
  - **acceptance**: `bp --help` lists all five commands; each command in an initialized project prints its step's full instructions and exits 0; each exits 1 with `Not in a blueprint project. Run "bp init" first.` outside a project
  - **RED**:
    - **GIVEN** an initialized bp project at a temp directory
    - **WHEN** `bp design`, `bp design-html`, `bp design-review`, `bp design-shotgun`, and `bp plan-design-review` each run
    - **THEN** each prints non-empty instructions containing `## Steps` and exits 0
    - **AND** `bp --help` output contains all five command names
    - **GIVEN** a directory without a `bp/` folder
    - **WHEN** `bp design` runs there
    - **THEN** stderr contains `Not in a blueprint project. Run "bp init" first.` and the exit code is 1
  - **notes**: Mirror bp-refactor.ts's handler pattern (findBpDir gate → `getWorkflowInstructions('<step>', bpDir)` → print). Optional `[change-name]` positional is advisory (surfaces as `$ARGUMENTS` in the printed instructions; no change-dir validation at command level). cli.ts gains 5 register imports + calls.

- [x] T-5: [type:behavior] Platform generator STEPS growth + designer agent files + snapshot regeneration <!-- commit: f5db395 -->
  - **refs**: DS-5
  - **spec_ref**: specs/design/spec.md#platform-design-step-generation, specs/platform-gen/spec.md#pi-skills-generation, specs/platform-gen/spec.md#pi-agents-generation, specs/platform-gen/spec.md#codex-platform-support, specs/platform-gen/spec.md#pi-platform-support
  - **files**: src/integrations/pi/skills.ts, omp/skills.ts, omp/commands.ts, claude-code/commands.ts, codex/skills.ts, agent/skills.ts, pi/agents.ts, agent/agents.ts, claude-code/agents.ts, omp/agents.ts, and the count-pin tests + snapshots listed in design.md Test Impacts
  - **acceptance**: PI_SKILL_DEFS length 16; CODEX_SKILL_DEFS length 16; agent skills length 16; claude-code commands length 16; omp commands length 16; omp skills length 15; pi/agent/claude-code/omp agent role lists length 7 including `designer`; `npx vitest run` green with regenerated snapshots; every generated design-step body byte-identical to the registry instructions
  - **RED**:
    - **GIVEN** the platform generator modules
    - **WHEN** `PI_SKILL_DEFS`, `CODEX_SKILL_DEFS`, agent skills STEPS, claude-code commands STEPS, omp commands STEPS, and omp skills STEPS are read
    - **THEN** each includes the five design steps `design`, `design-html`, `design-review`, `design-shotgun`, `plan-design-review` (lengths 16/16/16/16/16/15 respectively)
    - **AND** `PI_AGENT_DEFS` and the agent/claude-code/omp role lists each include `designer` (length 7)
    - **AND** for each design step, the generated `.pi/skills/bp-<step>/SKILL.md` body equals `WORKFLOW_REGISTRY[step].skill().instructions`
    - **AND** every new generated description contains no `': '`
  - **notes**: Append the five steps after `refactor` in each STEPS list (pi order is canonical); description strings come from DS-1's table. omp/skills.ts grows 10 → 15 — its list lacks `refactor` (pre-existing gap, do NOT add it — D-9). omp/commands.ts + claude-code/commands.ts gain command defs with `usesAgent: true, agents: ['designer']` (argumentHint `[change-name]` for design-review and plan-design-review). GREEN includes updating the count-pin tests (pi index 18→24, skills 11→16, agents 6→7, codex 11→16, agent skills 11→16, agent agents 6→7, claude-code commands 11→16, claude-code agents 6→7) and regenerating snapshots with `npx vitest run --update`. Do NOT touch src/integrations/opencode/* (D-6).

- [x] T-6: [type:behavior] Pi extension designer agent-type detection (runtime + template lockstep) <!-- commit: 2a6da62 -->
  - **refs**: DS-6
  - **spec_ref**: specs/design/spec.md#designer-agent-type-detection
  - **files**: src/integrations/pi/extension-runtime.ts, src/templates/pi/extension.tmpl.ts, src/integrations/pi/extension-runtime.test.ts
  - **acceptance**: `detectAgentTypeFromPrompt` returns `'designer'` for the `Design Consultant` marker and the shipped DESIGNER_PROMPT; every other shipped prompt still detects as its own type; a designer session emits a paths-only `<bp-context>` block; the template's `detectAgentType` behaves identically
  - **RED**:
    - **GIVEN** the pi extension runtime's `detectAgentTypeFromPrompt`
    - **WHEN** called with a prompt containing `Design Consultant` and with the actual `AGENT_PROMPTS['designer']` string
    - **THEN** both return `'designer'`
    - **AND** for every role prompt in `AGENT_PROMPTS` (planner, executor, reviewer, codebase-scanner, refactorer, fixer, designer), the function returns exactly that role's type (disjointness — catches marker collision)
    - **AND** the session_start handler for a designer session emits a `bp-context` message containing `<bp-context>` and no `## Roadmap State` / `## Invariants` section
    - **AND** the same marker string `Design Consultant` appears in both extension-runtime.ts and extension.tmpl.ts (lockstep)
  - **notes**: Extend the `AgentType` union + `AGENT_TYPE_MARKERS` (append `['designer', 'Design Consultant']` after the six existing entries); add an explicit `else if (agentType === 'designer')` branch in renderAugmentedBody returning the un-augmented block (same body as default — no new augmentation section; explicit branch is the future hook). Mirror in extension.tmpl.ts exactly. Depends on T-2 (marker disjointness is asserted against the shipped prompts).

- [x] T-7: [type:behavior] Design artifacts — design-system template + design-review.md tolerance <!-- commit: 8c5ec99 -->
  - **refs**: DS-7
  - **spec_ref**: specs/design/spec.md#design-system-artifact, specs/design/spec.md#design-review-artifact-tolerance
  - **files**: src/templates/artifacts/design-system.ts, src/templates/artifacts/index.ts, src/commands/bp-template.ts, src/core/artifact-validator.ts, tests/core/design-review-tolerance.test.ts, tests/commands/bp-template.test.ts
  - **acceptance**: `bp template design-system --stdout` prints the `## Design System` shape (Product Context / Aesthetic Direction / Typography / Color / Spacing / Layout / Motion / Decisions Log) with no unsubstituted placeholders; `FILENAMES['design-system']` maps to `DESIGN.md`; `validateChange` reports a present `design-review.md` as valid; continue's next-step output is byte-identical with and without `design-review.md`
  - **RED**:
    - **GIVEN** an initialized bp project
    - **WHEN** `bp template design-system --stdout` runs
    - **THEN** stdout contains `## Design System` and the subsections `### Product Context`, `### Aesthetic Direction`, `### Typography`, `### Color`, `### Spacing`, `### Layout`, `### Motion`, `### Decisions Log`
    - **AND** after the template handler substitutes the name/date tokens, no double-brace placeholder remains
    - **GIVEN** a change dir containing `design-review.md`
    - **WHEN** `validateChange` runs on it
    - **THEN** `results['design-review']` exists with `valid: true` and zero errors
    - **AND** `bp continue` on the change returns the same next-step command whether or not `design-review.md` is present (tolerance — absence must not block)
  - **notes**: DESIGN_SYSTEM_TEMPLATE lives in the new design-system.ts module, re-exported and registered in index.ts (`ARTIFACT_TEMPLATES['design-system']` — TEMPLATE_IDS auto-widens); bp-template.ts gains `FILENAMES['design-system'] = 'DESIGN.md'` (root-file exception per user decision). artifact-validator.ts: add the `design-review` entry to validateChange's known-files array (validateArtifact's default case already pass-through-validates it). continue.ts needs NO code change — verified it only reads schema-declared artifacts; the tolerance is locked by the regression test (D-8).

- [x] T-8: [type:behavior] Core-loop advisory hooks (plan + check templates) <!-- commit: a9b68ab -->
  - **refs**: DS-8
  - **spec_ref**: specs/design/spec.md#core-loop-advisory-hooks
  - **files**: src/templates/workflows/plan.ts, src/templates/workflows/check.ts, tests/templates/workflow-plan.test.ts (or new assertions in tests/templates/)
  - **acceptance**: the plan template content contains `bp plan-design-review`; the check template content contains `bp design-review`; neither adds a gate (no MUST/SHALL tying the design step to the plan/check verdict); existing Input/Steps/Output/Guardrails structure intact
  - **RED**:
    - **GIVEN** `getPlanCommandTemplate().content` and `getCheckCommandTemplate().content`
    - **WHEN** scanned for the advisory references
    - **THEN** the plan content contains the substring `bp plan-design-review`
    - **AND** the check content contains the substring `bp design-review`
    - **AND** neither content contains a MUST/SHALL sentence requiring the design command before proceeding (advisory-only — core 8-step semantics unchanged)
  - **notes**: plan.ts — one advisory bullet in the Step 2 classify block (UI-scoped changes → suggest `bp plan-design-review $1`, advisory, does not gate); check.ts — one advisory sentence in Step 2 pre-check (UI-scoped changes → consider `bp design-review $1`, supplements review.md, does not gate the verdict). Text-only edits; existing template structure and content untouched.

- [x] T-9: [type:scaffolding] Dogfood: regenerate platform files and commit repo-root outputs <!-- commit: cbd5d8b -->
  - **refs**: DS-5, DS-6
  - **files**: .pi/skills/bp-design/SKILL.md, .pi/skills/bp-design-html/SKILL.md, .pi/skills/bp-design-review/SKILL.md, .pi/skills/bp-design-shotgun/SKILL.md, .pi/skills/bp-plan-design-review/SKILL.md, .pi/agents/bp-designer.md, .omp/skills/bp-design*/SKILL.md, .omp/commands/bp:design*.md, .omp/agents/bp-designer.md, .claude/commands/bp:design*.md, .claude/agents/bp-designer.md, .agents/skills/bp-design*/SKILL.md, .agents/agents/bp-designer.md, .codex regenerated sets
  - **acceptance**: after `bp update`, exactly 16 `.pi/skills/` dirs exist including the five `bp-design*` skills; `.pi/agents/bp-designer.md` exists; `.claude/commands/` contains five `bp:design*` files; a diff review shows only new-step/new-role additions (no unrelated churn); all generated files committed
  - **notes**: Run `bp update` in this repo (platform: omp, claude-code, agent, codex, pi), verify the dogfood output, review the diff for new-step-only changes, and commit with `chore(integrations): regenerate platform files for design workflow steps`. Do not hand-edit generated files.

## Pre-Archive Checklist

<!--
  Verified by the orchestrator after all waves complete.
  These are the gates before review can run.
-->

- [x] type-check/build passes with no errors
- [x] test suite passes (per project test command)
- [x] Every task in every wave is marked `[x]` with a commit hash
- [x] No `{{` template placeholders remaining in any artifact
- [x] All wave acceptance criteria confirmed
