/**
 * design workflow step template — design-system consultation.
 *
 * Adapted from gstack design — reference-only source.
 * Ported as a bp auxiliary workflow step: orchestrator instructions that
 * dispatch the designer sub-agent and write the root DESIGN.md.
 */

import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, the design step operates on the project root.
- Root \`DESIGN.md\` when present (prior design decisions — see Step 0).
- \`bp/config.yaml\` — stack/profile context.
- Platform browser capability (for research and preview screenshots). If the platform cannot browse, degrade to written visual descriptions.

## Steps

> These are the steps you (orchestrator) execute in order. \`bp design\` only outputs these steps — it does not auto-execute. The consultation work is dispatched to the designer sub-agent.

### Step 0: Pre-check

If a root \`DESIGN.md\` already exists, present the user three options and wait for a decision:

- **update** — reuse prior decisions as the base and revise only what changed.
- **fresh** — start over; the new proposal replaces the file.
- **cancel** — abort the step; write nothing and stop.

If the user cancels, report \`Design step cancelled — no artifact written.\` and stop.

### Step 1: Product context

1. Read \`bp/config.yaml\` for the project context (product description, tech stack).
2. Enumerate the user-facing UI surface: screens, components, and styling entry points the design must cover.
3. Record product goals and users — the design system must serve them, not aesthetics alone.

### Step 2: Research

1. Use your platform's browser capability to collect competitor and reference patterns (visual style, typography, color usage, layout conventions).
2. Note what works and what does not for each reference — the rationale matters more than the source.
3. Keep research scoped: 3-5 references are enough unless the user asks for more.

### Step 3: Complete design-system proposal

Produce a full proposal covering every block of the \`## Design System\` shape (fetch \`bp template design-system --stdout\` for the exact shape):

- **Aesthetic direction** — one sentence plus supporting notes.
- **Typography** — scale, families, weights.
- **Color** — palette roles (primary, surface, text, accent, feedback) and contrast rules.
- **Spacing** — scale and density.
- **Layout** — grid, breakpoints, component layout rules.
- **Motion** — durations, easings, and usage guidance.

Every decision carries a one-line rationale. No unexplained choices.

### Step 4: Drill-downs

For any area that remains ambiguous after Step 3 (unusual components, edge states, dark mode, accessibility constraints), expand that block with concrete guidance. If nothing is ambiguous, skip this step.

### Step 5: Preview

1. Build an HTML preview page expressing the design system (tokens as CSS custom properties).
2. Capture browser screenshots when your platform supports browsing; otherwise write a precise written description of the intended visuals.
3. Present the preview to the user and collect feedback. Iterate on the proposal until the user approves or the user stops the step.

### Step 6: Write root \`DESIGN.md\`

1. Fetch the design-system shape: \`bp template design-system --stdout\`.
2. Write the root \`DESIGN.md\` with every block filled from the approved proposal, including the Decisions Log entries (date, decision, rationale).
3. Report a short diff/artifact summary back to the user.

## Output

- Root \`DESIGN.md\` — the complete design system document (\`## Design System\` shape: Product Context / Aesthetic Direction / Typography / Color / Spacing / Layout / Motion / Decisions Log).
- Optional \`design/preview.html\` + screenshots when the platform supports browsing.

## Guardrails

- If \`bp dispatch designer\` returns a non-zero or failed run, stop and ask the user before proceeding.
- If \`DESIGN.md\` exists and the user cancels, abort with no artifact written.
- NEVER overwrite an existing \`DESIGN.md\` without the user choosing update or fresh in Step 0.
- NEVER edit source code — the designer writes design artifacts only; report needed code changes as notes.
- If browser capability is unavailable, the preview step degrades to a written description of intended visuals.
- All output in English.
`;

export function getDesignSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-design',
    description: 'Design system consultation - complete design proposal written to root DESIGN.md',
    instructions,
  };
}

export function getDesignCommandTemplate(): CommandTemplate {
  return {
    description: 'Design system consultation - complete design proposal written to root DESIGN.md',
    category: 'Workflow',
    tags: ['bp', 'design', 'design-system', 'ui'],
    content: instructions,
  };
}
