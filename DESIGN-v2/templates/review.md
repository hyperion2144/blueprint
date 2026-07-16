# Review: {{name}}

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

<!--
  PASS: zero issues, ready to archive.
  FAIL: has D issues or BLOCKER severity issues. Needs replan or critical fix.
  NEEDS_REVISION: has R/Q/G issues but no D or BLOCKER. Needs code fix.
-->

---

## Spec Review

<!--
  Cross-reference every delta spec requirement against the implementation.
  Every ADDED requirement must have corresponding code.
  Every MODIFIED requirement must show the behavior change.
  Every REMOVED requirement must be actually removed from code.
-->

### Constraint Checklist

| # | Requirement | Type | Status | Evidence |
|---|-------------|------|--------|----------|
| R1 | {{requirement-name}} | ADDED | {{PASS/FAIL/N/A}} | {{file:line - what verifies this}} |
| R2 | {{requirement-name}} | MODIFIED | {{PASS/FAIL/N/A}} | {{file:line - what changed}} |
| R3 | {{requirement-name}} | REMOVED | {{PASS/FAIL/N/A}} | {{file:line - confirmed removed}} |

### Scenario Coverage

<!--
  Every scenario in delta specs should have a corresponding test.
  MISSING = scenario exists in spec but no test exercises it.
-->

| Scenario | Test Location | Status |
|----------|--------------|--------|
| {{scenario-name}} | {{test-file:line}} | PASS |
| {{scenario-name}} | {{test-file:line}} | PASS |
| {{scenario-name}} | - | MISSING |

### Spec Verdict: {{PASS | FAIL | NEEDS_REVISION}}

---

## Quality Review

<!--
  Audit code for bugs, security issues, convention violations, and AI code smell.
  Severity calibration:
  - BLOCKER: will crash in production or cause data loss
  - MAJOR: incorrect behavior or security issue
  - MINOR: maintainability issue, code smell
  - INFO: suggestion, not a problem

  Only report BLOCKER/MAJOR/MINOR. INFO is optional.
-->

### Issues

| # | Severity | Category | Location | Description | Fix |
|---|----------|----------|----------|-------------|-----|
| Q1 | {{BLOCKER/MAJOR/MINOR}} | {{Bug/Security/Convention/AI-Smell}} | {{file:line}} | {{specific-description}} | {{actionable-fix}} |

### Convention Compliance

<!--
  Check against bp/conventions/coding.md.
  Only list violations or notable adherence. Don't list every rule that passes.
-->

| Rule | Status | Note |
|------|--------|------|
| {{convention-rule}} | {{PASS/FAIL}} | {{note}} |

### Quality Verdict: {{PASS | FAIL | NEEDS_REVISION}}

---

## Goal Review

<!--
  Cross-reference proposal.md deliverables against implementation.
  Each PR-N must be verified as ACHIEVED.
-->

### Goal Checklist

| # | Deliverable | Status | Evidence |
|---|-------------|--------|----------|
| G1 | PR-1: {{deliverable-title}} | {{ACHIEVED/PARTIAL/NOT_ACHIEVED}} | {{evidence - how verified}} |
| G2 | PR-2: {{deliverable-title}} | {{ACHIEVED/PARTIAL/NOT_ACHIEVED}} | {{evidence}} |

### Goal Verdict: {{PASS | FAIL | NEEDS_REVISION}}

---

## Issues

<!--
  All unresolved issues. Each gets a prefix + number.
  Leave as - [ ] (unchecked). In fix mode, resolved issues become - [x].

  Format: - [ ] {{PREFIX}}{{N}} - {{brief-description}} ({{source-section}})
-->

- [ ] {{R/Q/G/D}}{{N}} - {{brief-description}} ({{spec/quality/goal}})
<!-- Add more issues as needed -->

<!--
  If no issues found, leave this section empty (heading only).
  Do NOT write "NO_ISSUES_FOUND".
-->

## Routing

<!--
  Based on issue prefixes, recommend the next action.
-->

- **D issues**: {{count}} ({{list or "none"}})
- **R/Q/G issues**: {{count}} ({{list or "none"}})

<!--
  If D issues exist -> replan needed:
  **Recommendation**: `bp plan --fix {{name}}` (design issues require redesign)

  If only R/Q/G issues -> code fix needed:
  **Recommendation**: `bp apply --fix {{name}}` (implementation issues require code fix)

  If no issues:
  **Recommendation**: `bp archive {{name}}` (all checks passed)
-->

**Recommendation**: `bp {{action}} {{name}}`
