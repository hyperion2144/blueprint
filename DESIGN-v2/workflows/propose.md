# Workflow: propose

<!--
  Orchestrator instructions for `bp propose <name>`.
  This command creates a change folder and fills in proposal.md.
  The orchestrator (main agent) does this directly - no sub-agent needed.
-->

## Input

- `$ARGUMENTS` (required): change name (kebab-case)
- `--phase <milestone>/<phase>` (optional): reference a roadmap phase
- `--adhoc` (optional): mark as adhoc change (no phase reference)

## Steps

### Step 1: Create change directory

```bash
mkdir -p bp/changes/$1
```

If `--phase` is provided, note the milestone/phase for the proposal's Roadmap Reference section.

### Step 2: Generate proposal

Get the proposal template and fill it:

1. Run `bp template proposal --stdout` to get the template
2. Fill in each section based on conversation context:
   - **Intent**: What problem does this solve? Why now?
   - **Scope**: What's in and out? Be explicit about boundaries.
   - **Approach**: High-level method (not technical details)
   - **Deliverables**: Observable, verifiable capabilities (PR-N)
   - **Roadmap Reference**: If --phase provided, fill in milestone/phase

3. Write to `bp/changes/$1/proposal.md`

### Step 3: Verify proposal quality

Before finishing, check:
- [ ] Intent explains the problem (not just the solution)
- [ ] Scope has both In Scope and Out of Scope sections
- [ ] Each deliverable (PR-N) has a SHALL statement and Verify method
- [ ] No `{{` template placeholders remaining
- [ ] PR count ≤ 5 (if more, suggest splitting)

### Step 4: Commit and suggest next step

```bash
git add bp/changes/$1/proposal.md
git commit -m "docs(proposal): $1"
```

Output:
```
✓ Created bp/changes/$1/proposal.md
  Proposal is ready for planning.

  Next: bp plan $1
  (or: bp continue $1)
```

## Guardrails

- Do NOT create design.md, tasks.md, or specs/ - that's the planner's job
- Do NOT run `bp plan` automatically - let the user review the proposal first
- If the user wants to skip proposal review and go straight to planning, they can run `bp plan $1` directly
