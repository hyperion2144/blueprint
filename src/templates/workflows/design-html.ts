/**
 * design-html workflow step template — DESIGN.md to production HTML/CSS.
 *
 * Adapted from gstack design-html — reference-only source.
 * Ported as a bp auxiliary workflow step: orchestrator instructions that
 * dispatch the designer sub-agent to implement the design system.
 */

import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, the step operates on the project root.
- \`design/approved.json\` when present (shotgun winner + tokens) — highest-priority design source.
- Root \`DESIGN.md\` when present (design-system tokens).
- Project source under the web root — the files the generated HTML/CSS will replace or join.
- \`bp/config.yaml\` — stack/profile context for framework detection.

## Steps

> These are the steps you (orchestrator) execute in order. \`bp design-html\` only outputs these steps — it does not auto-execute. The generation work is dispatched to the designer sub-agent.

### Step 1: Input detection

Pick the design source in this order:

1. \`design/approved.json\` (shotgun output — winner, rationale, tokens).
2. Root \`DESIGN.md\` (design-system document).
3. Clean slate — proceed with a minimal default design and flag it to the user.

If none exists and the user expected prior design work, suggest \`bp design\` first.

### Step 2: Design analysis

1. Extract design tokens from the source: colors, typography scale, spacing scale, radii, shadows, motion durations/easings.
2. List the UI surface the HTML must cover (screens/components from the design source).
3. Note any ambiguity and resolve it with the user before generating.

### Step 3: Framework detection

1. Read \`package.json\` and config files per \`bp/config.yaml\` context to detect the project framework.
2. Match the generation approach to the framework (plain HTML/CSS, component markup, or CSS custom properties that the framework consumes).
3. If detection is inconclusive, ask the user; do not guess silently.

### Step 4: Generation

1. Express every design token as a CSS custom property on the root.
2. Generate the HTML/CSS implementing the design surface, matching the detected framework conventions.
3. Keep the output minimal and reviewable — no generated boilerplate beyond what the design requires.

### Step 5: Preview and refine loop

1. Build an HTML preview page and capture browser screenshots when your platform supports browsing; otherwise write a written description of the rendered result.
2. Present the preview to the user.
3. Refine per feedback and re-preview until the user approves or stops the step.

### Step 6: Token extraction

1. Write the final tokens back into the root \`DESIGN.md\` Decisions Log (date, decision, rationale) so the design system stays the source of truth.
2. Report a diff/artifact summary.

## Output

- HTML/CSS implementing the design system under the project's web root or under \`design/\` when the target is not yet wired into the app.
- Updated \`DESIGN.md\` Decisions Log entries (token extraction).

## Guardrails

- If \`bp dispatch designer\` returns a non-zero or failed run, stop and ask the user before proceeding.
- NEVER edit application source code beyond the generated HTML/CSS the step owns — report other needed code changes as notes.
- If browser capability is unavailable, the preview step degrades to a written description of the intended visuals.
- All output in English.
`;

export function getDesignHtmlSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-design-html',
    description: 'Design to production HTML/CSS - implement DESIGN.md against the detected project framework',
    instructions,
  };
}

export function getDesignHtmlCommandTemplate(): CommandTemplate {
  return {
    description: 'Design to production HTML/CSS - implement DESIGN.md against the detected project framework',
    category: 'Workflow',
    tags: ['bp', 'design-html', 'html', 'css', 'ui'],
    content: instructions,
  };
}
