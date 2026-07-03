import { ORCHESTRATOR_RULE } from '../types.js';
import { RESOLVE_PATHS, READ_CONTEXT, CLASSIFY_CHANGE, CHANGE_NAME_RESOLVE, COMMIT_ADVANCE } from './shared.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `## Input

### Parameters
- **\`<change-name>\`** (required) — the change to plan. Provided by \`bp continue\` output or user.

### Prerequisites
- Change \`proposal.md\` must be confirmed (not template)

## Steps

${RESOLVE_PATHS}${READ_CONTEXT}${CLASSIFY_CHANGE}${CHANGE_NAME_RESOLVE('planning', 'plan')}### Step 3: Execute design

**If LIGHTWEIGHT:**

1. Run \`bp template design\`, fill approach (1-2 paragraphs), write \`design.md\`
2. Run \`bp template tasks\`, list tasks with type annotations, write \`tasks.md\`
3. Skip delta-specs (not needed for non-behavioral changes)
4. **Leave all task boxes UNCHECKED** — apply phase marks them done after implementation
5. Run \`bp continue\`

**If FULL — you MUST dispatch the planner sub-agent. Do NOT write design/tasks/specs yourself:**

1. Run \`bp dispatch planner --change <change-name>\` — outputs the sub-agent tool to call and its parameters.
2. Call the tool it specifies. Set the sub-agent's prompt to:
   - Task: produce design.md, tasks.md (boxes UNCHECKED), specs/<domain>/spec.md
   - <domain> = directory name under bp/specs/ (e.g. cli, core). NOT the phase name. First, run \`ls bp/specs/\` to list existing domains. If this change touches a new domain, create it: \`mkdir -p bp/specs/<new-domain>\`
   - Read: requirements.md, roadmap.md (this phase), research.md, context.md, proposal.md, bp/specs/<domain>/spec.md (global spec for affected domain — domain = directory under bp/specs/), bp/conventions/coding-standards.md, specs/, conventions/
   - Design must reference specific requirements and research decisions — not generic
   - Delta-specs must use \`## ADDED Requirements\` / \`## MODIFIED Requirements\` / \`## REMOVED Requirements\` sections
   - Each delta-spec Requirement must reference the global spec it modifies (if any)
   - Output: design.md, tasks.md, specs/<domain>/spec.md

### Step 4: Verify output
Check produced files:
- \`design.md\` — architecture, data flow, approach
- \`tasks.md\` — type annotations, RED triples, wave grouping; **boxes must be UNCHECKED** (apply marks them)
- \`specs/<domain>/spec.md\` — must have ≥1 non-template SHALL/MUST (reject if all \`<name>\`/\`<behavior>\` placeholders)
- All must_haves from proposal.md covered
- No contradictions with context.md

${COMMIT_ADVANCE('docs', 'plan for <change-name>')}

## Guardrails
- FULL: MUST dispatch planner sub-agent; do NOT write design/tasks/specs yourself
- type:behavior tasks need RED→GREEN→REFACTOR triples
- Delta-specs for behavior, not implementation — skip for LIGHTWEIGHT
- tasks.md stays UNCHECKED after plan — apply marks each done
- Too large to split? Return to split phase`;

export function getPlanSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-plan',
    description: 'Change design — dispatch planner sub-agent for design + tasks + delta-specs',
    instructions,
  };
}

export function getPlanCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Plan',
    description: 'Change design — dispatch planner sub-agent for design + tasks + delta-specs',
    category: 'Planning',
    tags: ['bp', 'plan', 'design', 'tasks', 'specs', 'sub-agent'],
    content: instructions,
  };
}
