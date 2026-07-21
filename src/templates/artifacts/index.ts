/**
 * Artifact output templates — English (v2).
 *
 * Templates for output documents (proposal, design, tasks, spec, review, roadmap, config).
 * Each export is a string with {{placeholder}} variables for CLI rendering.
 */

export const PROPOSAL_TEMPLATE = `# Proposal: {{name}}

<!--
  This is the human-AI agreement document. It captures WHY and WHAT, not HOW.
  The planner agent reads this to produce design.md, tasks.md, and delta specs.

  Quality bar:
  - Intent explains the problem, not just the solution
  - Scope boundaries are explicit and justified
  - Deliverables are observable (you can verify each one)
  - Each deliverable traces to a spec domain
-->

## Intent

<!--
  What problem does this change solve? Why now?
  Don't describe the solution here - that goes in Approach.
  2-4 sentences.
-->

{{intent}}

## Scope

### In Scope

<!--
  What specific capabilities will this change add or modify?
  Be concrete: "Add theme toggle in header" not "Improve UI".
  List each item as a bullet.
-->

- {{item-1}}
- {{item-2}}

### Out of Scope

<!--
  What is explicitly NOT included? This prevents scope creep.
  Include things that might seem related but are deferred.
-->

- {{excluded-1}}
- {{excluded-2}}

## Approach

<!--
  High-level method description. 2-4 sentences.
  Don't include technical details (class names, library choices) - those go in design.md.
  Do mention if there are alternative approaches worth considering.
-->

{{approach}}

## Deliverables

<!--
  Each deliverable is an observable, verifiable capability.
  Split by user-visible behavior, not by implementation layer.

  Rules:
  - Each PR-N has a SHALL statement describing observable behavior
  - Each PR-N has a Verify method (command, test, or manual step)
  - Source traces to a spec domain (existing or new)
  - Keep PR count ≤ 5. If more, consider splitting this change.
-->

### PR-1: {{deliverable-title}}

- **Source**: specs/{{domain}}/spec.md ({{existing-or-new}})
- **Behavior**: The system SHALL {{observable-behavior}}
- **Verify**: {{command-or-test-or-manual-step}}
- **Files**: {{expected-file-paths}}

### PR-2: {{deliverable-title}}

- **Source**: specs/{{domain}}/spec.md
- **Behavior**: The system SHALL {{observable-behavior}}
- **Verify**: {{verification-method}}
- **Files**: {{expected-file-paths}}

## Roadmap Reference

<!--
  Optional. If this change belongs to a milestone/phase in roadmap.md,
  reference it here. This helps track progress and prevent direction drift.
-->

- **Milestone**: {{milestone-name}}
- **Phase**: {{phase-name}}
`;

export const DESIGN_TEMPLATE = `# Design: {{name}}

<!--
  Structured technical design. Produced by the planner agent.
  This is the blueprint executors follow - its quality determines implementation quality.

  Quality bar:
  - Every DS-N is a module boundary with single responsibility
  - Every D-N decision has real alternatives considered
  - Architecture diagram shows data flow, not just boxes
  - File manifest is complete (no "etc." or "and other files")
  - Every interface includes error responses
  - Every DS-N traces to a PR-N in proposal.md
-->

## Design Items

<!--
  Component decomposition. Each DS-N is a module boundary.
  One module = a cohesive set of functions/classes with a single responsibility.

  Rules:
  - Every PR-N in proposal.md must be referenced by at least one DS-N
  - Each DS-N has: refs (PR-N), Source (PR-N), Responsibility
  - A single PR may need multiple DS if it spans layers
  - Multiple PRs may share a DS if they modify the same module
-->

### DS-1: {{component-name}}

- **Refs**: PR-{{id}}
- **Source**: PR-{{id}} (proposal.md)
- **Responsibility**: {{what this component is responsible for - one sentence}}
- **Key Interfaces**: {{public functions/classes this component exposes}}

#### 详细设计

<!--
  必填。填充粒度必须达到 executor 可以直接实现而不需要猜测的程度。
  根据组件的性质选择合适的内容:

  - 数据/状态组件:内部状态迁移、数据结构、读写路径、错误场景
  - UI 组件:Props、事件、状态(loading/empty/error/success)、布局约束
  - API/CLI:参数校验规则、响应格式、错误码、认证要求
  - 工具/库:算法说明、配置选项、输入输出契约

  不要只重复 Key Interfaces 的内容。
  这是 executor 实现时的最终参考。
-->

{{detailed-design}}

### DS-2: {{component-name}}

- **Refs**: PR-{{id}}, PR-{{id}}
- **Source**: PR-{{id}} (proposal.md)
- **Responsibility**: {{responsibility}}
- **Key Interfaces**: {{interfaces}}

#### 详细设计

<!--
  必填。填充粒度必须达到 executor 可以直接实现而不需要猜测的程度。
  根据组件的性质选择合适的内容:

  - 数据/状态组件:内部状态迁移、数据结构、读写路径、错误场景
  - UI 组件:Props、事件、状态(loading/empty/error/success)、布局约束
  - API/CLI:参数校验规则、响应格式、错误码、认证要求
  - 工具/库:算法说明、配置选项、输入输出契约

  不要只重复 Key Interfaces 的内容。
  这是 executor 实现时的最终参考。
-->

{{detailed-design}}

## Architecture Decisions

<!--
  Record decisions that have real alternatives. Skip trivial choices.
  Each D-N must answer: What did you decide? Why? What else did you consider?

  Good: "Context over Redux - simple binary state, no complex transitions"
  Bad: "Use TypeScript - project uses TypeScript" (no alternative considered)
-->

### D-1: {{decision-title}}

- **Status**: ACCEPTED
- **Decision**: {{what was decided}}
- **Reason**: {{why this choice - include the constraint or tradeoff that drove it}}
- **Alternatives**: {{what else was considered and why rejected}}

### D-2: {{decision-title}}

- **Status**: ACCEPTED
- **Decision**: {{what was decided}}
- **Reason**: {{why}}
- **Alternatives**: {{rejected alternatives}}

## Technical Approach

### Architecture Diagram

<!--
  ASCII art showing component relationships for THIS CHANGE only.
  Annotate every node:
  - [NEW] - being created by this change
  - [MODIFIED] - existing, being changed
  - [EXISTING] - existing, not changed (for context)

  Show data flow with arrows. Don't draw the entire system.
-->

\`\`\`text
{{architecture-diagram}}
\`\`\`

### Core Data Structures

<!--
  Key types/interfaces introduced or modified.
  Use TypeScript interface format. Brief description per type.
  Only include types that are part of the component contract,
  not every internal type.
-->

\`\`\`typescript
{{data-structures}}
\`\`\`

### Data Flow

<!--
  Step-by-step flow from trigger to effect.
  Number each step. Include file paths for key operations.
-->

1. {{step-1}}
2. {{step-2}}
3. {{step-3}}

### Interface Design

<!--
  For each external-facing interface (API endpoint, CLI command, public function):
  - Full request/response schema
  - Error responses (not just happy path)
  - Source: trace to delta spec requirement

  If this change has no external interfaces, write "No external interfaces."
-->

#### {{endpoint-name}} \`{{HTTP_METHOD}} {{path}}\`

- **Headers**: {{required-headers}}
- **Request body**:
  \`\`\`json
  {{request-example}}
  \`\`\`
- **Response 200**:
  \`\`\`json
  {{response-example}}
  \`\`\`
- **Response 400**: {{error-description}}
- **Response 401**: {{error-description}}
- **Source**: specs/{{domain}}/spec.md#{{requirement-id}}

## External Dependencies

<!--
  External APIs, services, or libraries used by this change.
  Include full URL, auth method, and what it's used for.
  If none, write "No external dependencies."
-->

| Service | Base URL | Auth | Used For | Source |
|---------|----------|------|----------|--------|
| {{name}} | \`{{url}}\` | {{auth-method}} | {{purpose}} | DS-{{id}} |

## File Manifest

<!--
  EVERY file that will be created or modified.
  No "etc." or "and other files". If you forgot a file, the executor won't know about it.

  Action: Create | Modify | Delete
-->

| File Path | Description | Action | Source |
|-----------|-------------|--------|--------|
| \`{{path}}\` | {{description}} | Create | DS-{{id}} |
| \`{{path}}\` | {{description}} | Modify | DS-{{id}} |

## TDD Strategy

<!--
  How TDD applies to this change.
  - behavior tasks: RED (failing test) -> GREEN (minimal impl) -> REFACTOR
  - Other types: direct implementation
  Note any testing challenges or special setup needed.
-->

- **behavior tasks**: RED -> GREEN -> REFACTOR (3 commits per task)
- **config/scaffolding/docs**: direct implementation (1 commit per task)
- **refactor**: verify tests pass -> refactor -> verify again

{{testing-notes}}

## Risks

<!--
  Specific, actionable risks for THIS change.
  Not generic "might be slow" - say "localStorage write on every toggle may cause performance issues if toggled rapidly".

  Include mitigation for each risk.
  If no significant risks, write "No significant risks identified."
-->

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| {{risk-1}} | {{impact}} | {{likelihood}} | {{mitigation}} |
| {{risk-2}} | {{impact}} | {{likelihood}} | {{mitigation}} |
`;

export const TASKS_TEMPLATE = `# Tasks: {{name}}

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

| type | Meaning | TDD Protocol | Commit type |
|------|---------|-------------|-------------|
| \`behavior\` | Business behavior - observable, testable feature | RED -> GREEN -> REFACTOR | test + feat + refactor |
| \`config\` | Configuration - env vars, CI/CD, lint, tsconfig | Direct implementation | chore |
| \`refactor\` | Improve structure without changing behavior | Verify tests -> refactor -> verify | refactor |
| \`docs\` | Documentation - README, API docs, comments | Direct implementation | docs |
| \`scaffolding\` | Skeleton code - module shells, directory structure | Direct implementation | chore |

## Wave 1: {{theme}}

<!--
  Wave decomposition:
  - Default is 1 wave. Add more ONLY when tasks have layer dependencies.
  - Example of real layer dependency:
    Wave 1: data model + repository (can test independently)
    Wave 2: service layer (depends on Wave 1 models)
    Wave 3: API endpoints (depends on Wave 2 services)
  - Do NOT create multiple waves for tasks that are merely "related".
  - Each wave must be independently verifiable (tsc + tests pass after wave completes).
-->

- [ ] T-1: [type:behavior] {{task-title}} <!-- commit: -->
  - **refs**: DS-{{id}}
  - **spec_ref**: specs/{{domain}}/spec.md#{{requirement-id}}
  - **files**: {{file-path-1}}, {{file-path-1-test}}
  - **acceptance**: {{binary-criteria - e.g., "toggle() changes theme from 'light' to 'dark'"}}
  - **RED**: GIVEN {{precondition}}
    WHEN {{action}}
    THEN {{observable-result}}
    AND {{additional-assertion}}

- [ ] T-2: [type:behavior] {{task-title}} <!-- commit: -->
  - **refs**: DS-{{id}}
  - **spec_ref**: specs/{{domain}}/spec.md#{{requirement-id}}
  - **files**: {{file-path}}, {{file-path-test}}
  - **acceptance**: {{binary-criteria}}
  - **RED**: GIVEN {{precondition}}
    WHEN {{action}}
    THEN {{observable-result}}
  - **depends_on**: T-1

- [ ] T-3: [type:scaffolding] {{task-title}} <!-- commit: -->
  - **refs**: DS-{{id}}
  - **files**: {{file-path}}
  - **acceptance**: {{criteria - e.g., "component file exists with correct imports"}}

## Wave 2: {{theme}}

<!--
  Only present if Wave 1 tasks are depended on by Wave 2 tasks.
  Remove this section if not needed.
-->

- [ ] T-4: [type:behavior] {{task-title}} <!-- commit: -->
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

- [ ] \`tsc --noEmit\` passes with no errors
- [ ] \`vitest run\` (or project test command) - all suites pass
- [ ] Every task in every wave is marked \`[x]\` with a commit hash
- [ ] No \`{{\` template placeholders remaining in any artifact
- [ ] All wave acceptance criteria confirmed
`;

export const SPEC_TEMPLATE = `# Delta Spec: {{domain}}

<!--
  Behavioral contract for this change. Produced by the planner agent.
  This is NOT implementation documentation - it describes WHAT the system does, not HOW.

  Quality bar:
  - Requirements describe observable behavior (inputs, outputs, error conditions)
  - NOT implementation details (class names, library choices, function signatures)
  - Each requirement has at least 1 scenario (happy path)
  - Requirements with error conditions have error scenarios
  - SHALL/MUST used for absolute requirements, SHOULD for recommended, MAY for optional
  - MODIFIED requirements include the full new version + "was:" annotation
  - REMOVED requirements include the reason

  On archive:
  - ADDED -> appended to bp/specs/<domain>/spec.md
  - MODIFIED -> replaces existing requirement in bp/specs/<domain>/spec.md
  - REMOVED -> deleted from bp/specs/<domain>/spec.md
-->

> Change: {{change-name}} | Domain: {{domain}}

## ADDED Requirements

<!--
  New behavior being introduced by this change.
  These will be appended to the global spec on archive.

  Requirement naming: use a noun phrase describing the capability.
  Good: "Theme Selection", "Two-Factor Authentication", "Session Expiration"
  Bad: "ThemeFeature", "2FA", "SessionStuff"
-->

### Requirement: {{requirement-name}}

The system SHALL {{behavior-description}}.

#### Scenario: {{scenario-name}}

- **GIVEN** {{precondition}}
- **WHEN** {{action}}
- **THEN** {{observable-result}}
- **AND** {{additional-assertion}}

#### Scenario: {{edge-case-name}}

- **GIVEN** {{edge-precondition}}
- **WHEN** {{edge-action}}
- **THEN** {{edge-result}}

#### Scenario: {{error-case-name}}

- **GIVEN** {{error-precondition}}
- **WHEN** {{error-action}}
- **THEN** {{error-result}}
- **AND** {{side-effect}}

## MODIFIED Requirements

<!--
  Existing behavior being changed.
  Include the FULL new requirement (not just the diff).
  Add "was:" annotation showing what changed.

  The requirement header MUST match the existing one in bp/specs/<domain>/spec.md
  so the merge can find and replace it.
-->

### Requirement: {{existing-requirement-name}}

The system SHALL {{new-behavior}}.
(was: {{old-behavior-summary}})

#### Scenario: {{updated-scenario-name}}

- **GIVEN** {{precondition}}
- **WHEN** {{action}}
- **THEN** {{new-result}}

## REMOVED Requirements

<!--
  Existing behavior being removed.
  List the requirement header (must match global spec) and reason.
  Do NOT include scenarios - they're being deleted.

  Verify before removing:
  - No other code depends on this behavior
  - The removal is intentional, not accidental
-->

### Requirement: {{removed-requirement-name}}

**Reason**: {{why this behavior is being removed}}
`;

export const REVIEW_TEMPLATE = `# Review: {{name}}

<!--
  Triple review result. Produced by the reviewer agent.
  This is the gate between apply and archive.

  Three dimensions:
  1. Spec Review (Spec Gate): delta spec requirements vs implementation
  2. Quality Review (Quality Gate): code bugs, security, conventions
  3. Goal Review (Goal Gate): proposal deliverables vs implementation

  Issue prefixes:
  - R-N: Spec non-compliance -> reapply (bp apply --fix)
  - Q-N: Quality issue -> reapply (bp apply --fix)
  - G-N: Goal not achieved -> reapply (bp apply --fix)
  - D-N: Design/architecture flaw -> replan (bp plan --fix)

  Verdict rules:
  - Zero issues -> PASS
  - Any D issue -> FAIL
  - Any BLOCKER severity -> FAIL
  - Only R/Q/G (no D, no BLOCKER) -> NEEDS_REVISION
-->

## Overall Verdict: {{PASS | FAIL | NEEDS_REVISION}}

---

## Spec Review

### Constraint Checklist

| # | Requirement | Type | Status | Evidence |
|---|-------------|------|--------|----------|
| R1 | {{requirement-name}} | ADDED | {{PASS/FAIL/N/A}} | {{file:line}} |
| R2 | {{requirement-name}} | MODIFIED | {{PASS/FAIL/N/A}} | {{file:line}} |
| R3 | {{requirement-name}} | REMOVED | {{PASS/FAIL/N/A}} | {{file:line}} |

### Scenario Coverage

| Scenario | Test Location | Status |
|----------|--------------|--------|
| {{scenario-name}} | {{test-file:line}} | PASS |
| {{scenario-name}} | {{test-file:line}} | PASS |
| {{scenario-name}} | - | MISSING |

### Spec Verdict: {{PASS | FAIL | NEEDS_REVISION}}

---

## Quality Review

### Issues

| # | Severity | Category | Location | Description | Fix |
|---|----------|----------|----------|-------------|-----|
| Q1 | {{BLOCKER/MAJOR/MINOR}} | {{Bug/Security/Convention/AI-Smell}} | {{file:line}} | {{specific-description}} | {{actionable-fix}} |

### Convention Compliance

| Rule | Status | Note |
|------|--------|------|
| {{convention-rule}} | {{PASS/FAIL}} | {{note}} |

### Quality Verdict: {{PASS | FAIL | NEEDS_REVISION}}

---

## Goal Review

### Goal Checklist

| # | Deliverable | Status | Evidence |
|---|-------------|--------|----------|
| G1 | PR-1: {{deliverable-title}} | {{ACHIEVED/PARTIAL/NOT_ACHIEVED}} | {{evidence}} |
| G2 | PR-2: {{deliverable-title}} | {{ACHIEVED/PARTIAL/NOT_ACHIEVED}} | {{evidence}} |

### Goal Verdict: {{PASS | FAIL | NEEDS_REVISION}}

---

## Issues

<!--
  Every finding gets ONE checkbox line: - [ ] R1 - description (source)
  Prefixes: R=spec, Q=quality, G=goal, D=design

  Three states:
  - [ ]  open (not fixed yet)
  - [~]  fixed, pending verification (set by executor after code fix)
  - [x]  verified and resolved (set by reviewer after re-review)

  The verdict MUST match the Issues section: any [ ] or [~] = not PASS.
-->

- [ ] R1 - {{spec requirement not implemented}} (spec)
- [ ] Q1 - {{code quality issue description}} (quality)
- [ ] G1 - {{goal not achieved}} (goal)
- [ ] D1 - {{design/architecture flaw}} (design)
<!-- Remove placeholder lines above. Add as many - [ ] lines as there are findings. -->

## Routing

- **D issues**: {{count}} ({{list or "none"}})
- **R/Q/G issues**: {{count}} ({{list or "none"}})

**Recommendation**: \`bp {{action}} {{name}}\`
`;

export const ROADMAP_TEMPLATE = `# Roadmap: {{project-name}}

<!--
  Living document. Tracks project direction and progress.
  NOT a state machine - it doesn't gate change execution.

  Purpose:
  1. Make direction explicit (prevent drift)
  2. Track progress (count of archived changes per phase)
  3. Show what's planned next

  Updated automatically by \`bp archive\` (marks changes as [x], increments counts).
  Updated manually by \`bp roadmap\` (add milestones, phases, planned changes).

  Format rules:
  - Status tags: [NOT_STARTED], [ACTIVE], [IN_PROGRESS], [COMPLETED], [SHIPPED]
  - Milestone: M{id} (e.g., M1, M2)
  - Phase: P{milestone}.{id} (e.g., P1.1, P1.2)
  - Change: listed under phase with [x] (done) or [ ] (pending)
-->

## Milestone: M1 - {{milestone-name}} [ACTIVE]

**Goal**: {{what this milestone achieves}}
**Status**: {{PLANNED | ACTIVE | SHIPPED}}

### Phase: P1.1 - {{phase-name}} [{{STATUS}}]

- **Goal**: {{what this phase delivers}}
- **Description**: {{what work this phase involves — key areas, known constraints, estimated scope}}
- **Spec domain**: {{domain-name}}
- **Changes**: {{completed}}/{{total}} completed
- **Status**: {{NOT_STARTED | IN_PROGRESS | COMPLETED}}

**Changes**:

- [x] {{change-name}} (archived {{date}})
- [x] {{change-name}} (archived {{date}})
- [ ] {{change-name}}

**Next**: {{next-change-or "All changes completed"}}

### Phase: P1.2 - {{phase-name}} [NOT_STARTED]

- **Goal**: {{what this phase delivers}}
- **Description**: {{what work this phase involves — key areas, known constraints, estimated scope}}
- **Spec domain**: {{domain-name}}
- **Changes**: 0/{{total}}
- **Status**: NOT_STARTED

**Planned changes**:
- {{change-name}} (not yet proposed)
- {{change-name}} (not yet proposed)

---

## Milestone: M1 - {{milestone-name}} [COMPLETED]

**Goal**: {{what this milestone achieved}}
**Status**: COMPLETED

---

## Progress Summary

| Milestone | Phases | Changes | Status |
|-----------|--------|---------|--------|
| M1 - {{name}} | {{done}}/{{total}} | {{done}}/{{total}} | {{status}} |
`;

export const CONFIG_TEMPLATE = `# Blueprint Project Configuration (v2)
# Generated by bp init - {{date}}

version: 2

# Multi-platform - CLI generates slash commands + skills + agent definitions per platform
platform:
  - omp
  - claude-code
  - agent

# Workflow profile - controls rigor vs speed
# lite:     no review gate, TDD optional, single agent for lightweight changes
# standard: review gate (must PASS before archive), TDD for behavior, sub-agent waves
profile: standard
# Brownfield project (existing codebase with code scanning)
brownfield: false

# Auto-commit documentation files alongside code
commitDocs: false

# Project context - injected into ALL sub-agent prompts
context: |
  Project: {{project-name}}
  Tech stack: {{tech-stack}}
  Testing: {{test-framework}}
  Language: {{response-language}}

# Artifact rules - injected into specific sub-agent prompts
rules:
  proposal:
    - "Each deliverable must have an observable SHALL statement and a Verify method"
    - "Keep PR count ≤ 5 per change; if more, suggest splitting"
  specs:
    - "Use Given/When/Then format for all scenarios"
    - "Each Requirement must have at least 1 scenario"
    - "Use MUST for security/data-integrity, SHOULD for UX, MAY for optional features"
  design:
    - "Each DS-N must have Source: PR-{id} annotation tracing to proposal"
    - "Architecture diagram must annotate [NEW]/[MODIFIED]/[EXISTING]"
    - "File manifest must list every file - no 'etc.' or 'and other files'"
    - "Every interface must include error responses, not just happy path"
  tasks:
    - "type:behavior tasks must have RED test description (GIVEN/WHEN/THEN)"
    - "depends_on only when task B cannot compile/test without task A"
    - "Default to 1 wave; add waves only for real layer dependencies"
    - "acceptance criteria must be binary (pass/fail), not subjective"

# Default schema - defines artifact dependency graph
schema: spec-driven

# Model configuration - maps roles to platform model tiers
models: {}

# Conventions injection
conventions:
  inject: true

# Git configuration
git:
  create_tag: true
`;

export const GLOBAL_SPEC_TEMPLATE = `# Global Spec: {{domain}}

> Accumulated behavioral contract for the {{domain}} domain.

## Purpose

The {{domain}} domain governs the {{domain-purpose}} aspects of the system. This spec accumulates all behavioral requirements for this domain as changes are archived.

Requirements follow RFC 2119: MUST/SHALL for absolute requirements, SHOULD for recommended, MAY for optional capabilities.

## Requirements

### Requirement: {{requirement-name-1}}

The system SHALL {{behavior-description}}.

#### Scenario: {{scenario-name}}

- **GIVEN** {{precondition}}
- **WHEN** {{action}}
- **THEN** {{observable-result}}

### Requirement: {{requirement-name-2}}

The system SHALL {{behavior-description}}.

#### Scenario: {{scenario-name}}

- **GIVEN** {{precondition}}
- **WHEN** {{action}}
- **THEN** {{observable-result}}
`;

/** Template IDs mapped to their content. */
export const ARTIFACT_TEMPLATES: Record<string, string> = {
  proposal: PROPOSAL_TEMPLATE,
  design: DESIGN_TEMPLATE,
  tasks: TASKS_TEMPLATE,
  spec: SPEC_TEMPLATE,
  review: REVIEW_TEMPLATE,
  roadmap: ROADMAP_TEMPLATE,
  config: CONFIG_TEMPLATE,
  'global-spec': GLOBAL_SPEC_TEMPLATE,
};

/** Ordered list of artifact template identifiers. */
export const TEMPLATE_IDS: readonly string[] = Object.keys(ARTIFACT_TEMPLATES);
