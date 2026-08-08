# Delta Spec: context

> Change: workflow-reform | Domain: context

## ADDED Requirements

### Requirement: Check-Phase-Value

The context.jsonl phase enum SHALL use `check` as the change-verification phase value instead of `review`; `CONTEXT_PHASES` SHALL be `['plan', 'apply', 'check', 'archive', 'all']`, and `bp check` SHALL validate the change's context.jsonl against the `check` phase.

#### Scenario: phase enum uses check

- **GIVEN** the context phase enum
- **WHEN** `CONTEXT_PHASES` is read
- **THEN** it contains `'check'`
- **AND** it does not contain `'review'`

#### Scenario: check command gates on the check phase

- **GIVEN** a change whose context.jsonl contains a row with `phase: check`
- **WHEN** `gateContextJsonl(bpDir, changeName, 'check')` runs
- **THEN** the file validates
- **AND** rows with `phase: all` also validate

## MODIFIED Requirements

### Requirement: Step-Scoped Context

The system SHALL inject different file sets based on step classification:

- **Project steps** (`init`, `grill`, `research`, `roadmap`): ALL specs + conventions + requirements
- **Phase steps** (`discuss`, `research-phase`, `split`): related specs + conventions + requirements
- **Change steps** (`plan`, `apply`, `check`, `archive`): related specs + conventions + requirements + change artifacts

(was: the change-steps list named `review`; it now names `check`, and the v1-era `verify` step is dropped from the list)

- **Source:** `src/core/spec-injector.ts:29-31`, `src/core/spec-injector.ts:46-81` `generateContext()`
- **Confidence:** HIGH

#### Scenario: change step gets change artifacts

- **GIVEN** step is `apply` (change step) and state has active changes
- **WHEN** `generateContext(dir, "apply")` is called
- **THEN** `result.changeArtifacts` SHALL contain proposal, design, tasks, and delta-specs for the active change

#### Scenario: verification step is check

- **GIVEN** the change-step classification list
- **WHEN** it is inspected for the verification step
- **THEN** it names `check`
- **AND** it does not name `review`
