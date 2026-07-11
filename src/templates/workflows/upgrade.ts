import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

### Parameters
- **\`--scope <scope>\`** — scope: \`change\` (current change only, default), \`phase\` (all changes in current phase), \`milestone\` (full milestone), \`project\` (everything)
- **\`--dry-run\`** — only list mismatches, don't edit files
- **\`--fix\`** — auto-fix mismatches (default when not \`--dry-run\`)

### Prerequisites
- \`bp/roadmap.md\` with milestone/phase definitions
- \`bp/state.md\` with current milestone and phase

## Core Behavior

\`bp:upgrade\` reads the template for each output file type (proposal, design, tasks, etc.), scans unarchived change directories in the current scope, compares each file against its template format, then adjusts mismatches.

**File types checked** (use \`bp template <type> --stdout\` to retrieve template):

| File | Template Type | Scope |
|------|-------------|-------|
| \`proposal.md\` | proposal | change |
| \`design.md\` | design | change |
| \`tasks.md\` | tasks | change |
| \`context.md\` | context | change |
| \`spec-review.md\` | spec-review | change |
| \`quality-review.md\` | quality-review | change |
| \`goal-review.md\` | goal-review | change |
| \`verification.md\` | verification | change |
| \`uat.md\` | uat | change |
| \`roadmap.md\` | roadmap | project |
| \`requirements.md\` | requirements | project |

> Types without a \`bp template\` entry (e.g. \`review-task.md\`) have no format spec — skip them with a note.
> Project-level files (roadmap.md, requirements.md) are checked once, not per change.

**Output files per change:** \`proposal.md\`, \`design.md\`, \`tasks.md\`, \`context.md\`, \`verification.md\`, \`spec-review.md\`, \`quality-review.md\`, \`goal-review.md\`.

## Steps

### Step 1: Read project state
Run \`bp context\` and read \`bp/state.md\`. Determine current milestone, phase, and active changes.

### Step 2: Build file list by scope
Use the \`read\` tool to list \`bp/milestones/\` directory tree. For each unarchived change (status ≠ archived), collect all output files present.

**Scope rules:**
- \`change\` (default): only the current active change directory
- \`phase\`: all changes in the current phase's changes/ directory
- \`milestone\`: all phases + changes in the current milestone
- \`project\`: every milestone, phase, and change

**Exclude:** archived changes (check \`changes.md\` or state status).

### Step 2b: Collect project-level files
Regardless of scope, also check these project-level files for format compliance:
- \`bp/roadmap.md\` — against roadmap template
- \`bp/requirements.md\` (if exists) — against requirements template

### Step 3: Retrieve template per file type
For each file type found, run:

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
- Status markers (\`[NOT_STARTED|ACTIVE|COMPLETED]\` on roadmap headings)
- Task checkbox format (\`- [ ] T-{id}: [type:xxx] title\`)
- Review format (\`[PASS|FLAG|BLOCKER]\` for review findings)

### Step 4: Compare each file against template
For each output file:
1. **Read** the file content
2. **Heading check** — do section levels and names match the template? (e.g. \`## Design Items\` not \`## Design\`)
3. **Prefix check** — are item IDs using current prefix scheme? (\`T-1\` not \`task-1.3\`, \`DS-\` not \`DES-\`)
4. **Refs check** — are refs using current format? (\`refs: PR-1, DS-1\` not \`references: PR-1\`)
5. **Status markers** — are checklist markers and status tags correct? (\`[PASS|FLAG|BLOCKER]\`, \`- [ ] T-{id}:\`)
6. **Source annotations** — do design items have \`Source: PR-{id} (proposal.md)\`? Do proposal items have \`Source: FR-{id} (bp/requirements.md)\`?

Maintain a list of all format deltas found, organized by file.

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
| Source annotations (already present) | Status markers (checkboxes, [PASS/FLAG]) |
| User-written context and reasoning | Source annotations (add missing Source: lines) |
| Verbatim quoted identifiers and file paths | Section ordering (if template demands a specific order) |

**Do NOT:**
- Add placeholder content (\`{{placeholder}}\`) from templates
- Invent speculative content from template examples
- Remove or rephrase substantive text
- Touch files in archived changes

### Step 6: Handle files with no spec
- If \`bp template <type> --stdout\` fails: skip the file, note it as "no spec"
- If edit keeps producing undesirable results after 3 attempts: stop, flag for manual review
- Files with neither template nor grammar (\`review-task.md\`, \`change-summary.md\`): skip with "no spec"

### Step 7: Report results
Summarize per scope level:
- Files checked vs skipped (with reason)
- Mismatches found vs fixed
- Files flagged for manual review (repeated failure)
- Files skipped due to no spec (no template entry)

## Output
- Updated output files across all unarchived changes
- Git commits per fix with \`fix(upgrade)\` message prefix
- Summary report with per-file status

## Guardrails
- **Default scope is \`change\`** — run without \`--scope\` to only touch the current change. Use \`project\` only when you intend a full upgrade.
- **Never rewrite archived changes** — only touch files in unarchived changes.
- **Never overwrite semantic content** — preserve all user-written requirements, descriptions, and decisions (see exact table in Step 5).
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
