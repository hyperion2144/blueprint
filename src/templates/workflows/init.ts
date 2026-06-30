import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input
- No prior state required (this is the project entry point)
- Node.js 20+ must be installed

## Steps

### Step 1: Check state and get context
Run \`specwf context init\` — outputs JSON with state and file manifest. Read all listed files before proceeding.

### Step 2: Execute initialization
Run \`specwf init --yes\` to create the project skeleton:

- \`specwf/\` directory structure
- \`specwf/project.yml\` — project workflow configuration
- \`specwf/state.md\` — state machine file
- \`specwf/requirements.md\` — requirements document (template)
- \`specwf/conventions/\` — coding conventions directory
- \`.omp/commands/specwf-*.md\` — 16 slash commands
- \`.omp/agents/specwf-*.md\` — 8 agent definitions
- \`.omp/skills/specwf-*/SKILL.md\` — 16 skill guides

### Step 3: Brownfield mode (existing projects)
For projects with existing code, use \`specwf init --yes --brownfield\`:

The CLI creates the skeleton and outputs a reminder to run brownfield analysis.

**You are the orchestrator — dispatch, do not analyze yourself.** Dispatch two sub-agents in parallel using platform-specific dispatch:

\`\`\`bash
specwf dispatch codebase-mapper       # analyzes tech stack, architecture, conventions, pitfalls
specwf dispatch spec-bootstrapper     # extracts behavioral contracts from code
\`\`\`

Construct each sub-agent prompt:
- **codebase-mapper**: analyze src/, read package.json and tsconfig.json, map architecture, identify conventions and pitfalls. Output to specwf/codebase/stack.md, codebase/architecture.md, codebase/pitfalls.md, conventions/codebase-conventions.md.
- **spec-bootstrapper**: scan src/ for core modules and public APIs, extract SHALL/MUST from signatures/JSDoc/tests, annotate confidence levels. Output to specwf/specs/<domain>/spec.md with BOOTSTRAPPED marker.

After both complete, verify the output files exist.

### Step 4: Advance
Run \`specwf continue\` to proceed to the requirements exploration phase (grill).

## Output

| File | Description |
|------|-------------|
| \`specwf/\` directory | Project skeleton |
| \`specwf/project.yml\` | Workflow configuration |
| \`specwf/state.md\` | State machine |
| \`specwf/requirements.md\` | Requirements template |
| \`.omp/commands/*.md\` | Generated slash commands |
| \`.omp/agents/*.md\` | Generated agent definitions |
| \`.omp/skills/*/SKILL.md\` | Generated skill guides |

Brownfield extras: \`codebase/stack.md\`, \`codebase/architecture.md\`, \`codebase/pitfalls.md\`, \`conventions/codebase-conventions.md\`, \`specs/<domain>/spec.md\`.

## Guardrails

- Run \`specwf init\` only once per project — re-running overwrites generated files
- Use \`--yes\` to skip interactive prompts in CI/non-interactive environments
- Brownfield mode is read-only analysis — it never modifies source code
- After initialization, fill in \`requirements.md\` before advancing`;

export function getInitSkillTemplate(): SkillTemplate {
  return {
    name: 'specwf-init',
    description: 'Initialize specwf project structure and generate platform files',
    instructions,
  };
}

export function getInitCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Init',
    description: 'Initialize specwf project structure and generate platform files',
    category: 'Setup',
    tags: ['specwf', 'init', 'setup'],
    content: instructions,
  };
}
