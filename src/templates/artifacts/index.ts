/**
 * Artifact output templates — English versions.
 *
 * Templates for output documents (proposal, design, tasks, etc.).
 * Each export is a string with {{placeholder}} variables for CLI rendering.
 * Used by bp-template command and bp change new.
 */

export const PROPOSAL_TEMPLATE = `# Proposal: {{name}}

> This document is a Change Proposal — align intent, scope, and approach before implementation. Complete each section; reviewers will evaluate this proposal before the design phase.

---

## Intent

<!--
Describe why this change is needed:
1. What specific problem exists or what capability is missing?
2. Who is affected (users/developers/ops)? How severely?
3. What happens if we don't make this change?
4. Is this a bug fix / feature / tech debt / perf improvement?
5. Is this linked to a known issue, user feedback, or metric? (attach issue link if available)
-->

{{intent}}

---

## Scope

### In scope

<!--
List all items covered by this change. One per line, verb-first.
Example:
- Add skeleton loading state on list pull-to-refresh
- Add useScrollPerformance hook for scroll metrics
- Memoize UserCard component
-->

{{in-scope-items}}

### Out of scope

<!--
Explicitly excluded changes to prevent scope creep. One per line with reason.
Example:
- Homepage skeleton screen (planned for next phase)
- Server-side API pagination (unrelated to client performance)
- Android list optimization (platform-specific, needs separate research)
-->

{{out-of-scope-items}}

---

## Approach

<!--
Describe the technical direction at a high level:
1. Architecture layer: Which layer does the change touch (UI/Service/Store)? New modules needed?
2. Library choices: New dependencies? Upgrades? Rationale?
3. Data flow: How does data travel from source to UI? State management changes?
4. Compatibility: Backward compatibility strategy? Migration needed?
5. Testability: Are there injection points / mock seams for testing?

No detailed implementation here — the design doc handles that.
-->

{{approach}}

---

## Must-haves

<!--
3-7 observable, verifiable must-have behaviors.
Each must be a concrete statement — no ambiguity.
Reviewers should be able to judge pass/fail using these conditions.

Format: "MUST <condition>" or "SHALL <condition>"
- Observable: visible on screen, checkable via CLI, assertable in tests
- Verifiable: reviewer can confirm via action/command
-->

{{must-haves}}

---

## Non-goals

<!--
Explicit non-goals to prevent reviewers from asking "why wasn't X done?"
Different from Out of scope (not in this change's scope).
Non-goals are specific targets that might be incorrectly assumed to be in scope.
Example:
- Not pursuing Android list performance in this change
- Not changing the existing pagination logic
- Not adding new UI component library dependencies
-->

{{non-goals}}
`;

export const DESIGN_TEMPLATE = `# Design: {{name}}

> This document is the Change Design — written after proposal approval, describing how to implement. Each section has fill-in guidance. After this document, proceed to task breakdown.

---

## Context & Goals

<!--
1. Briefly describe context — what constraints exist?
2. Core design goals (no more than 3)
3. Must align with proposal Intent and Must-haves
-->

{{background-and-goals}}

---

## Technical Approach

### Architecture Diagram

<!--
ASCII art showing module/component relationships:
- New modules vs. existing modules
- Data flow direction (arrows)
- File/module boundaries
Annotate: [NEW], [MODIFIED], [EXISTING]
-->

\`\`\`text
{{architecture-diagram}}
\`\`\`

### Core Data Structures

<!--
Key types/interfaces/data structures introduced or modified by this design.
Use TypeScript interface format. Brief description per type.
-->

{{data-structures}}

### Data Flow

<!--
Step-by-step description of data flow from trigger to effect.
Example:
1. User scrolls list → FlatList fires onScroll
2. OptimizedList reads itemHeight config → enables getItemLayout
3. Layout engine skips dynamic measurement → uses fixed row height
4. useScrollPerformance samples FPS every 500ms
5. FPS data → Performance Reporter → backend
-->

{{data-flow}}

### Interface Design

<!--
Public API signatures exposed by this design:
- Function/method names
- Parameter lists (name + type + description)
- Return types
- sync/async
-->

{{api-signatures}}

---

## File Manifest

<!--
All files to create or modify, organized as a table.
-->

| File Path | Description | Action |
|-----------|-------------|--------|
| \`{{file-path-1}}\` | {{description}} | Create |
| \`{{file-path-2}}\` | {{description}} | Modify |

---

## Test Strategy

### Unit Tests
- <!-- Which modules need unit tests? What needs mocking? -->

### Integration Tests
- <!-- Which flows need integration tests? What fixtures needed? -->

### TDD Tasks
- <!-- List type:behavior tasks requiring RED→GREEN→REFACTOR -->

---

## Alternatives

<!--
Evaluated but rejected approaches, with rationale.
-->

| Approach | Pros | Cons | Rejection Reason |
|----------|------|------|-----------------|
| {{alt-name-1}} | {{pros}} | {{cons}} | {{reason}} |
| {{alt-name-2}} | {{pros}} | {{cons}} | {{reason}} |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| {{risk-1}} | {{probability}} | {{impact}} | {{mitigation}} |
| {{risk-2}} | {{probability}} | {{impact}} | {{mitigation}} |
`;

export const TASKS_TEMPLATE = `# Tasks: {{name}}

> This document breaks the design into executable tasks grouped by wave. Each task includes description, files, acceptance criteria, optional depends_on and spec_ref. type:behavior tasks must include RED test descriptions (GIVEN/WHEN/THEN format).

---

## TDD Type Annotations

| type | Meaning | TDD Protocol |
|------|---------|-------------|
| \`behavior\` | Business behavior — implement a concrete, observable/assertable feature | **RED→GREEN→REFACTOR** (mandatory: test first → implement → refactor) |
| \`config\` | Configuration — env vars, CI/CD, lint, tsconfig, etc. | Direct implementation, no TDD |
| \`refactor\` | Refactoring — improve internal structure without changing behavior | Verify tests pass → refactor → verify again |
| \`docs\` | Documentation — README, API docs, comments | Direct implementation, no TDD |
| \`scaffolding\` | Skeleton code — new module shells, directory structure, templates | Direct implementation, no TDD |

> **Rule**: If a task's core output is "a behavior" (user-perceptible or test-assertable), use \`behavior\`. If it's just "file exists" or "config takes effect", use \`config\`/\`scaffolding\`.

---

## Wave 1: {{wave-1-theme}}

<!--
A wave is an independently verifiable unit of work. Tasks within a wave may have dependencies but the wave is self-contained.
Each wave completion enables verification (tsc + test pass).
-->

- [ ] task-{{id-1}}: [type:{{type}}] {{title}}
  - **description**: {{What to do, approach, files/APIs to reference}}
  - **files**: {{comma-separated file paths}}
  - **acceptance**: {{observable, assertable acceptance criteria}}
  - **depends_on**: [task-{{id-x}}] <!-- optional: predecessor -->
  - **spec_ref**: specs/{{domain}}/spec.md <!-- optional: linked spec -->
  {{if behavior}}
  - ***RED test***:
    \`\`\`
    GIVEN {{precondition}}
    WHEN {{trigger action}}
    THEN {{expected result}}
    \`\`\`
  {{/if}}

---

## Wave 2: {{wave-2-theme}}

- [ ] task-{{id-3}}: [type:{{type}}] {{title}}
  - **description**: {{What to do}}
  - **files**: {{file paths}}
  - **acceptance**: {{acceptance criteria}}
  - **depends_on**: [task-{{id-1}}] <!-- optional -->
  {{if behavior}}
  - ***RED test***:
    \`\`\`
    GIVEN {{precondition}}
    WHEN {{trigger action}}
    THEN {{expected result}}
    \`\`\`
  {{/if}}

---

## Verification

- [ ] \`tsc --noEmit\` passes (or equivalent type check)
- [ ] \`vitest run\` all test suites pass
- [ ] Each wave's acceptance criteria confirmed (manual or automated)
- [ ] New code passes lint check
- [ ] No new type errors or warnings introduced
`;

export const CONTEXT_TEMPLATE = `# Context: {{name}}

> Phase implementation decisions document. Captures architecture decisions, interface contracts, and implementation constraints for this phase. Written during the discuss phase.

---

## Phase Goals
<!-- What does this phase deliver? -->

{{phase-goals}}

---

## Architecture Decisions

<!-- Numbered decisions: D1, D2, ... Each decision records what was chosen and why. -->

### D1: {{decision-title}}
- **Decision**: {{what we decided}}
- **Rationale**: {{why}}
- **Alternatives considered**: {{what else we evaluated}}

### D2: {{decision-title}}
- **Decision**: {{what we decided}}
- **Rationale**: {{why}}
- **Alternatives considered**: {{what else we evaluated}}

---

## Interface Contracts

<!-- Key APIs and data models for this phase. -->

{{interface-contracts}}

---

## Implementation Constraints

<!-- Technical limits and boundaries for this phase. -->

{{constraints}}

---

## Change Split Plan

<!-- Preliminary breakdown of this phase into changes. -->

{{change-split-plan}}

---

## Non-Goals

<!-- Explicitly excluded from this phase. -->

{{non-goals}}
`;

export const RESEARCH_TEMPLATE = `# Research: {{name}}

> Technical research document. Compares alternatives, assesses feasibility, and produces recommendations.

---

## Research Scope

{{scope}}

---

## Candidate Comparison

| Criterion | Option A: {{name-a}} | Option B: {{name-b}} | Option C: {{name-c}} |
|-----------|---------------------|---------------------|---------------------|
| {{criterion-1}} | {{score}} | {{score}} | {{score}} |
| {{criterion-2}} | {{score}} | {{score}} | {{score}} |

---

## Recommendation

**Recommended**: {{recommended-option}}

**Rationale**: {{rationale}}

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| {{risk-1}} | {{likelihood}} | {{impact}} | {{mitigation}} |

---

## Open Questions

- {{question-1}}
- {{question-2}}
`;

export const SUMMARY_TEMPLATE = `# Summary: {{name}}

> Change completion summary. Generated after all waves are complete.

---

## Intent Recap
{{intent}}

## Files Changed
| File | Action | Lines |
|------|--------|-------|
| {{file-1}} | {{action}} | {{lines}} |

## Key Decisions
- {{decision-1}}
- {{decision-2}}

## Verification
- [ ] All tests pass
- [ ] Type check passes
- [ ] Delta-specs covered
`;

export const VERIFICATION_TEMPLATE = `# Verification: {{name}}

> Goal-backward verification report. Confirms the change delivers what it promised.

---

## Status: {{status}}

<!-- passed | gaps_found | human_needed -->

## Delta-Spec Coverage

| Spec Item | Test Coverage | Status |
|-----------|--------------|--------|
| {{spec-item-1}} | {{test}} | {{status}} |

## TDD Commit Integrity

| Task | RED | GREEN | REFACTOR | Status |
|------|-----|-------|----------|--------|
| {{task-1}} | {{commit}} | {{commit}} | {{commit}} | {{status}} |

## Test Suite

- Total: {{total}}
- Passed: {{passed}}
- Failed: {{failed}}
- Skipped: {{skipped}}

## Findings

{{findings}}
`;

export const SPEC_REVIEW_TEMPLATE = `# Spec Review: {{name}}

> Specification compliance review. Cross-references delta-spec SHALL/MUST constraints against implementation.

---

## Overall: {{verdict}}

<!-- PASS / FAIL / NEEDS_REVISION -->

## Constraint Checklist

| # | Constraint | Location | Status | Evidence |
|---|-----------|----------|--------|----------|
| 1 | {{constraint}} | {{file:line}} | PASS / FAIL / N/A | {{note}} |

## Edge Case Coverage

| Edge Case | Covered? | Evidence |
|-----------|---------|----------|
| {{edge-case}} | {{yes/no}} | {{note}} |

## Findings

{{findings}}
`;

export const QUALITY_REVIEW_TEMPLATE = `# Quality Review: {{name}}

> Code quality audit. Checks for bugs, security issues, conventions, and common AI mistakes.

---

## Overall: {{verdict}}

<!-- PASS / FAIL / NEEDS_REVISION -->

## Issues

| # | Severity | Category | Location | Description |
|---|----------|----------|----------|-------------|
| 1 | BLOCKER / MAJOR / MINOR / INFO | {{category}} | {{file:line}} | {{description}} |

## Convention Compliance

| Rule | Status | Note |
|------|--------|------|
| {{rule}} | {{status}} | {{note}} |

## Findings

{{findings}}
`;

export const GOAL_REVIEW_TEMPLATE = `# Goal Review: {{name}}

> Goal achievement review. Cross-references proposal.md goals and must_haves against implementation.

---

## Overall: {{verdict}}

<!-- PASS / FAIL / NEEDS_REVISION -->

## Goal Checklist

| # | Goal / Must-have | Status | Evidence |
|---|-----------------|--------|----------|
| 1 | {{goal}} | ACHIEVED / PARTIAL / NOT_ACHIEVED | {{note}} |

## Completeness Assessment

{{assessment}}

## Findings

{{findings}}
`;

export const CHANGE_SUMMARY_TEMPLATE = `# Change Summary: {{name}}

> Auto-generated summary after all waves complete.

---

## Intent
{{intent}}

## Output Files
| File | Action |
|------|--------|
| {{file}} | {{action}} |

## Key Decisions
- {{decision}}

## Verification Results
- Type check: {{typecheck}}
- Tests: {{tests}}
- Lint: {{lint}}
`;

export const REQUIREMENTS_TEMPLATE = `# Requirements: {{name}}

> Project requirements — populated during the grill phase through structured user interview. Captures functional requirements, non-functional constraints, and success criteria.

---

## Functional Requirements

### FR-1: {{requirement-title}}
- **Description**: {{what the system should do}}
- **Priority**: {{critical | high | medium | low}}
- **Acceptance criteria**: {{how to verify}}

### FR-2: {{requirement-title}}
- **Description**: {{what the system should do}}
- **Priority**: {{critical | high | medium | low}}
- **Acceptance criteria**: {{how to verify}}

---

## Non-Functional Requirements

### NFR-1: {{category (performance, security, usability, etc.)}}
- **Description**: {{constraint or quality attribute}}

---

## Constraints
- {{constraint-1}}
- {{constraint-2}}

---

## Success Criteria
- [ ] {{criterion-1}}
- [ ] {{criterion-2}}
`;

export const ROADMAP_TEMPLATE = `# Roadmap: {{name}}

> Planning mode: {{mode}}
> Milestones are major delivery checkpoints, not feature buckets. Each milestone represents a complete, demonstrable, shippable state.

---

## Milestones

### {{milestone-id}}: {{milestone-name}}
- **Goal**: {{what this milestone delivers — a complete, usable state}}
- **Mode**: {{mvp | technical-layer}}
- **Success Criteria**:
  - {{verifiable criterion}}
  - {{verifiable criterion}}

#### Phases

| ID | Goal | Depends On | Changes | Deliverable |
|----|------|-----------|---------|------------|
| ph.1-{{name}} | {{goal}} | - | {{count}} | {{executable artifact}} |
| ph.2-{{name}} | {{goal}} | ph.1 | {{count}} | {{executable artifact}} |

#### ph.1-{{name}}
- **Goal**: {{what this phase delivers}}
- **Deliverable**: {{runnable binary, deployed endpoint, test suite passing, etc.}}
- **Inputs**: {{specs, conventions, docs}}
- **Outputs**: {{code, specs, docs}}

---

## Dependency Graph
\`\`\`text
{{milestone-dependencies}}
\`\`\`
`;

export const RESEARCH_STACK_TEMPLATE = `# Tech Stack Research: {{name}}

> Research output — recommended technology stack with alternatives compared.

---

## Recommendation
**{{recommended-stack}}** — {{one-line rationale}}

## Comparison
| Criterion | Option A: {{option-a}} | Option B: {{option-b}} | Recommendation |
|-----------|----------------------|----------------------|----------------|
| {{criterion-1}} | {{score}} | {{score}} | {{winner}} |
| {{criterion-2}} | {{score}} | {{score}} | {{winner}} |

## Final Selection
| Component | Choice | Version | Rationale |
|-----------|--------|---------|----------|
| {{component-1}} | {{choice}} | {{version}} | {{why}} |

## Risks
- {{risk-1}}: {{mitigation}}
`;

export const RESEARCH_ARCHITECTURE_TEMPLATE = `# Architecture Research: {{name}}

> Research output — recommended architecture with rationale and alternatives.

---

## Recommendation
**{{approach-name}}** — {{one-line rationale}}

## Architecture Overview
\`\`\`text
{{architecture-diagram}}
\`\`\`

## Alternatives Evaluated
| Approach | Strengths | Weaknesses | Verdict |
|----------|-----------|-----------|---------|
| {{approach-1}} | {{strengths}} | {{weaknesses}} | {{verdict}} |
| {{approach-2}} | {{strengths}} | {{weaknesses}} | {{verdict}} |

## Key Decisions
- {{decision-1}}
- {{decision-2}}

## Risks & Mitigations
- {{risk-1}}: {{mitigation}}
`;

export const RESEARCH_PITFALLS_TEMPLATE = `# Research Pitfalls: {{name}}

> Research output — known risks, anti-patterns to avoid, and mitigation strategies.

---

## Known Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| {{risk-1}} | {{high/medium/low}} | {{high/medium/low}} | {{mitigation}} |

## Anti-Patterns to Avoid
- **{{anti-pattern-1}}**: {{why it fails and what to do instead}}

## Edge Cases
- {{edge-case-1}}: {{handling strategy}}

## Dependencies at Risk
| Dependency | Version | Status | Concern |
|-----------|---------|--------|---------|
| {{dep-1}} | {{version}} | {{active/deprecated/unstable}} | {{concern}} |
`;

export const CODEBASE_STACK_TEMPLATE = `# Tech Stack: {{name}}

> Codebase analysis — technology stack identified from brownfield scan.

---

## Runtime
- **Language**: {{language}}
- **Version**: {{version}}
- **Package manager**: {{package-manager}}

## Frameworks & Libraries
| Dependency | Version | Purpose |
|-----------|---------|--------|
| {{dep-1}} | {{version}} | {{purpose}} |

## Build & Tooling
- **Bundler**: {{bundler}}
- **Test runner**: {{test-runner}}
- **Linter**: {{linter}}
- **Formatter**: {{formatter}}

## Infrastructure
- **CI/CD**: {{ci-cd}}
- **Deployment**: {{deployment}}
- **Database**: {{database}}
`;

export const CODEBASE_ARCHITECTURE_TEMPLATE = `# Architecture: {{name}}

> Codebase analysis — architecture patterns and module structure identified from brownfield scan.

---

## Module Map

\`\`\`text
{{module-map}}
\`\`\`

## Architectural Patterns
| Pattern | Where | Notes |
|---------|-------|-------|
| {{pattern-1}} | {{location}} | {{notes}} |

## Key Abstractions
- **{{abstraction-1}}**: {{description}}

## Data Flow
{{data-flow}}
`;

export const CODEBASE_CONVENTIONS_TEMPLATE = `# Conventions: {{name}}

> Codebase analysis — coding conventions identified from brownfield scan.

---

## Naming
- **Files**: {{file-naming}}
- **Variables**: {{var-naming}}
- **Functions**: {{func-naming}}
- **Types/Interfaces**: {{type-naming}}

## Code Style
- **Indentation**: {{indent}}
- **Quotes**: {{quotes}}
- **Semicolons**: {{semicolons}}
- **Max line length**: {{max-line}}

## Import Style
- **Pattern**: {{import-pattern}}
- **Path aliases**: {{aliases}}

## Testing Conventions
- **Test location**: {{test-location}}
- **Test naming**: {{test-naming}}
- **Test framework patterns**: {{test-patterns}}
`;

export const SPEC_TEMPLATE = `<!-- BOOTSTRAPPED — extracted from {{source-files}} -->

# {{domain-name}}

> Behavioral contract — {{description}}

---

## Requirements

### Requirement: {{req-name-1}}
The system SHALL {{behavior-1}}.

#### Scenario: {{scenario-name}}
- **GIVEN** {{given}}
- **WHEN** {{when}}
- **THEN** {{then}}

> Confidence: {{confidence}} | Source: {{file}}:{{line}}
`;

export const CODEBASE_CONCERNS_TEMPLATE = `# Concerns: {{name}}

> Codebase analysis — technical debt, security issues, performance risks, fragile areas identified from brownfield scan.

---

## Anti-Patterns
| Pattern | Location | Risk |
|---------|----------|------|
| {{anti-1}} | {{location}} | {{risk}} |

## Technical Debt
| Item | Impact | Effort to Fix |
|------|--------|--------------|
| {{debt-1}} | {{impact}} | {{effort}} |

## Security Concerns
| Issue | Severity | Location |
|-------|---------|----------|
| {{sec-1}} | {{severity}} | {{location}} |

## Performance Risks
| Area | Why Risky | Mitigation |
|------|----------|-----------|
| {{area-1}} | {{reason}} | {{mitigation}} |

## Dependencies at Risk
| Dependency | Version | Latest | Risk |
|-----------|---------|--------|------|
| {{dep-1}} | {{version}} | {{latest}} | {{risk}} |
`;

export const CODEBASE_STRUCTURE_TEMPLATE = `# Structure: {{name}}

> Codebase analysis — directory layout, module organization, and key file locations identified from brownfield scan.

---

## Directory Layout
\`\`\`text
{{directory-tree}}
\`\`\`

## Key Directories
| Directory | Purpose | Key Files |
|-----------|---------|----------|
| {{dir-1}} | {{purpose}} | {{files}} |

## Entry Points
- **{{entry-1}}**: {{description}} (e.g. CLI entry, server start, build config)

## Module Boundaries
- **{{boundary-1}}**: {{what it owns vs what it imports}}
`;

export const CODEBASE_TESTING_TEMPLATE = `# Testing: {{name}}

> Codebase analysis — testing framework, structure, mocking patterns, and coverage identified from brownfield scan.

---

## Framework
- **Runner**: {{test-runner}}
- **Assertion library**: {{assertion-lib}}
- **Mocking**: {{mock-lib}}

## Test Structure
- **Location**: {{test-location}} (e.g. co-located, \__tests__/, test/)
- **Naming**: {{test-naming}} (e.g. *.test.ts, *.spec.ts)
- **Organization**: {{test-organization}}

## Test Patterns
| Pattern | Example File | Notes |
|---------|-------------|-------|
| {{pattern-1}} | {{file}} | {{notes}} |

## Coverage
- **Current coverage**: {{coverage}} (if available)
- **Gaps**: {{coverage-gaps}}
`;

export const CODEBASE_INTEGRATIONS_TEMPLATE = `# Integrations: {{name}}

> Codebase analysis — external APIs, databases, services, and auth providers identified from brownfield scan.

---

## External APIs
| Service | Purpose | SDK/Library | Auth Method |
|---------|---------|------------|------------|
| {{api-1}} | {{purpose}} | {{sdk}} | {{auth}} |

## Databases & Storage
| Type | Engine | Connection | ORM/Driver |
|------|--------|-----------|-----------|
| {{db-1}} | {{engine}} | {{connection}} | {{orm}} |

## Auth & Identity
- **Provider**: {{auth-provider}}
- **Method**: {{auth-method}} (e.g. JWT, OAuth2, session)

## Infrastructure Dependencies
| Service | Type | Critical? | Notes |
|---------|------|----------|-------|
| {{infra-1}} | {{type}} | {{yes/no}} | {{notes}} |
`;

export const CODEBASE_PITFALLS_TEMPLATE = `# Pitfalls: {{name}}

> Codebase analysis — known pitfalls, anti-patterns, and technical debt identified from brownfield scan.

---

## Anti-Patterns
| Pattern | Location | Risk |
|---------|----------|------|
| {{anti-1}} | {{location}} | {{risk}} |

## Technical Debt
| Item | Impact | Effort to Fix |
|------|--------|--------------|
| {{debt-1}} | {{impact}} | {{effort}} |

## Risky Areas
| Area | Why Risky | Mitigation |
|------|----------|-----------|
| {{area-1}} | {{reason}} | {{mitigation}} |

## Dependencies at Risk
| Dependency | Version | Latest | Risk |
|-----------|---------|--------|------|
| {{dep-1}} | {{version}} | {{latest}} | {{risk}} |
`;

export const PHASE_RESEARCH_TEMPLATE = `# Phase Research: {{name}}

> Implementation path investigation for a specific phase.

---

## Research Scope
{{scope}}

## Recommended Approach
**Recommendation**: {{recommendation}}

**Rationale**: {{rationale}}

## Alternatives Considered
| Approach | Pros | Cons | Verdict |
|----------|------|------|--------|
| {{alt-1}} | {{pros}} | {{cons}} | {{verdict}} |

## Known Pitfalls
- {{pitfall-1}}
- {{pitfall-2}}

## TDD Implications
- {{tdd-note-1}}
`;

/** Template registry — maps template ID → body string */
export const ARTIFACT_TEMPLATES: Record<string, string> = {
  proposal: PROPOSAL_TEMPLATE,
  design: DESIGN_TEMPLATE,
  tasks: TASKS_TEMPLATE,
  context: CONTEXT_TEMPLATE,
  research: RESEARCH_TEMPLATE,
  summary: SUMMARY_TEMPLATE,
  verification: VERIFICATION_TEMPLATE,
  'spec-review': SPEC_REVIEW_TEMPLATE,
  'quality-review': QUALITY_REVIEW_TEMPLATE,
  'goal-review': GOAL_REVIEW_TEMPLATE,
  'change-summary': CHANGE_SUMMARY_TEMPLATE,
  // Project-level planning
  'requirements': REQUIREMENTS_TEMPLATE,
  'roadmap': ROADMAP_TEMPLATE,
  // Project research (produced by bp-researcher)
  'research-stack': RESEARCH_STACK_TEMPLATE,
  'research-architecture': RESEARCH_ARCHITECTURE_TEMPLATE,
  'research-pitfalls': RESEARCH_PITFALLS_TEMPLATE,
  // Codebase analysis (brownfield — produced by bp-codebase-mapper)
  'codebase-stack': CODEBASE_STACK_TEMPLATE,
  'codebase-architecture': CODEBASE_ARCHITECTURE_TEMPLATE,
  'codebase-structure': CODEBASE_STRUCTURE_TEMPLATE,
  'codebase-conventions': CODEBASE_CONVENTIONS_TEMPLATE,
  'codebase-testing': CODEBASE_TESTING_TEMPLATE,
  'codebase-integrations': CODEBASE_INTEGRATIONS_TEMPLATE,
  'codebase-concerns': CODEBASE_CONCERNS_TEMPLATE,
  'codebase-pitfalls': CODEBASE_CONCERNS_TEMPLATE,  // alias, deprecated
  // Change lifecycle
  'spec': SPEC_TEMPLATE,
  'completion': SUMMARY_TEMPLATE,  // archiver completion.md
  // Phase research (produced by bp-phase-researcher)
  'phase-research': PHASE_RESEARCH_TEMPLATE,
};

/** All template IDs for CLI listing */
export const TEMPLATE_IDS = Object.keys(ARTIFACT_TEMPLATES);
