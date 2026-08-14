/**
 * design-review workflow step template — designer's-eye QA audit.
 *
 * Adapted from gstack design-review — reference-only source.
 * Ported as a bp auxiliary workflow step: orchestrator instructions that
 * dispatch the designer sub-agent to audit the UI against DESIGN.md.
 */

import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- **\`$ARGUMENTS\`** (optional): change name. When present, the audit report is written to \`bp/changes/<name>/design-review.md\`; otherwise to \`design/review-<iso-date>.md\`.
- Root \`DESIGN.md\` — the design system the UI is audited against.
- The change's \`proposal.md\` / \`design.md\` when a change is active (scope context).
- Platform browser capability (for page-by-page visual audit). If the platform cannot browse, audit the written UI description instead.

## Steps

> These are the steps you (orchestrator) execute in order. \`bp design-review\` only outputs these steps — it does not auto-execute. The audit work is dispatched to the designer sub-agent.

### Step 1: Mode selection

Pick the audit depth (ask the user when unsure):

- **full** — everything below (default).
- **quick** — first impression + top issues only, no page-by-page checklist.
- **deep** — full checklist plus interaction-flow review on every page.
- **diff-aware** — audit only what changed vs the prior review.
- **regression** — re-run a prior report's issue list against the current UI.

### Step 2: Phase 1 — First impression

1. Open the UI surface and record 10-second glance notes: what stands out, what feels broken, what the eye lands on first.
2. Do not fix anything — record only.

### Step 3: Phase 2 — Design-system extraction

1. Read the root \`DESIGN.md\` and list its tokens (typography, color, spacing, layout, motion).
2. Compare the live UI against those tokens — note every visible deviation.

### Step 4: Phase 3 — Page-by-page visual audit

1. Walk every page/screen through the 10-category checklist (~80 items): layout, typography, color, spacing, alignment, hierarchy, states, responsiveness, accessibility, motion.
2. Apply the trunk test: every page must visibly share the same design system — a page that does not is a finding.
3. Record each issue with severity (blocker / major / minor) and location.

### Step 5: Phase 4 — Interaction-flow review

1. Walk the key user flows end to end (navigation, forms, feedback states, empty states).
2. Record flow-level issues separately from page-level ones.

### Step 6: Write the report

1. Compose the report with a 0-10 rating and a prioritized issue list (severity, then impact).
2. Write it to \`bp/changes/<name>/design-review.md\` when a change is active, else \`design/review-<iso-date>.md\`.
3. Report a short summary back to the user.

## Output

- \`bp/changes/<name>/design-review.md\` (change-scoped) or \`design/review-<iso-date>.md\` (project-scoped): 0-10 rating, prioritized issue list, per-category checklist results.

## Guardrails

- If \`bp dispatch designer\` returns a non-zero or failed run, stop and ask the user before proceeding.
- NEVER edit source code — the audit reports findings; the executor fixes them.
- NEVER change \`DESIGN.md\` as part of the audit — deviations are reported, not silently corrected.
- If a change is active but \`bp/changes/<name>\` is missing, instruct \`bp propose <name>\` first and stop.
- If browser capability is unavailable, audit the written UI description and note the degraded scope.
- All output in English.
`;

export function getDesignReviewSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-design-review',
    description: "Designer's-eye QA audit - full visual and UX audit against DESIGN.md",
    instructions,
  };
}

export function getDesignReviewCommandTemplate(): CommandTemplate {
  return {
    description: "Designer's-eye QA audit - full visual and UX audit against DESIGN.md",
    category: 'Workflow',
    tags: ['bp', 'design-review', 'qa', 'audit', 'ui'],
    content: instructions,
  };
}
