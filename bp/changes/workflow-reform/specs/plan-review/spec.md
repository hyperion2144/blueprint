# Delta Spec: plan-review

> Change: workflow-reform | Domain: plan-review

## ADDED Requirements

### Requirement: DS-N-Contract-Fields

The plan step's Step-4 quality review SHALL verify that every design item (DS-N) in `design.md` carries explicit Requirements, Constraints, and Acceptance Criteria fields, and the planner sub-agent prompt SHALL instruct the planner to fill all three fields for every DS-N.

#### Scenario: design template carries the three fields

- **GIVEN** the design artifact template
- **WHEN** `bp template design --stdout` is invoked
- **THEN** the DS-N block contains `**Requirements**:`, `**Constraints**:`, and `**Acceptance Criteria**:` fields

#### Scenario: planner prompt instructs filling the fields

- **GIVEN** the `PLANNER_PROMPT`
- **WHEN** it is inspected for DS-N guidance
- **THEN** it instructs filling Requirements, Constraints, and Acceptance Criteria for every DS-N

#### Scenario: plan step quality gate checks the fields

- **GIVEN** the plan workflow Step-4 quality review instructions
- **WHEN** the implementability dimension is inspected
- **THEN** it asks whether every DS-N carries Requirements, Constraints, and Acceptance Criteria

#### Scenario: re-dispatch feedback cites missing fields

- **GIVEN** a design whose DS-N lacks an Acceptance Criteria field
- **WHEN** the orchestrator applies the Step-4 re-dispatch protocol
- **THEN** the structured feedback SHALL include the dimension, the DS-N, the problem (missing Acceptance Criteria), and the expected state (all three fields present)
