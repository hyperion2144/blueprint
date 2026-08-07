# Delta Spec: state

> Change: workflow-reform | Domain: state

## ADDED Requirements

### Requirement: Change-Verification-Step-Naming

The system SHALL name the change-verification step `check` in state derivation: the `bp state` next action for an applied (implemented, not yet reviewed) change SHALL be `bp check <name>`, while the verification artifact SHALL remain named `review.md`.

#### Scenario: state next action uses check

- **GIVEN** an active change whose artifacts are fully implemented but no `review.md` exists yet
- **WHEN** `deriveState` computes the next action
- **THEN** the next action SHALL be `bp check <name>`
- **AND** it SHALL NOT be `bp review <name>`

#### Scenario: verification artifact stays review.md

- **GIVEN** a change whose `review.md` exists with verdict PASS
- **WHEN** state status is derived from artifacts
- **THEN** the change status is `reviewed`
- **AND** the artifact file is still named `review.md`

## MODIFIED Requirements

### Requirement: State Transitions

The system SHALL define the legal verification and fix-loopback transitions in the change lifecycle: from a change in the verifying state, the `check` step SHALL be the verification action; when the review is not PASS, the check step SHALL dispatch the fixer sub-agent to repair proposal/design/implementation and then re-review the entire change, rather than routing to standalone `fix`/`replan`/`reapply` command transitions. Each transition MUST record its `from`, `command`, `to`, and `slashCommand` fields.

(was: verification used a `review` step and fix loopbacks routed through standalone `fix`, `replan`, and `reapply` command transitions)

- **Source:** `src/types/state.ts`, `src/commands/bp-state.ts`
- **Confidence:** MEDIUM

#### Scenario: verification transition is check

- **GIVEN** a change status is `applied` (verifying)
- **WHEN** the next transition is resolved
- **THEN** the transition command SHALL be `check`
- **AND** the transition routes the change toward archive once the review passes

#### Scenario: fix loopback is owned by the check step

- **GIVEN** a change whose review verdict is FAIL or NEEDS_REVISION
- **WHEN** the fix loopback transition is resolved
- **THEN** the loopback SHALL route through the check step (dispatch fixer, then full re-review)
- **AND** no standalone `fix` command transition SHALL be used
