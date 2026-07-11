import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

### Parameters
- **\`--scope <scope>\`** — scope: \`change\` (current change only, default), \`phase\` (all changes in current phase), \`milestone\` (full milestone), \`project\` (everything)
- **\`--dry-run\`** — only list mismatches, don't edit files
- **\`--fix\`** — auto-fix mismatches (default when not \`--dry-run\`)

### Prerequisites
- \`bp/roadmap.md\` with milestone/phase definitions
- \`bp/state.md\` with current milestone and phase
- PEG grammars in \`src/core/validate/grammar/<type>.peggy\`

## Core Behavior

\`bp:upgrade\` reads the template for each output file type (proposal, design, tasks, etc.), scans unarchived change directories in the current scope, compares each file against its template format and PEG grammar, then adjusts mismatches.

**File types checked** (use \`bp template <type> --stdout\` to retrieve template; PEG grammar at \`src/core/validate/grammar/<type>.peggy\`):

| File | Template Type | PEG Grammar | Scope |
|------|-------------|-------------|-------|
| \`proposal.md\` | proposal | proposal.peggy | change |
| \`design.md\` | design | design.peggy | change |
| \`tasks.md\` | tasks | tasks.peggy | change |
| \`context.md\` | context | context.peggy | change |
| \`spec-review.md\` | spec-review | spec-review.peggy | change |
| \`quality-review.md\` | quality-review | quality-review.peggy | change |
| \`goal-review.md\` | goal-review | goal-review.peggy | change |
| \`verification.md\` | verification | verification.peggy | change |
| \`uat.md\` | uat | uat.peggy | change |
| \`review-task.md\` | (no template) | review-task.peggy | change |
| \`roadmap.md\` | roadmap | roadmap.peggy | project |
| \`requirements.md\` | requirements | requirements.peggy | project |

> \`review-task.md\` has a PEG grammar but no \`bp template\` entry — check it against the grammar directly.
> Project-level files (roadmap.md, requirements.md) are checked once, not per change.

**Output files per change:** \`proposal.md\`, \`design.md\`, \`tasks.md\`, \`context.md\`, \`verification.md\`, \`spec-review.md\`, \`quality-review.md\`, \`goal-review.md\`, \`review-task.md\`.

## Steps

### Step 1: Read project state
Run \`bp context\` and read \`bp/state.md\`. Determine current milestone, phase, and active changes.

### Step 2: Build file list by scope (change-level)
Use the \`read\` tool to list \`bp/milestones/\` directory tree. For each unarchived change (status ≠ archived), collect all output files present.

**Scope rules:**
- \`change\` (default): only the current active change directory
- \`phase\`: all changes in the current phase's changes/ directory
- \`milestone\`: all phases + changes in the current milestone
- \`project\`: every milestone, phase, and change

**Exclude:** archived changes (check \`changes.md\` or state status).

### Step 2b: Collect project-level files
Regardless of scope, also check these project-level files for format compliance:
- \`bp/roadmap.md\` — against roadmap template + roadmap.peggy
- \`bp/requirements.md\` (if exists) — against requirements template + requirements.peggy

### Step 3: Retrieve template per file type
For each file type found, retrieve its format spec:

\`\`\`bash
bp template <type> --stdout
\`\`\`

**Fallback:** If \`bp template <type> --stdout\` fails (no template registered), skip the template comparison but still check against the PEG grammar (if the .peggy file exists at \`src/core/validate/grammar/<type>.peggy\`). For types with only PEG grammar (\`review-task.md\`), this is expected — just use the grammar.

Read the output to understand the expected structure:
- Heading format (section levels, naming conventions)
- Section layout and ordering
- Item prefixes (\`PR-{id}\`, \`DS-{id}\`, \`T-{id}\`, \`UC-{id}\`, etc.)
- Source annotation format (\`Source: FR-{id} (bp/requirements.md)\`)
- Refs format (\`refs: PR-{id}\`, \`refs: DS-{id}\`)
- Status markers (\`[NOT_STARTED|ACTIVE|COMPLETED]\` on roadmap headers)
- Task checkbox format (\`- [ ] T-{id}: [type:xxx] title\`)
- Review format (\`[PASS|FLAG|BLOCKER]\` for review findings)

Also read the PEG grammar at \`src/core/validate/grammar/<type>.peggy\` to understand structural validation rules — required section markers (\`"## Design Items"\`, \`"## Deliverables"\`), item structure, and any constraints the template alone doesn't capture.

### Step 4: Compare each file against template + grammar
For each output file:
1. **Read** the file content
2. **Heading check** — do section levels and names match the template? (e.g. \`## Design Items\` not \`## Design\`)
3. **Prefix check** — are item IDs using current prefix scheme? (\`T-1\` not \`task-1.3\`, \`DS-\` not \`DES-\`)
4. **Refs check** — are refs using current format? (\`refs: PR-1, DS-1\` not \`references: PR-1\`)
5. **Status markers** — are checklist markers and status tags correct? (\`[PASS|FLAG|BLOCKER]\`, \`- [ ] T-{id}:\`)
6. **Source annotations** — do design items have \`Source: PR-{id} (proposal.md)\`? Do proposal items have \`Source: FR-{id} (bp/requirements.md)\`?
7. **PEG parse check** — try to parse the content with the PEG grammar. If it fails, the file has structural errors. Note the parse error line/column to identify what to fix.

Maintain a list of all format deltas found, organized by file.

### Step 5: Apply fixes (unless --dry-run)
For each format delta:
1. **Edit** the file to match the current template/grammar while preserving semantic content
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

### Step 5b: Re-verify PEG compliance
After each file is fixed, re-parse it with the PEG grammar to confirm it now passes:

\`\`\`bash
node -e "const p = require('src/core/validate/grammar/<type>.cjs'); p.parse(content)"
\`\`\`

If the PEG parse still fails, identify the remaining structural issue and fix it before committing. Repeat until the file passes PEG parsing and all checklist items are resolved. Only proceed to the next file once the current file is confirmed valid.

### Step 6: Handle failures gracefully
- If \`bp template <type> --stdout\` fails (unknown type) AND there is no .peggy file for the type: skip the file, note it in the report
- If PEG grammar parsing the fixed file keeps failing after 3 attempts: stop fixing, flag it in the report for manual review
- If a file has no corresponding template or grammar (e.g. \`change-summary.md\`): skip it, note it as "no spec"

### Step 7: Report results
Summarize per scope level:
- Files checked vs skipped (with reason)
- Mismatches found vs fixed
- Files confirmed PEG-compliant after fix
- Files flagged for manual review (repeated failure)
- Files skipped due to no spec (no template or grammar)

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
- **Re-verify after fix** — run PEG parse to confirm the fix works. Never commit a file that fails PEG validation.
- **Templates are the source of truth** for format, not vice versa — don't modify templates to match files.`;

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
