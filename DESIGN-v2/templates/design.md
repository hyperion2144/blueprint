# Design: {{name}}

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

### DS-2: {{component-name}}

- **Refs**: PR-{{id}}, PR-{{id}}
- **Source**: PR-{{id}} (proposal.md)
- **Responsibility**: {{responsibility}}
- **Key Interfaces**: {{interfaces}}

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

```text
{{architecture-diagram}}
```

### Core Data Structures

<!--
  Key types/interfaces introduced or modified.
  Use TypeScript interface format. Brief description per type.
  Only include types that are part of the component contract,
  not every internal type.
-->

```typescript
{{data-structures}}
```

### Data Flow

<!--
  Step-by-step flow from trigger to effect.
  Number each step. Include file paths for key operations.

  Example:
  1. User clicks theme toggle (src/components/ThemeToggle.tsx)
  2. ThemeToggle calls useTheme().toggle() (src/hooks/useTheme.ts)
  3. ThemeContext updates state and persists to localStorage
  4. CSS variables update, UI re-renders with new theme
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

#### {{endpoint-name}} `{{HTTP_METHOD}} {{path}}`

- **Headers**: {{required-headers}}
- **Request body**:
  ```json
  {{request-example}}
  ```
- **Response 200**:
  ```json
  {{response-example}}
  ```
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
| {{name}} | `{{url}}` | {{auth-method}} | {{purpose}} | DS-{{id}} |

## File Manifest

<!--
  EVERY file that will be created or modified.
  No "etc." or "and other files". If you forgot a file, the executor won't know about it.

  Action: Create | Modify | Delete
-->

| File Path | Description | Action | Source |
|-----------|-------------|--------|--------|
| `{{path}}` | {{description}} | Create | DS-{{id}} |
| `{{path}}` | {{description}} | Modify | DS-{{id}} |
| `{{path}}` | {{description}} | Create | DS-{{id}} |

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
