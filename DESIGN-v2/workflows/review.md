# Workflow: review

<!--
  Orchestrator instructions for `bp review [name]`.
  This command dispatches the reviewer sub-agent to perform triple review.
  The orchestrator does NOT write review.md - the reviewer does.
-->

## Input

- `$ARGUMENTS` (optional): change name. If empty, use the most recently applied change.
- `--fix` (optional): re-review mode - reviewer marks resolved issues in existing review.md.

## Prerequisites

- Code is implemented (tasks.md has `[x]` entries with commit hashes)
- `tsc --noEmit` and `vitest run` pass (run these BEFORE dispatching reviewer)
- In --fix mode: `review.md` exists with unresolved issues, fixes have been applied

## Steps

### Step 1: Resolve change name and paths

Same as plan workflow Step 1.

### Step 2: Pre-review verification

Run before dispatching reviewer:
```bash
tsc --noEmit
npx vitest run
```

If either fails: do NOT dispatch reviewer. Report the failures and suggest `bp apply --fix` to fix them first.

### Step 3: Classify change (lightweight vs full)

- **Lightweight** (all non-behavior tasks, no delta specs): orchestrator does a quick review directly
  - Check: all tasks `[x]`, tests pass, no obvious issues
  - Write a simplified review.md (may skip spec review if no delta specs)
- **Full** (any behavior task, has delta specs): dispatch reviewer sub-agent

### Step 4: Dispatch reviewer (Full mode)

**Do NOT write review.md yourself. Dispatch reviewer sub-agent.**

1. Prepare reviewer context:
   - Change name and directory path
   - List of files to read: proposal.md, design.md, tasks.md, specs/<domain>/spec.md, bp/specs/<domain>/spec.md, bp/conventions/coding.md
   - Instruction: "Read the reviewer agent prompt, then perform triple review and write review.md"
   - In --fix mode: "Read existing review.md, mark resolved issues [x], add new findings if any"

2. Dispatch via task tool:
   - Agent type: reviewer (or default task agent with reviewer prompt injected)
   - Fresh context: yes
   - Isolated: no (reviewer is read-only on source code, writes only review.md; needs to see real implemented code)

3. Wait for reviewer to complete.

### Step 5: Read review.md and route

After reviewer completes:

1. Read `bp/changes/$1/review.md`
2. Extract the Overall Verdict and Issues list
3. Route based on findings:

**If Overall Verdict is PASS (zero issues):**
```
✓ Review PASSED for $1
  All three dimensions clean.

  Next: bp archive $1
```

**If D-prefixed issues exist (design flaw):**
```
✗ Review FAILED for $1
  D issues found (design/architecture problems):
  - D1: {{description}}
  - D2: {{description}}

  These require redesign, not code fix.
  Next: bp plan --fix $1
```

**If only R/Q/G issues (code fixable):**
```
△ Review NEEDS_REVISION for $1
  Issues found (code fixable):
  - R1: {{description}}
  - Q1: {{description}}
  - G1: {{description}}

  Next: bp apply --fix $1
```

### Step 6: Commit review.md

```bash
git add bp/changes/$1/review.md
git commit -m "docs(review): triple review for $1"
```

## Guardrails

- **Full mode: MUST dispatch sub-agent.** Do NOT write review.md yourself.
- **tsc + vitest must pass before review.** Don't review broken code.
- **Do NOT fix issues yourself.** You identify them; the executor fixes them.
- **D issues -> replan (bp plan --fix). R/Q/G issues -> reapply (bp apply --fix).** Never mix.
- In --fix re-review: reviewer marks [x] in existing review.md, does NOT create new file.
- Do NOT run `bp archive` automatically - let the user review the findings first.
