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

The CLI creates the skeleton and outputs: "请派发 specwf-codebase-mapper 和 specwf-spec-bootstrapper 子代理完成完整分析。"

**You are the orchestrator — dispatch, do not analyze yourself.** Use the \`task\` tool to spawn two sub-agents in parallel:

\`\`\`text
Task 1:
  agent: specwf-codebase-mapper
  cwd: <project-root>
  prompt: |
    Analyze the codebase at <project-root>/src/.
    Read package.json, tsconfig.json for tech stack.
    Map directory structure for architecture patterns.
    Identify coding conventions and potential pitfalls.
    Output to specwf/codebase/stack.md, codebase/architecture.md,
    codebase/pitfalls.md, and conventions/codebase-conventions.md.

Task 2:
  agent: specwf-spec-bootstrapper
  cwd: <project-root>
  prompt: |
    Scan <project-root>/src/ for core modules and public APIs.
    Extract behavioral contracts from signatures, JSDoc, and tests.
    Write SHALL/MUST specs to specwf/specs/<domain>/spec.md.
    Annotate all entries as BOOTSTRAPPED with confidence levels.
\`\`\`

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
