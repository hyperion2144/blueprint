/**
 * design-shotgun workflow step template — multi-variant design exploration.
 *
 * Adapted from gstack design-shotgun — reference-only source.
 * Ported as a bp auxiliary workflow step: orchestrator instructions that
 * dispatch the designer sub-agent to explore and approve design variants.
 */

import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, the step operates on the project root.
- Root \`DESIGN.md\` when present (design-system constraints for variant generation).
- \`bp/config.yaml\` — product context and stack.
- Prior \`design/approved.json\` when present (taste memory — previously approved variants).
- Platform browser capability (for browser mockups / HTML previews). If the platform cannot browse, generate HTML previews or written mockup descriptions instead.

## Steps

> These are the steps you (orchestrator) execute in order. \`bp design-shotgun\` only outputs these steps — it does not auto-execute. The exploration work is dispatched to the designer sub-agent.

### Step 1: Session detection

Reuse the \`design/\` scratch directory when it exists (prior variants, notes, partial mockups). Start fresh when empty.

### Step 2: Context gathering

1. Read root \`DESIGN.md\` (when present) and \`bp/config.yaml\` for constraints.
2. Read the change's proposal when a change is active.
3. List what the variants must cover (screens, components, style questions to settle).

### Step 3: Taste memory

Read prior \`design/approved.json\` (when present) for the user's taste: which directions were approved, which were rejected, and why. Do not repeat rejected directions.

### Step 4: Variant generation

1. Propose 2-3 distinct concepts and confirm the direction with the user BEFORE generating.
2. Generate variants in parallel: browser mockups or HTML previews.
3. Keep each variant internally coherent — a variant is a complete direction, not a mix.

### Step 5: Comparison board

1. Lay the variants side by side (screenshots or previews).
2. For each variant, list strengths and weaknesses against the design-system constraints and the user's stated goals.

### Step 6: Feedback loop

1. Collect user feedback per variant.
2. Refine the promising variants per feedback and re-board them.
3. Repeat until the user is ready to pick, or the user stops the step.

### Step 7: Approval

The user picks the winner. Record the decision explicitly — never assume.

### Step 8: Save

Write \`design/approved.json\`: winner, rationale, and the extracted tokens (colors, typography, spacing) so \`bp design-html\` can consume them.

## Output

- \`design/\` scratch: variants (browser mockups / HTML previews / written mockup descriptions).
- \`design/approved.json\`: winner + rationale + tokens.

## Guardrails

- If \`bp dispatch designer\` returns a non-zero or failed run, stop and ask the user before proceeding.
- NEVER pick the winner yourself — approval is always the user's call.
- NEVER edit source code — variants live in the \`design/\` scratch directory.
- If browser capability is unavailable, generate HTML previews or written mockup descriptions instead.
- All output in English.
`;

export function getDesignShotgunSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-design-shotgun',
    description: 'Multi-variant design exploration - generate, compare, and approve design variants',
    instructions,
  };
}

export function getDesignShotgunCommandTemplate(): CommandTemplate {
  return {
    description: 'Multi-variant design exploration - generate, compare, and approve design variants',
    category: 'Workflow',
    tags: ['bp', 'design-shotgun', 'variants', 'exploration', 'ui'],
    content: instructions,
  };
}
