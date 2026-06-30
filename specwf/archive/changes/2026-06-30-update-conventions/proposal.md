# Proposal: update-conventions

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

Update coding conventions to English to match current template language

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
