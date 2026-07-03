import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input
- No prior state required (user has already run \`bp init\`)
- \`bp/state.md\` and \`bp/project.yml\` must exist

## Steps

### Step 1: Read current config
Run \`bp config list\` — outputs the full project configuration as JSON. Read it to understand what's already set.

### Step 2: Configure project
Use the \`ask\` tool to guide the user through key settings. For each confirmed choice, run \`bp config set <key> <value>\` — never edit \`bp/project.yml\` directly.

**Configure in this order:**

1. **Workflow profile** — run \`bp config list\`, check \`profile\` field. If not set or user wants to change:
   \`\`\`
   "Which workflow strictness level?"
   - standard (recommended): TDD enforced, triple review mandatory
   - lite: skip TDD verification for non-behavioral changes
   - strict: extra validation gates enabled
   \`\`\`
   Run \`bp config set profile <choice>\`.

2. **Spec stack** — check \`spec.stack\` field in config output. If \`generic\`:
   \`\`\`
   "Which tech stack best describes this project?"
   - TypeScript CLI / React Web App / Python API / Rust CLI / Go Service / Generic
   \`\`\`
   Run \`bp config set spec.stack <choice-id>\`.

3. **Release template** — check \`release.template\`:
   \`\`\`
   "Which PR/release body template?"
   - standard (recommended): Summary + Changes + Verification
   - detailed: + User Stories + Key Decisions + Risks
   - minimal: Summary + Changes only
   \`\`\`
   Run \`bp config set release.template <choice>\`.

4. **Brownfield scan** — run \`bp config list\`, check if project has existing code (package.json, src/, etc.):
   - If brownfield: "This looks like an existing project. I'll run a quick scan to detect the tech stack and set up specs."
     Run \\\`bp config set conventions.inject true\\\` to enable spec injection.
   - The scan results are in \`bp/codebase/\`. Dispatch \`bp-codebase-mapper\` and \`bp-spec-bootstrapper\` sub-agents to analyze the codebase and extract initial specs.

### Step 3: Review final config
Run \`bp config list\` again. Show the user a summary of key settings. Ask: "Everything look good?"
- If yes → advance
- If no → go back to Step 2

### Step 4: Advance
Run \`bp continue\`. The output tells you what to do next.

## Guardrails
- NEVER edit \`bp/project.yml\` directly — always use \`bp config set <key> <value>\`
- Use \`bp config list\` to read current state before making changes
- Skip prompts the user has already answered (check existing config values)
- If \`bp continue\` outputs grill steps, follow them without preamble`;

export function getInitSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-init',
    description: 'Project configuration — detect tech stack, set workflow profile, configure conventions',
    instructions,
  };
}

export function getInitCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Init',
    description: 'Project configuration — detect tech stack, set workflow profile, configure conventions',
    category: 'Setup',
    tags: ['bp', 'init', 'setup', 'config'],
    content: instructions,
  };
}
