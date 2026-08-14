/**
 * plan-design-review workflow step template — plan-phase UI audit.
 *
 * Adapted from gstack plan-design-review — reference-only source.
 * Ported as a bp auxiliary, UI-audit-only step: UI scope detection, DESIGN.md
 * status, 0-10 rating, focus areas, and a conformance checklist. Advisory —
 * the verdict informs the plan review but does not gate `bp plan`.
 */

import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- **\`$ARGUMENTS\`** (required in practice): change name. The audit runs against the change's planned UI work.
- \`bp/changes/<name>/proposal.md\` and \`design.md\` — the planned deliverables and design.
- Root \`DESIGN.md\` when present — the existing design system the plan is checked against.
- \`bp/config.yaml\` — stack/profile context.

## Steps

> These are the steps you (orchestrator) execute in order. \`bp plan-design-review\` only outputs these steps — it does not auto-execute. The audit work is dispatched to the designer sub-agent. The verdict attaches to the plan review as advisory input — it does not gate \`bp plan\`.

### Step 0: UI scope detection

1. Read the change's proposal deliverables.
2. Do any deliverables touch user-facing screens, components, or styling? If none, write the verdict \`No UI scope — plan-design-review not applicable.\` and stop.

### Step 1: DESIGN.md status

1. Does a root \`DESIGN.md\` exist?
2. Is it current relative to the change's scope?
3. If missing, recommend \`bp design\` before implementation and note it in the verdict.

### Step 2: Initial rating

Rate the planned UI approach 0-10 (10 = fully coherent with the design system, no open questions). Record the rating and a one-line justification.

### Step 3: Focus areas

List the 2-4 highest-leverage design risks in the plan (ambiguous screens, missing states, styling drift, interaction complexity). For each, state what the implementer must decide before or during implementation.

### Step 4: Conformance checklist

Walk the planned changes against the existing design system (when DESIGN.md exists):

- **Typography** — planned text styles match the scale.
- **Color** — planned palette roles match.
- **Spacing** — planned spacing fits the scale.
- **Layout** — planned layout respects the grid/breakpoints.
- **Motion** — planned motion matches durations/easings.

For each item: conforming / deviation (with note) / no evidence yet.

### Step 5: Verdict routing

1. Compose the verdict: the 0-10 rating, focus areas, and conformance findings.
2. Attach it to the plan review cycle as advisory input — present it to the user alongside \`bp plan\` output.
3. The verdict does NOT gate \`bp plan\` — implementation proceeds regardless; the audit raises awareness, not blockers.

## Output

- Advisory audit notes for the plan review: UI scope verdict, DESIGN.md status, 0-10 rating, focus areas, conformance checklist, and routed verdict.

## Guardrails

- If \`bp dispatch designer\` returns a non-zero or failed run, stop and ask the user before proceeding.
- If the change directory is missing, instruct \`bp propose <name>\` first and stop.
- NEVER gate \`bp plan\` on this audit — it is advisory by design.
- NEVER edit source code or \`DESIGN.md\` — the audit produces notes only.
- All output in English.
`;

export function getPlanDesignReviewSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-plan-design-review',
    description: 'Plan-phase UI audit - UI scope detection and 0-10 rating before implementation',
    instructions,
  };
}

export function getPlanDesignReviewCommandTemplate(): CommandTemplate {
  return {
    description: 'Plan-phase UI audit - UI scope detection and 0-10 rating before implementation',
    category: 'Workflow',
    tags: ['bp', 'plan-design-review', 'audit', 'ui', 'plan'],
    content: instructions,
  };
}
