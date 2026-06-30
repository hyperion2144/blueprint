# Design: update-conventions

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

```text
{{architecture-diagram}}
```

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
| `{{file-path-1}}` | {{description}} | Create |
| `{{file-path-2}}` | {{description}} | Modify |

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
