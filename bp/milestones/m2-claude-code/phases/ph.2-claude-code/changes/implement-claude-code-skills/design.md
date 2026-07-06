# Design: implement-claude-code-skills

> This document is the Change Design — written after proposal approval, describing how to implement. Each section has fill-in guidance. After this document, proceed to task breakdown.

---

## Context & Goals

<!-- Context/constraints + core design goals (≤3). Must align with proposal Intent and Must-haves. -->

{{background-and-goals}}

---

## Technical Approach

### Architecture Diagram

<!-- ASCII art showing module relationships. Annotate: [NEW], [MODIFIED], [EXISTING]. -->

```text
{{architecture-diagram}}
```

### Core Data Structures

<!-- Key types/interfaces introduced or modified. TypeScript interface format, brief description per type. -->

{{data-structures}}

### Data Flow

<!-- Step-by-step data flow from trigger to effect. -->

{{data-flow}}

### Interface Design

<!-- Public API signatures: function/method names, params (name+type+desc), return types, sync/async. -->

{{api-signatures}}

---

## File Manifest

<!-- All files to create or modify. -->

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
