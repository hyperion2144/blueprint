/**
 * Artifact output templates — English versions.
 *
 * Templates for output documents (proposal, design, tasks, etc.).
 * Each export is a string with {{placeholder}} variables for CLI rendering.
 * Used by bp-template command and bp change new.
 */

export const PROPOSAL_TEMPLATE = `# Proposal: {{name}}

> Change proposal — intent, references, deliverables. Fill each section.

---

## Intent

{{what, why, who affected}}

---

## References

<!-- Phase change only: list FR/NFR and D IDs. Adhoc: remove section -->

- FR-{{id}}: {{brief}}  (bp/requirements.md)
- D-{{id}}: {{brief}}  (context.md)

---

## External References

<!-- Key specs, documents, or APIs referenced by this proposal. -->

- specs/{{domain}}/spec.md: {{relevant sections}}


## Deliverables

<!--
PR splitting guidance:
- Each PR = one observable deliverable (not one file, not one method).
- Split by user-visible capability, not by implementation layer.
- If you can describe it as "User can X" → that's one PR.
- If two capabilities depend on the same underlying change, they can share a PR.
- Keep PR count ≤ 5 per change. If more, consider splitting the change.
- PR-1: {{title}}
  refs: FR-{{id}}, D-{{id}}
  Source: FR-{{id}} (bp/requirements.md)
  System SHALL {{observable behavior}}.
  Verify: {{command, test, or manual step to confirm it works}}.
  Files: {{file paths}}
- PR-2: {{title}}
  refs: FR-{{id}}
  Source: D-{{id}} (context.md)
  System SHALL {{observable behavior}}.
  Verify: {{confirmation method}}.
  Files: {{file paths}}

---

## Scope

{{what's included}}

---

## Out of Scope

{{what's excluded}}
`;

export const DESIGN_TEMPLATE = `# Design: {{name}}

> Change design — component decomposition with DS-N numbering. Each Design Item references proposal deliverables (PR-N).

---

## Design Items

- DS-1: {{component-name}}
  refs: PR-{{id}}, PR-{{id}}
  {{core responsibilities, interfaces, data flow}}
  Source: PR-{{id}} (proposal.md)
- DS-2: {{component-name}}
  refs: PR-{{id}}
  {{responsibilities}}
  Source: PR-{{id}} (proposal.md)
---

## Context & Goals

<!-- Context/constraints + core design goals (≤3). Must align with proposal Intent and Must-haves. -->

{{background-and-goals}}

---

## Technical Approach

### Architecture Diagram

<!-- ASCII art showing module relationships. Annotate: [NEW], [MODIFIED], [EXISTING]. -->

\`\`\`text
{{architecture-diagram}}
\`\`\`

### Core Data Structures

<!-- Key types/interfaces introduced or modified. TypeScript interface format, brief description per type. -->

{{data-structures}}

### Data Flow

<!-- Step-by-step data flow from trigger to effect. -->

{{data-flow}}

### Interface Design

<!-- Each interface: method, path, request/response structure, parameters. Copy from spec if defined. -->

#### {{endpoint}} \`{{HTTP_METHOD}} {{path}}\`
- **Headers**: {{headers}}
- **Request body**: 
  \`\`\`json
  {{request example}}
  \`\`\`
- **Response**: 
  \`\`\`json
  {{response example}}
  \`\`\`
- **Errors**: {{error codes}}
- **Source**: specs/{{domain}}/spec.md SHALL-{{id}}

## External Dependencies

<!-- External APIs/services used. Full URL + auth + parameters. -->

| Service | Base URL | Auth | Request | Response | Used By | Source |
|---------|----------|------|---------|----------|---------|--------|
| {{name}} | \`{{https://api.example.com}}\` | {{Bearer Token}} | {{params}} | {{response}} | DS-{{id}} | FR-{{id}} |

---

## File Manifest

| File Path | Description | Action | Source |
|-----------|-------------|--------|--------|
| \`{{file-path-1}}\` | {{description}} | Create | DS-{{id}} |
| \`{{file-path-2}}\` | {{description}} | Modify | DS-{{id}} |

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

<!-- Evaluated but rejected approaches, with rationale. -->

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

> This document breaks the design into executable tasks grouped by wave. Each task includes refs to design items (DS-N), spec_ref, files, and acceptance criteria. type:behavior tasks must include RED test descriptions (GIVEN/WHEN/THEN format).

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

## Wave 1: {{theme}}

<!--
Decomposition guidance:
- T = one independently testable behavior path per task. If a DS has 3 endpoints → 3 tasks.
- Multiple DS merge into one T only when they cannot compile/test separately.
- 1 wave by default. Add Wave 2, 3 only when layer dependencies exist (model→service→api).
-->

- [ ] T-1: [type:{{type}}] {{title}}
  - **refs**: DS-{{id}}
  - **files**: {{full relative paths from project root, comma-separated}}
  - **spec_ref**: specs/{{domain}}/spec.md <!-- required for behavior type -->
  - **acceptance**:
    {{observable, assertable acceptance criteria (GIVEN/WHEN/THEN or bullet list)}}
  - **depends_on**: [T-{{id}}] <!-- optional -->
  {{if behavior}}
  - ***RED test***:
    \`\`\`
    GIVEN {{precondition}}
    WHEN {{trigger action}}
    THEN {{expected result}}
    \`\`\`
  {{/if}}

---

## Implementation Verification

> **This is NOT the review step.** These checks confirm the code is correct and tests pass. After passing, run \`bp continue\` to advance to the review/archive workflow step.

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

## D-1: {{decision-title}}
- Status: {{ACCEPTED | REJECTED | DEFERRED}}
- Decision: {{what was decided}}
- Reason: {{why this decision was made}}
- Alternatives: {{what else was considered}}
- References: {{FR-N, D-N}}

## D-2: {{decision-title}}
- Status: {{ACCEPTED | REJECTED | DEFERRED}}
- Decision: {{what was decided}}
- Reason: {{why}}
- Alternatives: {{what else was considered}}
- References: {{FR-N, D-N}}
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

export const PHASE_RESEARCH_TEMPLATE = `# Research: {{name}}

## Research Scope
{{what was researched}}

## Recommendation
{{recommended implementation path}}

## Risks
- {{risk-1}}: {{mitigation}}
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

export const RESEARCH_SUMMARY_TEMPLATE = `# Summary: {{name}}

## Recommendation
{{recommended approach, one paragraph}}

## Rationale
{{why this approach, key trade-offs considered}}
`;

export const SUMMARY_TEMPLATE = `# Summary: {{name}}

> Phase completion summary.

---

## Intent Recap
{{intent}}

## Changes
| Change | Status | Description |
|--------|--------|-------------|
| {{change-1}} | {{status}} | {{description}} |

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

<!-- PASS / FAIL / NEEDS_REVISION — If any row below is FAIL, or any Issues entry exists, overall MUST be FAIL or NEEDS_REVISION, NOT PASS. -->

## Constraint Checklist

| # | Constraint | Location | Status | Evidence |
|---|-----------|----------|--------|----------|
| R1 | {{constraint}} | {{file:line}} | PASS / FAIL / N/A | {{note}} |
| R2 | {{constraint}} | {{file:line}} | PASS / FAIL / N/A | {{note}} |

## Edge Case Coverage

| Edge Case | Covered? | Evidence |
|-----------|---------|----------|
| {{edge-case}} | {{yes/no}} | {{note}} |

## Issues
- [ ] R1 — {{brief}} (xref R1)
- [ ] R2 — {{brief}} (xref R2)
<!-- Add more: - [ ] R<N> — <brief> (xref R<N>) -->
<!-- Design issues: - [ ] D1 — <design issue> (replan required) -->
`;

export const QUALITY_REVIEW_TEMPLATE = `# Quality Review: {{name}}

> Code quality audit. Checks for bugs, security issues, conventions, and common AI mistakes.

---

## Overall: {{verdict}}

<!-- PASS / FAIL / NEEDS_REVISION — If any issue below (BLOCKER/MAJOR/MINOR/INFO) or any Issues entry exists, overall MUST be FAIL or NEEDS_REVISION, NOT PASS. -->

## Issues

| # | Severity | Category | Location | Description |
|---|----------|----------|----------|-------------|
| Q1 | BLOCKER / MAJOR / MINOR / INFO | {{category}} | {{file:line}} | {{description}} |
| Q2 | BLOCKER / MAJOR / MINOR / INFO | {{category}} | {{file:line}} | {{description}} |

## Convention Compliance

| Rule | Status | Note |
|------|--------|------|
| {{rule}} | {{status}} | {{note}} |

## Issues
- [ ] Q1 — {{brief}} (xref Q1)
- [ ] Q2 — {{brief}} (xref Q2)
<!-- Add more: - [ ] Q<N> — <brief> (xref Q<N>) -->
<!-- Design issues: - [ ] D<N> — <design issue> (replan required) -->
`;

export const GOAL_REVIEW_TEMPLATE = `# Goal Review: {{name}}

> Goal achievement review. Cross-references proposal.md goals and must_haves against implementation.

---

## Overall: {{verdict}}

<!-- PASS / FAIL / NEEDS_REVISION — If any goal below is PARTIAL or NOT_ACHIEVED, or any Issues entry exists, overall MUST be FAIL or NEEDS_REVISION, NOT PASS. -->

## Goal Checklist

| # | Goal / Must-have | Status | Evidence |
|---|-----------------|--------|----------|
| G1 | {{goal}} | ACHIEVED / PARTIAL / NOT_ACHIEVED | {{note}} |
| G2 | {{goal}} | ACHIEVED / PARTIAL / NOT_ACHIEVED | {{note}} |

## Completeness Assessment

{{assessment}}

## Issues
- [ ] G1 — {{brief}} (xref G1)
- [ ] G2 — {{brief}} (xref G2)
<!-- Add more: - [ ] G<N> — <brief> (xref G<N>) -->
<!-- Design issues: - [ ] D<N> — <design issue> (replan required) -->
`;

export const CHANGE_SUMMARY_TEMPLATE = `# Change Summary: {{name}}

## Intent
{{intent}}

## Commits
- {{hash-1}}: {{message-1}}

## Output Files
- {{file-1}}: {{action-1}}
`;

export const REQUIREMENTS_TEMPLATE = `# Requirements: {{name}}

> Populated during grill phase. New milestones append to the top, completed milestones remain as history.

---

## FR-1: {{requirement-title}}
- Priority: {{critical | high | medium | low}}
- {{description: what the system should do}}
- Acceptance: {{how to verify}}

## FR-2: {{requirement-title}}
- Priority: {{critical | high | medium | low}}
- {{description}}
- Acceptance: {{how to verify}}

## NFR-1: {{category (performance, security, usability, etc.)}}
- {{constraint or quality attribute}}

## Constraints
- {{constraint-1}}
- {{constraint-2}}
`;

export const ROADMAP_TEMPLATE = `# Roadmap: {{name}}

> Planning mode: {{mode}}

## Md-1: {{milestone-name}} [NOT_STARTED]

### Ph-1.1: {{first-phase-name}} [NOT_STARTED]
- **Goal**: {{what this phase delivers — a demonstrable, shippable artifact}}
- **Deliverable**: {{runnable binary, deployed endpoint, test suite passing, etc.}}
- **Inputs**: {{specs, conventions, docs}}
- **Outputs**: {{code, specs, docs}}

### Ph-1.2: {{second-phase-name}} [NOT_STARTED]
- **Goal**: {{what this phase delivers}}
- **Deliverable**: {{runnable artifact}}
- **Inputs**: {{specs, conventions, docs}}
- **Outputs**: {{code, specs, docs}}

> Add more phases (Ph-1.3, Ph-1.4, ...) and milestones (Md-2, Md-3, ...) below as separate sections.
> Use \`[NOT_STARTED]\`, \`[ACTIVE]\`, or \`[COMPLETED]\` status tags.
> Directory naming: milestones/{Md-id}/phases/{Ph-mid.pid}/changes/. Create milestone root + first phase directory only. Remaining dirs created on-demand.`;

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

export const CODEBASE_STACK_TEMPLATE = `# Technology Stack

**Analysis Date:** {{date}}

## Languages

**Primary:**
- {{language}} {{version}} — {{where-used}}

**Secondary:**
- {{secondary-language}} {{version}} — {{where-used}}

## Runtime

**Environment:**
- {{runtime}} {{version}}

**Package Manager:**
- {{package-manager}} {{version}}
- Lockfile: {{lockfile}}

## Frameworks

**Core:**
- {{framework}} {{version}} — {{purpose}}

**Testing:**
- {{test-framework}} {{version}} — {{purpose}}

**Build/Dev:**
- {{build-tool}} {{version}} — {{purpose}}

## Key Dependencies

**Critical:**
- {{package}} {{version}} — {{why-it-matters}}

**Infrastructure:**
- {{package}} {{version}} — {{purpose}}

## Configuration

**Environment:**
- {{how-configured}}
- Key configs: {{key-configs}}

**Build:**
- {{build-config-files}}

## Platform Requirements

**Development:**
- {{dev-requirements}}

**Production:**
- {{deployment-target}}

---

*Stack analysis: {{date}}*`;

export const CODEBASE_ARCHITECTURE_TEMPLATE = `<!-- refreshed: {{date}} -->
# Architecture

**Analysis Date:** {{date}}

## System Overview

\`\`\`text
┌─────────────────────────────────────────────────────────────┐
│                      {{top-layer-name}}                      │
├──────────────────┬──────────────────┬───────────────────────┤
│   {{component-a}}   │   {{component-b}}   │    {{component-c}}     │
│  \`{{path-to-a}}\`   │  \`{{path-to-b}}\`   │   \`{{path-to-c}}\`    │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    {{middle-layer-name}}                     │
│         \`{{path-to-layer}}\`                                  │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  {{store-or-output}}                                         │
│  \`{{path-to-store}}\`                                        │
└─────────────────────────────────────────────────────────────┘
\`\`\`

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| {{name}} | {{responsibility}} | \`{{path}}\` |
| {{name}} | {{responsibility}} | \`{{path}}\` |

## Pattern Overview

**Overall:** {{pattern-name}}

**Key Characteristics:**
- {{characteristic-1}}
- {{characteristic-2}}
- {{characteristic-3}}

## Layers

**{{layer-name}}:**
- Purpose: {{what-this-layer-does}}
- Location: \`{{location}}\`
- Depends on: {{depends-on}}
- Used by: {{used-by}}

**{{layer-name-2}}:**
- Purpose: {{what-this-layer-does}}
- Location: \`{{location}}\`
- Depends on: {{depends-on}}
- Used by: {{used-by}}

## Data Flow

### Primary Request Path
1. {{step-1}} (\`{{file:line}}\`)
2. {{step-2}} (\`{{file:line}}\`)
3. {{step-3}} (\`{{file:line}}\`)

### {{secondary-flow-name}}
1. {{step-1}}
2. {{step-2}}
3. {{step-3}}

**State Management:** {{state-approach}}

## Key Abstractions

**{{abstraction-name}}:**
- Purpose: {{what-it-represents}}
- Examples: \`{{file-path-examples}}\`
- Pattern: {{pattern-used}}

## Entry Points

**{{entry-name}}:**
- Location: \`{{location}}\`
- Triggers: {{what-invokes-it}}
- Responsibilities: {{what-it-does}}

## Architectural Constraints

- **Threading:** {{threading-model}}
- **Global state:** {{global-state-description}}
- **Circular imports:** {{circular-imports}}

## Anti-Patterns

### {{anti-pattern-name}}
**What happens:** {{description}}
**Why it's wrong:** {{reason}}
**Do this instead:** {{correct-pattern}} (\`{{file-reference}}\`)

## Error Handling

**Strategy:** {{error-strategy}}
**Patterns:**
- {{pattern-1}}
- {{pattern-2}}

## Cross-Cutting Concerns

| Concern | Approach | Files |
|---------|----------|-------|
| Logging | {{logging-approach}} | \`{{path}}\` |
| Validation | {{validation-approach}} | \`{{path}}\` |
| Auth | {{auth-approach}} | \`{{path}}\` |

---

*Architecture analysis: {{date}}*`;

export const CODEBASE_CONVENTIONS_TEMPLATE = `# Coding Conventions

**Analysis Date:** {{date}}

## Code Style

- Indentation: {{indent}}
- Quotes: {{quotes}}
- Semicolons: {{semicolons}}
- Max line length: {{max-line}}

## Naming

**Functions:** {{func-naming}}
**Variables:** {{var-naming}}
**Classes:** {{class-naming}}
**Files:** {{file-naming}}
**Directories:** {{dir-naming}}

## Import Patterns

**Order:** {{import-order}}
**Path aliases:** {{aliases}}
**Barrel exports:** {{barrel-exports}}

## Error Handling

**Expected errors:** {{expected-errors}}
**Unexpected errors:** {{unexpected-errors}}
**Pattern:** {{error-pattern}}

## Type System

**Strictness:** {{strictness}}
**Type vs Interface:** {{type-vs-interface}}
**Generics usage:** {{generics}}
**\`any\` usage:** {{any-usage}}

## Async Patterns

**Preferred:** {{async-pattern}}
**Error handling:** {{async-error-handling}}
`;

export const SPEC_TEMPLATE = `# Delta-Spec: {{domain-name}}

> Change: {{change-name}} | Domain: {{domain-name}}

## ADDED Requirements

### Requirement: {{req-name-1}}
The system SHALL {{behavior-1}}.

#### Scenario: {{scenario-name}}
- **GIVEN** {{given}}
- **WHEN** {{when}}
- **THEN** {{then}}

## MODIFIED Requirements

<!-- Use same header as in global spec. Include complete modified requirement. -->

### Requirement: {{existing-req-name}}
The system SHALL {{new-behavior}}.

#### Scenario: {{scenario-name}}
- **GIVEN** {{given}}
- **WHEN** {{when}}
- **THEN** {{then}}
← (was: {{old-behavior}})

## REMOVED Requirements

<!-- List removed requirement headers with reason -->
- ` + '`### Requirement: {{removed-req-name}}`' + ` — Reason: {{reason}}
`;

export const GLOBAL_SPEC_TEMPLATE = `# {{domain-name}} Specification

## Purpose

{{purpose-description}}

## Requirements

### Requirement: {{req-name-1}}
The system SHALL {{behavior-1}}.

#### Scenario: {{scenario-name}}
- **GIVEN** {{given}}
- **WHEN** {{when}}
- **THEN** {{then}}
`;

export const CODEBASE_CONCERNS_TEMPLATE = `# Codebase Concerns

**Analysis Date:** {{date}}

## Tech Debt

**{{area}}:**
- Issue: {{shortcut}}
- Why: {{why}}
- Impact: {{what-breaks}}
- Fix approach: {{how-to-fix}}
- Location: \`{{path}}\`

## Known Bugs

**{{bug-description}}:**
- Symptoms: {{what-happens}}
- Trigger: {{how-to-reproduce}}
- Workaround: {{mitigation}}
- Root cause: {{root-cause}}
- Location: \`{{path}}\`

## Security Considerations

**{{area}}:**
- Risk: {{what-could-go-wrong}}
- Current mitigation: {{whats-in-place}}
- Recommendations: {{what-should-be-added}}
- Location: \`{{path}}\`

## Performance Bottlenecks

**{{operation}}:**
- Problem: {{whats-slow}}
- Measurement: {{actual-numbers}}
- Cause: {{why-slow}}
- Improvement path: {{how-to-speed-up}}
- Location: \`{{path}}\`

## Fragile Areas

**{{module}}:**
- Why fragile: {{what-makes-it-break}}
- Common failures: {{what-goes-wrong}}
- Safe modification: {{how-to-change}}
- Test coverage: {{coverage}}
- Location: \`{{path}}\`

## Dependencies at Risk

| Dependency | Version | Latest | Risk | Migration |
|-----------|---------|--------|------|----------|
| {{dep}} | {{version}} | {{latest}} | {{risk}} | {{migration}} |

## Test Coverage Gaps

**{{untested-area}}:**
- What's not tested: {{functionality}}
- Risk: {{what-could-break}}
- Priority: {{priority}}
- Difficulty: {{why-not-tested}}

---

*Concerns audit: {{date}}*`;

export const CODEBASE_STRUCTURE_TEMPLATE = `# Codebase Structure

**Analysis Date:** {{date}}

## Directory Layout

\`\`\`
{{project-root}}/
├── {{dir-1}}/          # {{purpose-1}}
├── {{dir-2}}/          # {{purpose-2}}
│   ├── {{subdir}}/     # {{purpose}}
│   └── {{file}}        # {{purpose}}
├── {{dir-3}}/          # {{purpose-3}}
└── {{file}}            # {{purpose}}
\`\`\`

## Directory Purposes

**{{dir-1}}/**
- Purpose: {{purpose}}
- Contains: {{file-types}}
- Key files: {{key-files}}

**{{dir-2}}/**
- Purpose: {{purpose}}
- Contains: {{file-types}}
- Key files: {{key-files}}

## Key File Locations

**Entry Points:**
- \`{{path}}\` — {{purpose}}

**Configuration:**
- \`{{path}}\` — {{purpose}}

**Core Logic:**
- \`{{path}}\` — {{purpose}}

**Testing:**
- \`{{path}}\` — {{purpose}}

## Naming Conventions

**Files:** {{file-pattern}} (e.g. \`{{example}}\`)
**Directories:** {{dir-pattern}} (e.g. \`{{example}}\`)
**Special:** {{special-pattern}}

## Where to Add New Code

**New Feature:**
- Primary code: \`{{path}}\`
- Tests: \`{{path}}\`
- Config if needed: \`{{path}}\`

**New Module:**
- Implementation: \`{{path}}\`
- Types: \`{{path}}\`
- Tests: \`{{path}}\`

**Utilities:**
- Shared helpers: \`{{path}}\`
- Type definitions: \`{{path}}\`

## Special Directories

**{{special-dir}}/**
- Purpose: {{purpose}}
- Source: {{source}}
- Committed: {{committed}}

---

*Structure analysis: {{date}}*`;

export const CODEBASE_TESTING_TEMPLATE = `# Testing Patterns

**Analysis Date:** {{date}}

## Test Framework

**Runner:** {{test-runner}} {{version}}
**Assertion Library:** {{assertion-lib}}
**Mocking:** {{mock-lib}}
**Config:** \`{{config-file}}\`

**Run Commands:**
\`\`\`bash
{{run-command}}              # Run all tests
{{watch-command}}            # Watch mode
{{coverage-command}}         # Coverage
\`\`\`

## Test File Organization

**Location:** {{test-location}} (co-located with source or separate \`tests/\`)
**Naming:** {{test-naming}} (e.g. \`*.test.ts\`)

## Test Structure

**Suite Organization:**
\`\`\`{{language}}
{{test-suite-example}}
\`\`\`

**Patterns:**
- Setup: {{setup-pattern}}
- Teardown: {{teardown-pattern}}
- Assertion: {{assertion-pattern}}

## Mocking

**Framework:** {{mock-lib}}

**Patterns:**
\`\`\`{{language}}
{{mock-example}}
\`\`\`

**What to Mock:**
- {{mock-guidelines}}

**What NOT to Mock:**
- {{no-mock-guidelines}}

## Fixtures and Factories

**Test Data:**
\`\`\`{{language}}
{{fixture-example}}
\`\`\`

**Location:** {{fixture-location}}

## Coverage

**Requirements:** {{coverage-target}} (or "None enforced")
**Current:** {{coverage}}
**View Coverage:** \`{{coverage-command}}\`

## Test Types

**Unit Tests:**
- Scope: {{unit-scope}}
- Example: \`{{unit-example-file}}\`

**Integration Tests:**
- Scope: {{integration-scope}}
- Example: \`{{integration-example-file}}\`

**E2E Tests:**
- Framework: {{e2e-framework}} (or "Not used")

## Common Patterns

**Async Testing:**
\`\`\`{{language}}
{{async-pattern}}
\`\`\`

**Error Testing:**
\`\`\`{{language}}
{{error-pattern}}
\`\`\`

---

*Testing analysis: {{date}}*`;

export const CODEBASE_INTEGRATIONS_TEMPLATE = `# External Integrations

**Analysis Date:** {{date}}

## APIs & External Services

**{{category}}:**
- {{service}} — {{what-its-used-for}}
  - SDK/Client: \`{{package}}\`
  - Auth: \`{{env-var}}\`

## Data Storage

**Databases:**
- {{type}} ({{provider}})
  - Connection: \`{{env-var}}\`
  - Client: \`{{orm}}\`

**File Storage:**
- {{service}}

**Caching:**
- {{service}}

## Authentication & Identity

**Auth Provider:** {{provider}}
- Implementation: {{approach}}
- Middleware: \`{{middleware-path}}\`

## Webhooks & Events

**Incoming:**
- {{endpoint}} — {{purpose}}

**Outgoing:**
- {{target}} — {{purpose}}
## Monitoring & Observability

**Error Tracking:** {{error-tracking}} (or "None")
**Logging:** {{logging-approach}}
**Metrics:** {{metrics-approach}} (or "None")

## CI/CD & Deployment

**Hosting:** {{hosting-platform}}
**CI Pipeline:** {{ci-service}} (or "None")
**Deploy Command:** \`{{deploy-command}}\`

## Environment Configuration

**Required env vars:** {{env-var-list}}
**Secrets location:** {{secrets-location}}

## Third-Party Libraries

## Webhooks & Events

---

*Integrations analysis: {{date}}*`;

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


export const UAT_TEMPLATE = `---
status: testing
scope: {{scope}}
name: {{name}}
source: {{source}}
started: {{started}}
updated: {{updated}}
---

## Current Test

number: 1
name: {{first_test_name}}
expected: |
  {{first_test_expected}}
awaiting: user response

## Tests

{{tests}}

## Summary

total: {{total}}
passed: 0
issues: 0
pending: {{total}}
skipped: 0
blocked: 0

## Gaps

[none yet]
`;

export const DESIGN_PREVIEW_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Design Preview — {{name}}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family={{display-font-url}}&family={{body-font-url}}&display=swap');
:root {
  --primary: {{primary-color}};
  --bg: {{bg-color}};
  --text: {{text-color}};
  --font-display: '{{display-font}}', serif;
  --font-body: '{{body-font}}', sans-serif;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: var(--font-body); color: var(--text); background: var(--bg); }
.hero { padding: 120px 24px; text-align: center; }
.hero h1 { font-family: var(--font-display); font-size: clamp(2.5rem, 6vw, 5rem); color: var(--primary); }
.hero p { margin-top: 24px; font-size: 1.25rem; max-width: 640px; margin-inline: auto; opacity: 0.8; }
.palette { padding: 80px 24px; display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
.swatch { width: 120px; height: 120px; border-radius: 12px; display: flex; align-items: flex-end; padding: 8px; font-size: 0.75rem; color: #fff; }
</style>
</head>
<body>
<section class="hero">
  <h1>{{name}}</h1>
  <p>{{tagline}}</p>
</section>
<section class="palette">
  <div class="swatch" style="background:{{primary-color}}">{{primary-color}}</div>
  <div class="swatch" style="background:{{secondary-color}}">{{secondary-color}}</div>
</section>
</body>
</html>`;

export const LOOP_MD_TEMPLATE = `# Loop Configuration

## Goal
{{goal}}

## Stop Condition
{{stop_condition}}

## Verification
command: "{{verification_command}}"
check: "{{verification_check}}"

## Limits
max_iterations: {{max_iterations}}
no_progress_threshold: {{no_progress_threshold}}

## Progress
iteration: 0
last_progress_at: ""
status: running
`;

/** Template registry — maps template ID → body string */
export const ARTIFACT_TEMPLATES: Record<string, string> = {
  proposal: PROPOSAL_TEMPLATE,
  design: DESIGN_TEMPLATE,
  tasks: TASKS_TEMPLATE,
  context: CONTEXT_TEMPLATE,
  'research-doc': RESEARCH_TEMPLATE,
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
  // Change lifecycle
  'spec': SPEC_TEMPLATE,
  'global-spec': GLOBAL_SPEC_TEMPLATE,
  'completion': SUMMARY_TEMPLATE,  // archiver completion.md
  // Phase research (produced by bp-phase-researcher)
  'phase-research': PHASE_RESEARCH_TEMPLATE,
  'uat': UAT_TEMPLATE,
  // Design preview
  'design-preview': DESIGN_PREVIEW_TEMPLATE,
  // Loop configuration
  'loop.md': LOOP_MD_TEMPLATE,
  // Fix cycle (review loopback)
  'review-design': DESIGN_TEMPLATE.replace('# Design: {{name}}', '# Fix Design: {{name}}'),
  'review-tasks': TASKS_TEMPLATE.replace('# Tasks: {{name}}', '# Fix Tasks: {{name}}'),
};

/** All template IDs for CLI listing */
export const TEMPLATE_IDS = Object.keys(ARTIFACT_TEMPLATES);
