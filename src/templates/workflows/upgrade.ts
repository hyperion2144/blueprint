import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

### Parameters
- **\`--scope <scope>\`** — scope: \`change\` (current change only), \`phase\` (all changes in current phase), \`milestone\` (full milestone), \`project\` (everything, default)
- **\`--dry-run\`** — only list mismatches, don't edit files
- **\`--fix\`** — auto-fix mismatches (default when not \`--dry-run\`)

### Prerequisites
- \`bp/roadmap.md\` with milestone/phase definitions
- \`bp/state.md\` with current milestone and phase

## Core Behavior

\`bp:upgrade\` reads the template for each output file type (proposal, design, tasks, etc.), scans unarchived change directories in the current scope, compares each file against its template format and PEG grammar, then adjusts mismatches.

**Template types checked** (use \`bp template <type> --stdout\` to retrieve each):

| File | Template Type | PEG Grammar |
|------|-------------|-------------|
| \`proposal.md\` | proposal | proposal.peggy |
| \`design.md\` | design | design.peggy |
| \`tasks.md\` | tasks | tasks.peggy |
| \`context.md\` | context | context.peggy |
| \`roadmap.md\` | roadmap | roadmap.peggy |
| \`spec-review.md\` | spec-review | spec-review.peggy |
| \`quality-review.md\` | quality-review | quality-review.peggy |
| \`goal-review.md\` | goal-review | goal-review.peggy |
| \`verification.md\` | verification | verification.peggy |
| \`uat.md\` | uat | uat.peggy |
| \`requirements.md\` | requirements | requirements.peggy |

**Output files per change:** \`proposal.md\`, \`design.md\`, \`tasks.md\`, \`context.md\`, \`verification.md\`, \`spec-review.md\`, \`quality-review.md\`, \`goal-review.md\`.

## Steps

### Step 1: Read project state
Run \`bp context\` and read \`bp/state.md\`. Determine current milestone, phase, and active changes.

### Step 2: Build file list by scope
Use the \`read\` tool to list \`bp/milestones/\` directory tree. For each unarchived change (status ≠ archived), collect all output files present.

**Scope rules:**
- \`change\`: only the current active change directory
- \`phase\`: all changes in the current phase's changes/ directory
- \`milestone\`: all phases + changes in the current milestone
- \`project\`: every milestone, phase, and change (default)

**Exclude:** archived changes (check \`changes.md\` or state status), project-level files (\`requirements.md\`, \`roadmap.md\` are checked separately).

### Step 3: Retrieve template per file type
For each file type found in the change directories, run:
\`\`\`bash
bp template <type> --stdout
\`\`\`

Read the output to understand the expected structure: heading format, section layout, placeholder variables, metadata frontmatter, ref patterns, and status markers.

Also read the PEG grammar for each file type (in \`src/core/validate/grammar/<type>.peggy\`) to understand structural validation rules — required sections, item formats (\`PR-{id}\`, \`DS-{id}\`, \`T-{id}\`), source annotation format, refs format.

### Step 4: Compare each file against template + grammar
For each output file:
1. Read the file content
2. Check heading format matches template (section levels, naming)
3. Check structural elements (item prefixes, refs, status markers, checkboxes)
4. Check for stale format patterns (old task-1.3 numbering vs T-1, missing source annotations, etc.)
5. Check PEG grammar compliance (can be parsed by the grammar? If PEG validation exists, use \`bp context validate-changes\` or the CLI's built-in validation)

Maintain a list of all format deltas found.

### Step 5: Apply fixes (unless --dry-run)
For each format delta:
1. Rewrite the file to match the current template/grammar while preserving semantic content (requirement text, task descriptions, design details)
2. Use the \`edit\` tool for surgical changes, or \`write\` for a full rewrite when >70% of content changed
3. Commit each file fix separately:
\`\`\`bash
bp commit "fix(upgrade): align <filename> to current template" --files "<filepath>"
\`\`\`

**Preservation rules:**
- Keep all substantive content (requirement text, acceptance criteria, design decisions, source annotations)
- Update structural elements only (heading levels, section ordering, item numbering, refs format, status markers)
- Do NOT add placeholder content — if a section is semantically empty, leave it empty
- Do NOT introduce speculative content from template examples

### Step 6: Report results
Summarize for each scope level:
- Files checked vs files skipped
- Mismatches found vs fixed
- Any items that could not be auto-fixed (ambiguous format, conflicting content)

## Output
- Updated output files across all unarchived changes
- Git commits per fix with \`fix(upgrade)\` message prefix
- Summary report to the user

## Guardrails
- **Never rewrite unchanged/archived changes** — only touch files in unarchived changes
- **Never overwrite semantic content** — preserve all user-written requirements, descriptions, and decisions
- **One commit per file** — clear audit trail for each format fix
- **Scope wisely** — start with \`--scope change\` or \`--scope phase\` unless the full project upgrade is intentional
- **Dry-run first** — use \`--dry-run\` to preview changes before applying
- **Templates are the source of truth** for format, not vice versa — don't modify templates to match files
`;

export function getUpgradeSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-upgrade',
    description: 'Upgrade project output files — check unarchived files against current templates and PEG grammars, fix format mismatches',
    instructions,
  };
}

export function getUpgradeCommandTemplate(): CommandTemplate {
  return {
    description: 'Upgrade output files — check unarchived files against templates + PEG grammars, auto-fix format mismatches',
    category: 'Utility',
    tags: ['bp', 'upgrade', 'migration', 'format', 'templates'],
    content: instructions,
  };
}
