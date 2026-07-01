import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input
- No prior state required (this is the project entry point)
- Node.js 20+ must be installed

## Steps

### Step 1: Check state and get context
Run \`bp context init\` — outputs JSON with state and file manifest. Read all listed files before proceeding.

### Step 2: Execute initialization
Run \`bp init --yes\` to create the project skeleton:

- \`bp/\` directory structure
- \`bp/project.yml\` — project workflow configuration
- \`bp/state.md\` — state machine file
- \`bp/requirements.md\` — requirements document (template)
- \`bp/conventions/\` — coding conventions directory
- \`.omp/commands/bp-*.md\` — 16 slash commands
- \`.omp/agents/bp-*.md\` — 8 agent definitions
- \`.omp/skills/bp-*/SKILL.md\` — 16 skill guides

### Step 3: Brownfield mode (existing projects)
For projects with existing code, use \`bp init --yes --brownfield\`:

The CLI creates the skeleton. Then run the brownfield analysis.

**You are the orchestrator — dispatch, do not analyze yourself.**

First, get platform-specific dispatch instructions:
\`\`\`bash
bp dispatch codebase-mapper
bp dispatch spec-bootstrapper
\`\`\`

Then dispatch BOTH sub-agents simultaneously — **two separate sub-agent calls in the same response**, one for each agent type. Each sub-agent should use artifact templates (\`bp template codebase-stack\`, \`bp template codebase-architecture\`, etc.) to format outputs:
- **Agent 1: codebase-mapper** — analyze src/, read package.json and tsconfig.json, map architecture, identify conventions and pitfalls. Output: bp/codebase/stack.md, codebase/architecture.md, codebase/pitfalls.md, conventions/codebase-conventions.md.
- **Agent 2: spec-bootstrapper** — scan src/ for core modules and public APIs, extract SHALL/MUST from signatures/JSDoc/tests, annotate confidence levels. Output: bp/specs/<domain>/spec.md with BOOTSTRAPPED marker.

After both complete, verify the output files exist.

### Step 4: Advance
Run \`bp continue\` to proceed to the requirements exploration phase (grill).

## Output

| File | Description |
|------|-------------|
| \`bp/\` directory | Project skeleton |
| \`bp/project.yml\` | Workflow configuration |
| \`bp/state.md\` | State machine |
| \`bp/requirements.md\` | Requirements template |
| \`.omp/commands/*.md\` | Generated slash commands |
| \`.omp/agents/*.md\` | Generated agent definitions |
| \`.omp/skills/*/SKILL.md\` | Generated skill guides |

Brownfield extras: \`codebase/stack.md\`, \`codebase/architecture.md\`, \`codebase/pitfalls.md\`, \`conventions/codebase-conventions.md\`, \`specs/<domain>/spec.md\`.

## Guardrails

- Run \`bp init\` only once per project — re-running overwrites generated files
- Use \`--yes\` to skip interactive prompts in CI/non-interactive environments
- Brownfield mode is read-only analysis — it never modifies source code
- After initialization, fill in \`requirements.md\` before advancing`;

export function getInitSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-init',
    description: 'Initialize bp project structure and generate platform files',
    instructions,
  };
}

export function getInitCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Init',
    description: 'Initialize bp project structure and generate platform files',
    category: 'Setup',
    tags: ['bp', 'init', 'setup'],
    content: instructions,
  };
}
