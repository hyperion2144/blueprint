# Workflow: plan

<!--
  Orchestrator instructions for `bp plan [name]`.
  This command dispatches the planner sub-agent to produce design.md, tasks.md, and delta specs.
  The orchestrator does NOT write these files - the planner does.
-->

## Input

- `$ARGUMENTS` (optional): change name. If empty, use the most recently proposed change.
- `--fix` (optional): fix mode - planner reads review.md D-issues and redesigns.

## Prerequisites

- `proposal.md` exists in the change directory and is not a template (no `{{` placeholders)

## Steps

### Step 1: Resolve change name and paths

If `$ARGUMENTS` is empty:
- List `bp/changes/` for active changes (not in `archive/`)
- If multiple exist, ask the user which one
- If none exist, suggest `bp propose <name>` first

Change directory: `bp/changes/$1/`

### Step 2: Classify change (lightweight vs full)

Read `proposal.md` deliverables:
- **Lightweight**: All deliverables are config/docs/refactor/scaffolding (no new behavior)
- **Full**: Any deliverable introduces new behavior

### Step 3: Dispatch planner (Full mode)

**If FULL: dispatch planner sub-agent. Do NOT write design/tasks/specs yourself.**

1. Prepare planner context:
   - Change name and directory path
   - List of files to read: proposal.md, bp/specs/<domain>/spec.md (per affected domain), bp/conventions/coding.md, bp/config.yaml
   - Instruction: "Read the planner agent prompt, then produce design.md, tasks.md, and specs/<domain>/spec.md"
   - In --fix mode: also include review.md, focus on D-prefixed issues

2. Dispatch via task tool:
   - Agent type: planner (or default task agent with planner prompt injected)
   - Fresh context: yes
   - Isolated: no (planner only writes design/tasks/specs to change directory, no source code conflicts; needs to read real codebase)

3. Wait for planner to complete.

**If LIGHTWEIGHT: orchestrator produces artifacts directly.**

1. Run `bp template design --stdout`, fill design.md (simplified - may skip architecture diagram if trivial)
2. Run `bp template tasks --stdout`, fill tasks.md (likely 1 wave, no behavior tasks)
3. Skip delta specs if no behavioral change
4. Write files to change directory

### Step 4: Verify planner output

After planner completes, verify:

**Traceability:**
- [ ] Every PR-N in proposal.md is referenced by at least one DS-N in design.md
- [ ] Every DS-N in design.md is referenced by at least one T-N in tasks.md
- [ ] Every type:behavior task has a `spec_ref` pointing to a delta spec

**Completeness:**
- [ ] design.md has: Design Items, Architecture Decisions, Technical Approach, File Manifest
- [ ] tasks.md has: TDD Type Annotations, at least 1 Wave, Pre-Archive Checklist
- [ ] Delta specs exist for each affected domain (specs/<domain>/spec.md)
- [ ] Delta specs have correct sections (ADDED/MODIFIED/REMOVED)
- [ ] File manifest lists every file (no "etc.")

**Quality:**
- [ ] No `{{` template placeholders remaining in any file
- [ ] DS-N components have clear single responsibility
- [ ] D-N decisions have real alternatives
- [ ] type:behavior tasks have RED descriptions (GIVEN/WHEN/THEN)
- [ ] Requirements use SHALL/MUST/SHOULD correctly
- [ ] Each requirement has at least 1 scenario

If any check fails: re-dispatch planner with specific feedback on what's missing.

### Step 5: Commit and suggest next step

```bash
git add bp/changes/$1/
git commit -m "docs(plan): design + tasks + delta specs for $1"
```

Output:
```
✓ Planner completed for $1
  - design.md: {{N}} design items, {{N}} decisions
  - tasks.md: {{N}} tasks in {{N}} wave(s)
  - specs/: {{N}} delta spec(s)

  Next: bp apply $1
  (or: bp continue $1)
```

## Guardrails

- **Full mode: MUST dispatch sub-agent.** Do NOT write design/tasks/specs yourself.
- **Lightweight mode: orchestrator writes directly.** No sub-agent needed.
- Do NOT check boxes in tasks.md (`- [ ]` must remain unchecked)
- Do NOT run `bp apply` automatically - let the user review the plan first
- In --fix mode: planner modifies existing design.md and tasks.md, does NOT create new files
