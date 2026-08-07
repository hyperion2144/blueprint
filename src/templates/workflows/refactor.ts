/**
 * refactor workflow template — standalone auxiliary step (like ff / loop).
 *
 * Dual export: getRefactorSkillTemplate() / getRefactorCommandTemplate()
 * share one `instructions` body so every platform generator emits the
 * same orchestrator-facing text.
 */

import { CONTEXT_JSONL_REMINDER } from './shared.js';
import { ORCHESTRATOR_RULE } from '../types.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `${CONTEXT_JSONL_REMINDER}## Input

- **\`$ARGUMENTS\`** (required): target module path (e.g. \`src/core\`) or \`.\` for the whole repository.
- **\`--change <name>\`** (optional): change name passed through to \`bp dispatch refactorer\`.

## Steps

> These are the steps you (orchestrator) execute in order. \`bp refactor\` only outputs these steps — it does not auto-execute.

### Step 1: Run the deterministic analyzer

\`\`\`bash
bp refactor analyze $ARGUMENTS
\`\`\`

The analyzer computes per-module evidence for the four anti-pattern metrics (fragmentation, duplication, flatness, low reuse), writes \`bp/.refactor-report.md\`, and prints a one-line stdout summary. Do NOT replace the analyzer with your own judgment — the report is the only source of evidence.

### Step 2: Show the report and obtain explicit human confirmation

Display \`bp/.refactor-report.md\` to the user and pause for an explicit answer before any dispatch:

- \`yes\` — proceed with all affected modules
- \`no\` — stop the refactor flow
- \`scope: <reduced target>\` — restrict dispatch to the listed modules

Do NOT edit any code before the human confirms.

### Step 3: Dispatch the refactorer per affected module

For each module listed in the report, dispatch one isolated sub-agent:

\`\`\`bash
bp dispatch refactorer --target <module>
\`\`\`

One dispatch per module — the refactorer handles exactly one module and returns control to you.

### Step 4: Refactorer applies behavior-preserving consolidation + spec sync

Each refactorer sub-agent consolidates its assigned module toward deep modules while preserving observable behavior (the test suite stays green), and syncs only the spec files whose contracts reference the changed module.

### Step 5: Summarize the diff

After all dispatches complete, print \`git diff --stat\` plus the list of changed spec files, then return to the user.

## Output

- The analyzer artifact \`bp/.refactor-report.md\` written by Step 1.
- The refactorer's per-module diff summaries and spec-sync list from Steps 4-5.
- A final \`git diff --stat\` summary printed by Step 5.

## Guardrails

- NEVER create change-lifecycle artifacts — refactor is a standalone auxiliary step, not a change proposal.
- NEVER run the plan, apply, review, or archive commands as part of this step.
- NEVER edit code before the human explicitly confirms the report (Step 2).
- NEVER re-judge the metrics — the deterministic analyzer report is the only source of evidence.
- Dispatch exactly ONE module per refactorer call; do not batch modules.
- Spec sync stays inside the affected domains listed in the report.
`;

export function getRefactorSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-refactor',
    description: 'Run deterministic refactor analyzer and dispatch refactorer sub-agents per module',
    instructions,
  };
}

export function getRefactorCommandTemplate(): CommandTemplate {
  return {
    description: 'Run deterministic refactor analyzer and dispatch refactorer sub-agents per module',
    category: 'Workflow',
    tags: ['bp', 'refactor', 'analyzer', 'refactorer', 'consolidation'],
    content: instructions,
  };
}
