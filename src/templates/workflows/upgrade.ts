import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

### Parameters
- **\`--scope <scope>\`** — scope: \`change\` (current change only, default), \`phase\` (current phase + its changes), \`milestone\` (full milestone), \`project\` (everything)
- **\`--dry-run\`** — only list mismatches, don't edit files
- **\`--fix\`** — auto-fix mismatches (default when not \`--dry-run\`)

### Prerequisites
- \`bp/roadmap.md\` with milestone/phase definitions
- \`bp/state.md\` with current milestone and phase

## Core Behavior

\`bp:upgrade\` reads the template for each output file type (proposal, design, tasks, etc.), scans output files at all levels covered by the scope, compares each file against its template format, then adjusts mismatches.

**File types checked** (use \`bp template <type> --stdout\` to retrieve template):

| File | Template Type | Level |
|------|-------------|-------|
| \`proposal.md\` | proposal | change |
| \`design.md\` | design | change |
| \`tasks.md\` | tasks | change |
| \`verification.md\` | verification | change |
| \`spec-review.md\` | spec-review | change |
| \`quality-review.md\` | quality-review | change |
| \`goal-review.md\` | goal-review | change |
| \`uat.md\` | uat | change |
| \`context.md\` | context | phase |
| \`research.md\` | research | phase |
| \`summary.md\` | summary | phase |
| \`phase-research.md\` | phase-research | phase |
| \`change-summary.md\` | change-summary | phase |
| \`roadmap.md\` | roadmap | project |
| \`requirements.md\` | requirements | project |
| \`research/stack.md\` | research-stack | project |
| \`research/architecture.md\` | research-architecture | project |
| \`research/pitfalls.md\` | research-pitfalls | project |
| \`loop.md\` | loop.md | project |
| \`codebase/stack.md\` | codebase-stack | project |
| \`codebase/architecture.md\` | codebase-architecture | project |
| \`codebase/structure.md\` | codebase-structure | project |
| \`codebase/conventions.md\` | codebase-conventions | project |
| \`codebase/testing.md\` | codebase-testing | project |
| \`codebase/integrations.md\` | codebase-integrations | project |
| \`codebase/concerns.md\` | codebase-concerns | project |

> Types without a \`bp template\` entry (e.g. \`review-task.md\`) have no format spec — skip them with a note.

### Scope → Level mapping

When \`--scope\` is set, include files from these levels:

| Scope | Change-level | Phase-level | Project-level |
|-------|-------------|-------------|---------------|
| \`change\` (default) | only current change | — | — |
| \`phase\` | all changes in current phase | current phase | — |
| \`milestone\` | all changes in milestone | all phases in milestone | — |
| \`project\` | all unarchived changes | all non-empty phases | always |

## Steps

### Step 1: Read project state
Run \`bp context\` and read \`bp/state.md\`. Determine current milestone, phase, and active changes.

### Step 2: Build file list by scope
Based on the scope, list the directories and collect output files.

**Level directories:**

| Level | Directory pattern |
|-------|------------------|
| change | \`bp/milestones/{milestone}/phases/{phase}/changes/{change}/\` |
| phase | \`bp/milestones/{milestone}/phases/{phase}/\` |
| project | \`bp/\` |

**Scope rules:**
- \`change\`: read files only from the current change directory
- \`phase\`: read files from the current phase directory AND all its change subdirectories
- \`milestone\`: read files from ALL phases in the current milestone (phase dirs + their change dirs)
- \`project\`: read files from \`bp/\` (project root), ALL milestone phase dirs, and all change dirs

**Exclude:** archived changes (check \`changes.md\` or state status).

For each level directory in scope, check if the expected output files exist (use the table above to know which files belong to which level). Collect only files that are present.

### Step 3: Retrieve template per file type
For each unique file type found, run:

\`\`\`bash
bp template <type> --stdout
\`\`\`

**If \`bp template\` fails** (type not registered): skip this file type. There is no format spec to compare against.

Read the template output to understand the expected structure:
- Heading format (section levels, naming conventions)
- Section layout and ordering
- Item prefixes (\`PR-{id}\`, \`DS-{id}\`, \`T-{id}\`, \`UC-{id}\`, etc.)
- Source annotation format (\`Source: FR-{id} (bp/requirements.md)\`)
- Refs format (\`refs: PR-{id}\`, \`refs: DS-{id}\`)
- Status markers (\`[NOT_STARTED|ACTIVE|COMPLETED]\` on roadmap headings, \`[PASS|FLAG|BLOCKER]\` on reviews)
- Task checkbox format (\`- [ ] T-{id}: [type:xxx] title\`)
- Bullet format for design items, table format for change-summary, etc.

### Step 4: Compare each file against template
For each output file:
1. **Read** the file content
2. **Heading check** — do section levels and names match the template? (e.g. \`## Design Items\` not \`## Design\`)
3. **Prefix check** — are item IDs using current prefix scheme? (\`T-1\` not \`task-1.3\`, \`DS-\` not \`DES-\`)
4. **Refs check** — are refs using current format? (\`refs: PR-1, DS-1\` not \`references: PR-1\`)
5. **Status markers** — are checklist markers and status tags correct? (\`[PASS|FLAG|BLOCKER]\`, \`- [ ] T-{id}:\`)
6. **Source annotations** — do design items have \`Source: PR-{id} (proposal.md)\`? Do proposal items have \`Source: FR-{id} (bp/requirements.md)\`?

Maintain a list of all format deltas found, organized by file and level (change / phase / project).

### Step 5: Apply fixes (unless --dry-run)
For each format delta:
1. **Edit** the file to match the current template while preserving semantic content
2. Use the \`edit\` tool for surgical changes (heading level, prefix rename, ref format fix), or \`write\` for a full rewrite when >70% of content changed
3. Commit each file fix separately:
\`\`\`bash
bp commit "fix(upgrade): align <filename> to current template" --files "<filepath>"
\`\`\`

**Preservation rules (exact):**
| Preserve | Update |
|----------|--------|
| Requirement text (FR/NFR descriptions, acceptance criteria) | Section headings (levels, naming) |
| Task descriptions, spec_ref, acceptance | Item ID prefixes (PR- → PR-, task- → T-) |
| Design decisions, file manifests, architecture notes | Refs format (\`refs: PR-1\` style) |
| Context text, research findings, design preview content | Status markers (checkboxes, [PASS/FLAG]) |
| Source annotations (already present) | Source annotations (add missing Source: lines) |
| User-written reasoning and decisions | Section ordering (if template demands a specific order) |

**Do NOT:**
- Add placeholder content (\`{{placeholder}}\`) from templates
- Invent speculative content from template examples
- Remove or rephrase substantive text
- Touch files in archived changes

### Step 6: Handle files with no spec
- If \`bp template <type> --stdout\` fails: skip the file, note it as "no spec"
- If edit keeps producing undesirable results after 3 attempts: stop, flag for manual review
- Files with no template entry (\`review-task.md\`): skip with "no spec"

### Step 7: Report results
Summarize per level, showing for each:
- Files checked vs skipped (with reason)
- Mismatches found vs fixed
- Files flagged for manual review (repeated failure)
- Files skipped due to no spec (no template entry)

## Output
- Updated output files across all levels in scope
- Git commits per fix with \`fix(upgrade)\` message prefix
- Summary report grouped by level (change / phase / project)

## Guardrails
- **Default scope is \`change\`** — run without \`--scope\` to only touch the current change's files. Use broader scopes deliberately.
- **Never rewrite archived changes** — only touch files in unarchived changes and their parent phases.
- **Never overwrite semantic content** — preserve all user-written content (see exact table in Step 5).
- **One commit per file** — clear audit trail for each format fix.
- **Dry-run first** — use \`--dry-run\` to preview changes before applying.
- **Templates are the source of truth** for format — don't modify templates to match files.`;

export function getUpgradeSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-upgrade',
    description: 'Upgrade project output files — check unarchived files against current templates, fix format mismatches',
    instructions,
  };
}

export function getUpgradeCommandTemplate(): CommandTemplate {
  return {
    description: 'Upgrade output files — check unarchived files against templates, auto-fix format mismatches',
    category: 'Utility',
    tags: ['bp', 'upgrade', 'migration', 'format', 'templates'],
    content: instructions,
  };
}
