import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- \`bp init\` was already run; all project settings are configured.
- \`bp/config.yaml\` exists and is fully configured.

## Steps

## Orchestrator Steps

> These are the steps you (orchestrator) execute in order. \`bp init\` only outputs these steps — it does not auto-execute.

### Step 1: Check project type

Read \`bp/config.yaml\` \`brownfield\` field.
- **Greenfield** (\`brownfield: false\`): continue to Step 2.
- **Brownfield** (\`brownfield: true\`): skip to Step 3.

### Step 2: Write coding conventions (greenfield)

If \`bp/conventions/coding.md\` is empty or only a template header, fill it in from the tech stack in \`bp/config.yaml\` and the project's config files. Cover: naming (kebab-case files, camelCase functions, PascalCase types, UPPER_SNAKE_CASE constants), code style, imports, error handling, testing, and types. Derive conventions from existing config — do not ask the user.

### Step 3: Brownfield scan (brownfield only)

Dispatch a **codebase-scanner** sub-agent to extract behavioral contracts into \`bp/specs/\`.

1. Prepare context: project root path, bp/config.yaml path, and the instruction "Read the codebase-scanner agent prompt, then scan the source code and write spec files to bp/specs/<domain>/spec.md".
2. Dispatch via task tool with fresh context (not isolated — the scanner writes only to bp/specs/).
3. Wait for completion.
4. Verify: \`bp/specs/\` has at least one domain spec.md with \`## Purpose\` and \`## Requirements\`; every requirement uses SHALL/MUST and has at least one scenario.

### Step 4: Verify coding conventions and codebase map

- Check \`bp/conventions/coding.md\` has real content (not just the template header).
- Ensure \`bp/.codebase-map.json\` exists (run \`bp map refresh\` if missing).

### Step 5: Suggest next step

\`\`\`
Project initialized. Run \`bp continue\` to check project status and discover next steps.
\`\`\`

## Output

- \`bp/conventions/coding.md\` written (greenfield).
- \`bp/specs/<domain>/spec.md\` contracts extracted (brownfield).
- \`bp/.codebase-map.json\` present.

## Guardrails

- NEVER re-ask configuration questions — the init CLI already handled profile, platform, etc.
- NEVER run \`bp init\` or \`bp update\` — the user already ran them.
- Brownfield: dispatch the codebase-scanner sub-agent; do NOT scan code yourself.
- Greenfield: write coding conventions into bp/conventions/coding.md and verify specs exist.
- ALWAYS suggest \`bp continue\`.
`;

export function getInitSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-init',
    description: 'Write coding conventions, brownfield scan, verify specs, then suggest bp continue',
    instructions,
  };
}

export function getInitCommandTemplate(): CommandTemplate {
  return {
    description: 'Write coding conventions, brownfield scan, verify specs, then suggest bp continue',
    category: 'Setup',
    tags: ['bp', 'init', 'brownfield', 'codebase', 'specs', 'conventions'],
    content: instructions,
  };
}
