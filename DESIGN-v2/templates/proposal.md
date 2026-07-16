# Proposal: {{name}}

<!--
  This is the human-AI agreement document. It captures WHY and WHAT, not HOW.
  The planner agent reads this to produce design.md, tasks.md, and delta specs.

  Quality bar:
  - Intent explains the problem, not just the solution
  - Scope boundaries are explicit and justified
  - Deliverables are observable (you can verify each one)
  - Each deliverable traces to a spec domain
-->

## Intent

<!--
  What problem does this change solve? Why now?
  Don't describe the solution here - that goes in Approach.
  2-4 sentences.
-->

{{intent}}

## Scope

### In Scope

<!--
  What specific capabilities will this change add or modify?
  Be concrete: "Add theme toggle in header" not "Improve UI".
  List each item as a bullet.
-->

- {{item-1}}
- {{item-2}}

### Out of Scope

<!--
  What is explicitly NOT included? This prevents scope creep.
  Include things that might seem related but are deferred.
-->

- {{excluded-1}}
- {{excluded-2}}

## Approach

<!--
  High-level method description. 2-4 sentences.
  Don't include technical details (class names, library choices) - those go in design.md.
  Do mention if there are alternative approaches worth considering.
-->

{{approach}}

## Deliverables

<!--
  Each deliverable is an observable, verifiable capability.
  Split by user-visible behavior, not by implementation layer.

  Rules:
  - Each PR-N has a SHALL statement describing observable behavior
  - Each PR-N has a Verify method (command, test, or manual step)
  - Source traces to a spec domain (existing or new)
  - Keep PR count ≤ 5. If more, consider splitting this change.
-->

### PR-1: {{deliverable-title}}

- **Source**: specs/{{domain}}/spec.md ({{existing-or-new}})
- **Behavior**: The system SHALL {{observable-behavior}}
- **Verify**: {{command-or-test-or-manual-step}}
- **Files**: {{expected-file-paths}}

### PR-2: {{deliverable-title}}

- **Source**: specs/{{domain}}/spec.md
- **Behavior**: The system SHALL {{observable-behavior}}
- **Verify**: {{verification-method}}
- **Files**: {{expected-file-paths}}

## Roadmap Reference

<!--
  Optional. If this change belongs to a milestone/phase in roadmap.md,
  reference it here. This helps track progress and prevent direction drift.
  Remove this section for adhoc changes (--adhoc).
-->

- **Milestone**: {{milestone-name}}
- **Phase**: {{phase-name}}
