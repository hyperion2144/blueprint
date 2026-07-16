import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- User has already run \`bp init\`. All project settings are configured.
- \`bp/config.yaml\` exists and is fully configured.

## Steps

### Step 1: Check project type

Read \`bp/config.yaml\` - check the \`brownfield\` field.

**Greenfield (\`brownfield: false\`):**
- Skip to Step 3.

**Brownfield (\`brownfield: true\`):**
Continue to Step 2.

### Step 2: Brownfield scan - extract specs from existing code

Dispatch a **codebase-scanner** sub-agent to analyze the existing codebase and extract behavioral contracts into \`bp/specs/\`.

1. Prepare scanner context:
   - Project root directory path
   - bp/config.yaml path
   - Instruction: "Read the codebase-scanner agent prompt, then scan the source code and write spec files to bp/specs/<domain>/spec.md"

2. Dispatch via task tool:
   - Agent type: codebase-scanner (or default task agent with codebase-scanner prompt injected)
   - Fresh context: yes
   - Isolated: no (scanner is read-only on source code, writes only to bp/specs/)

3. Wait for scanner to complete.

4. Verify output:
   - Check that \`bp/specs/\` has at least 1 domain directory with spec.md
   - Each spec.md has ## Purpose and ## Requirements sections
   - Each requirement uses SHALL/MUST and has at least 1 scenario

### Step 3: Suggest next step

Suggest running \`bp continue\` (which will detect empty roadmap and prompt the user to define one):
\`\`\`
Project initialized. Run \`bp continue\` to check project status and discover next steps.
\`\`\`

\`bp continue\` will detect the empty roadmap and suggest \`bp roadmap\`.


## Guardrails

- NEVER re-ask configuration questions - the init CLI already handled profile, platform, etc.
- NEVER run \`bp init\` or \`bp update\` - user did this already
- Brownfield: dispatch codebase-scanner sub-agent. Do NOT scan code yourself.
- Greenfield: advance immediately, no scanning needed
- ALWAYS suggest \`bp roadmap\` directly, not \`bp continue\`
`;

export function getInitSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-init',
    description: 'Brownfield scan (dispatch codebase-scanner) or greenfield setup, then suggest roadmap',
    instructions,
  };
}

export function getInitCommandTemplate(): CommandTemplate {
  return {
    description: 'Brownfield scan (dispatch codebase-scanner) or greenfield setup, then suggest roadmap',
    category: 'Setup',
    tags: ['bp', 'init', 'brownfield', 'codebase', 'specs'],
    content: instructions,
  };
}
