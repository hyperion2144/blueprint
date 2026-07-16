---
name: bp-e2e-loop
description: Loop-mode E2E quality test. Drives another OMP session through a full BP project lifecycle, scores workflow quality (100pts across 7 dimensions), stores results, optimizes BP templates/prompts/engine, and re-runs. Only commits when new score > previous AND > 95. Never stops. Self-updates when loop methodology or scoring criteria have issues.
---

# BP E2E Quality Loop

Loop-mode E2E test that drives a separate OMP session (SUT) through a complete BP
project lifecycle, scores the BP workflow quality, and continuously optimizes the
BP system. This skill IS the loop - it never terminates. Each iteration tests,
scores, optimizes, and re-tests.

## Purpose

1. **Observe** the BP workflow running end-to-end on a real project
2. **Score** the quality of every artifact the workflow produces (100pts rubric)
3. **Find** bugs, prompt weaknesses, and template gaps
4. **Fix** them in `src/templates/` (the source of truth for platform files)
5. **Re-run** to verify the fix improved the score
6. **Commit** only when score improved AND exceeds 95
7. **Self-update** this skill when the loop methodology or rubric is wrong

## Architecture

```
Test Driver (you, this session)
  │
  ├── drives ──► SUT (OMP RPC session on fixture project)
  │                 │
  │                 └── runs: bp continue → propose → plan → apply → review → archive
  │
  ├── collects ──► evidence (git diff, bp/ files, test results, session logs)
  │
  ├── scores ────► quality rubric (100pts, 7 dimensions) via score.py
  │
  ├── stores ────► tests/e2e/history/run-N.json
  │
  ├── optimizes ─► src/templates/ (workflows, agents, artifacts) + src/core/
  │
  └── rebuilds ──► npm run build && bp update (syncs .omp/ platform files)
```

| Role | Responsibility | Forbidden |
|------|---------------|-----------|
| **Test Driver** (you) | Drive SUT, collect evidence, score, optimize, commit | Doing SUT's work (writing proposals, code, reviews for the fixture) |
| **SUT** (OMP session) | Execute BP steps on fixture project, produce artifacts | - |

## Fixture Project

**Sokoban** (推箱子) - Web/Canvas/TypeScript pure frontend.

Path: `~/vault/projects/specworkflow-fixture/sokoban` (sibling to main project, isolated)

Rationale: Sokoban = rule engine (reducer) + visualization (Canvas) + level data
(JSON) + state management (undo). This covers the full BP lifecycle:
- Rule engine → `type:behavior` change, TDD RED→GREEN→REFACTOR
- Visualization → `type:scaffolding` change, component integration
- Level data → config + behavior mixed change
- State management → behavior change, state machine

Success condition: at least 1 level playable end-to-end.

## Quality Scoring Rubric (100 pts)

Run `python3 tests/e2e/scripts/score.py --fixture <path>` for automated mechanical
scoring. Then review the JSON output and apply qualitative adjustments (see each
dimension's "Agent Judgment" notes).

### Dimension 1: Artifact Completeness (15 pts)

| Check | Points | Deduction |
|-------|--------|-----------|
| All artifacts exist per change (proposal, design, tasks, specs/, review) | 5 | -1 per missing file, max -5 |
| No template placeholders (`{{...}}`) in any artifact | 5 | -1 per occurrence, max -5 |
| All artifacts have real content (>10 lines, not just headers) | 3 | -1 per stub, max -3 |
| Archive directory retains all artifacts after archive | 2 | -1 per missing from archive |

**Agent Judgment:** If artifacts exist but are clearly AI-filler (repetitive,
generic, not project-specific), deduct up to -3 additional.

### Dimension 2: Traceability (15 pts)

| Check | Points | Deduction |
|-------|--------|-----------|
| Every PR-N in proposal.md → referenced by ≥1 DS-N in design.md | 5 | -1 per orphan PR, max -5 |
| Every DS-N in design.md → referenced by ≥1 T-N in tasks.md | 5 | -1 per orphan DS, max -5 |
| Every type:behavior task has `spec_ref` pointing to delta spec | 5 | -1 per missing, max -5 |

**Agent Judgment:** If traceability exists on paper but references are wrong
(e.g., spec_ref points to non-existent requirement), deduct -2 per wrong ref.

### Dimension 3: Spec Quality (15 pts)

| Check | Points | Deduction |
|-------|--------|-----------|
| Delta specs use correct sections (ADDED/MODIFIED/REMOVED) | 4 | -1 per wrong section, max -4 |
| Requirements use SHALL/MUST/SHOULD per RFC 2119 | 3 | -1 per misuse, max -3 |
| Each requirement has ≥1 scenario (GIVEN/WHEN/THEN) | 4 | -1 per missing, max -4 |
| Specs describe behavior, not implementation | 4 | -1 per impl detail (class names, library choices in spec), max -4 |

**Agent Judgment:** Read 2-3 requirements randomly. If they read like API docs
(method signatures, types) instead of behavior contracts (inputs, outputs,
error conditions), deduct -3 additional. This was the #1 problem in the prior
test run (P3: empty spec templates).

### Dimension 4: TDD Compliance (15 pts)

| Check | Points | Deduction |
|-------|--------|-----------|
| RED test commits exist for behavior tasks (`test(...)`) | 5 | -1 per missing, max -5 |
| GREEN implementation commits exist (`feat(...)`) | 5 | -1 per missing, max -5 |
| Tasks marked `[x]` with `<!-- commit: HASH -->` annotation | 5 | -1 per missing hash, max -5 |

**Agent Judgment:** Check `git log --oneline` for the fixture. If behavior tasks
were done in a single commit (no RED/GREEN separation), that's a TDD violation -
deduct -3 additional. This was P2 in the prior test run.

### Dimension 5: Code Quality (15 pts)

| Check | Points | Deduction |
|-------|--------|-----------|
| `tsc --noEmit` passes | 5 | -5 if fail |
| `vitest run` passes | 5 | -5 if fail |
| No `any` type abuse (grep `: any` in src/) | 3 | -1 per file, max -3 |
| Follows conventions (naming, imports, patterns from bp/conventions/) | 2 | -1 per violation, max -2 |

**Agent Judgment:** If code compiles and tests pass but architecture is poor
(god objects, circular deps, no separation of concerns), deduct -2 additional.

### Dimension 6: Review Quality (15 pts)

| Check | Points | Deduction |
|-------|--------|-----------|
| All three review dimensions present (Spec/Quality/Goal) | 4 | -1 per missing, max -4 |
| Verdict justified with evidence (file:line references) | 4 | -1 per unjustified finding, max -4 |
| Issues are specific (not "improve error handling") | 4 | -1 per vague issue, max -4 |
| No rubber-stamping (all PASS with 0 findings = suspicious) | 3 | -3 if all changes PASS with zero findings |

**Agent Judgment:** Read 1 review.md in full. If the reviewer found real problems
the automated checks missed, BONUS +2 (cap at 15). If the reviewer missed obvious
problems the automated checks DID find, deduct -3 additional. This was P4 in the
prior test run (spec-review didn't detect empty specs).

### Dimension 7: Workflow Efficiency (10 pts)

| Check | Points | Deduction |
|-------|--------|-----------|
| No unrecoverable errors during the run | 4 | -2 per unrecoverable error, max -4 |
| Fix loops resolve issues (not infinite) | 3 | -1 per unresolved fix loop, max -3 |
| Reasonable token consumption (<200k input for full lifecycle) | 3 | -1 per 50k over budget |

**Agent Judgment:** If the SUT got stuck in a loop (same step repeated 3+ times
without progress), deduct -2 additional. If `bp continue` gave wrong next-step
guidance, deduct -2.

### Score Storage Format

Each run produces `tests/e2e/history/run-N.json`:

```json
{
  "run_id": 1,
  "timestamp": "2026-07-16T15:00:00Z",
  "fixture": "sokoban",
  "score": {
    "total": 78,
    "dimensions": {
      "artifact_completeness": 12,
      "traceability": 11,
      "spec_quality": 10,
      "tdd_compliance": 8,
      "code_quality": 13,
      "review_quality": 12,
      "workflow_efficiency": 12
    }
  },
  "problems": [
    {
      "id": "P1",
      "dimension": "spec_quality",
      "severity": "MAJOR",
      "description": "Delta specs are empty templates",
      "evidence": "bp/changes/smoke-test/specs/core/spec.md: 12 lines, all <name>/<behavior> placeholders",
      "fix_target": "src/templates/workflows/plan.ts",
      "fix_description": "Add post-planner validation: reject if delta spec has < 3 non-template lines",
      "status": "open"
    }
  ],
  "optimizations_applied": [],
  "previous_score": null,
  "score_delta": null,
  "committed": false,
  "sut_profile": "bp-test-1689500000",
  "token_usage": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
}
```

## Loop Protocol

This is the core loop. Each iteration is one full cycle: test → score → optimize
→ re-test. The loop NEVER stops. After completing one iteration, immediately
start the next.

### Phase 1: Prepare Fixture

```bash
FIXTURE=~/vault/projects/specworkflow-fixture/sokoban
RUN_ID=$(cat tests/e2e/history/.counter 2>/dev/null || echo 0)
RUN_ID=$((RUN_ID + 1))
echo $RUN_ID > tests/e2e/history/.counter

# Reset fixture to clean state
cd "$FIXTURE"
git rm -rfq . 2>/dev/null
git checkout -- . 2>/dev/null
git clean -fdxq
cd -

# Initialize BP in fixture
cd "$FIXTURE"
bp init --yes
git init -q 2>/dev/null
git add -A
git commit -q -m "fixture: bare init" --allow-empty
cd -
```

### Phase 2: Start SUT

```bash
PROFILE="bp-test-$(date +%s)"

# Start OMP RPC session on fixture
python3 tests/e2e/scripts/rpc-driver.py \
  --profile "$PROFILE" \
  --step "00-start" \
  --message "You are working on a Sokoban game project. Run 'bp continue' and follow its instructions. For any user questions, use sensible defaults: the project is a web-based Sokoban puzzle game using HTML5 Canvas and TypeScript. Keep the roadmap simple: 1 milestone, 2-3 phases, each phase 1-2 changes. Do NOT ask the user anything - make reasonable assumptions and document them." \
  --start \
  --timeout 600
```

### Phase 3: Drive SUT Through BP Lifecycle

Send `bp continue` repeatedly. The SUT reads CLI output and follows workflow
instructions. After each step, collect evidence.

```bash
# Step sequence for v2 flow:
# 1. bp continue → detects empty roadmap → suggests bp roadmap
# 2. bp continue → detects roadmap exists, no changes → suggests bp propose
# 3. bp continue → detects proposal → suggests bp plan
# 4. bp continue → detects plan → suggests bp apply
# 5. bp continue → detects code → suggests bp review
# 6. bp continue → detects review PASS → suggests bp archive
# 7. bp continue → detects archive, next change → back to step 2
# 8. bp continue → all changes archived → project complete

STEP=0
while true; do
  STEP=$((STEP + 1))
  STEP_ID=$(printf "%02d-continue" $STEP)

  python3 tests/e2e/scripts/rpc-driver.py \
    --profile "$PROFILE" \
    --step "$STEP_ID" \
    --message "Run 'bp continue' and follow its instructions completely. Do not ask any questions - use sensible defaults. If a step requires user input, make the most reasonable choice and document your assumption." \
    --timeout 900

  # Check if project is complete
  cd "$FIXTURE"
  REMAINING=$(grep -c '\[ \]' bp/roadmap.md 2>/dev/null || echo 0)
  cd -

  if [ "$REMAINING" -eq 0 ]; then
    echo "All roadmap items complete"
    break
  fi

  # Safety: max 30 steps per run
  if [ $STEP -ge 30 ]; then
    echo "Max steps reached, stopping run"
    break
  fi
done
```

**Alternative: Single autonomous drive.** Instead of step-by-step, send one
message that tells the SUT to run `bp loop` (autonomous mode):

```bash
python3 tests/e2e/scripts/rpc-driver.py \
  --profile "$PROFILE" \
  --step "01-loop" \
  --message "Run 'bp loop' to autonomously advance the project. The project is a Sokoban game using HTML5 Canvas and TypeScript. Make reasonable assumptions for all questions. Do not ask the user anything. Run until the roadmap is complete or an unrecoverable error occurs." \
  --start \
  --timeout 3600
```

Choose the approach based on the run goal:
- **Step-by-step**: Better observability, can collect evidence per step (use for first few runs)
- **Autonomous (bp loop)**: Faster, tests the loop mode itself (use once flow is stable)

### Phase 4: Collect Evidence

```bash
EVIDENCE_DIR="tests/e2e/history/run-$RUN_ID"
mkdir -p "$EVIDENCE_DIR"

cd "$FIXTURE"

# Git state
git log --oneline > "$OLDPWD/$EVIDENCE_DIR/git-log.txt"
git diff --stat HEAD~30..HEAD 2>/dev/null > "$OLDPWD/$EVIDENCE_DIR/diffstat.txt" || true

# BP artifacts
find bp -type f | sort > "$OLDPWD/$EVIDENCE_DIR/bp-files.txt"

# Copy all artifacts for analysis
cp -r bp "$OLDPWD/$EVIDENCE_DIR/bp-snapshot/"

# Code quality
npx tsc --noEmit 2>&1 > "$OLDPWD/$EVIDENCE_DIR/tsc-result.txt" || true
npx vitest run 2>&1 > "$OLDPWD/$EVIDENCE_DIR/vitest-result.txt" || true

# Token usage (from SUT session)
# Parse from .omp.run/*/reply.json files
cd -
```

### Phase 5: Score Quality

```bash
# Run automated scoring
python3 tests/e2e/scripts/score.py \
  --fixture "$FIXTURE" \
  --output "$EVIDENCE_DIR/score-raw.json"

# Review the raw score, apply qualitative adjustments
# (read artifacts, check spec quality, review thoroughness, etc.)
# Write final score to history
```

After running `score.py`, review the output and apply the "Agent Judgment"
adjustments from each dimension. Write the final score to
`tests/e2e/history/run-$RUN_ID.json` (use the format above).

### Phase 6: Compare and Decide

```bash
PREV_SCORE=$(cat tests/e2e/history/run-$((RUN_ID-1))/score.json 2>/dev/null | jq '.total' || echo 0)
NEW_SCORE=$(cat tests/e2e/history/run-$RUN_ID/score.json | jq '.total')

echo "Previous: $PREV_SCORE | Current: $NEW_SCORE"
```

Decision matrix:

| Condition | Action |
|-----------|--------|
| NEW > PREV AND NEW > 95 | ✅ **Commit optimizations** (Phase 7) |
| NEW > PREV AND NEW ≤ 95 | ⚠️ Improving but not good enough. Keep optimizing, don't commit yet. |
| NEW ≤ PREV AND NEW > 95 | ⚠️ Score dropped but still high. Investigate regression. Don't commit. |
| NEW ≤ PREV AND NEW ≤ 95 | ❌ Optimization made things worse. Revert, try different approach. |

### Phase 7: Optimize (if score < 95 or problems found)

Read the problem list from the current run. For each problem:

1. **Identify root cause layer**:
   - `TEMPLATE` → fix in `src/templates/workflows/*.ts` or `src/templates/artifacts/*.ts`
   - `PROMPT` → fix in `src/templates/agents/index.ts` (planner/executor/reviewer prompts)
   - `ENGINE` → fix in `src/core/*.ts` (continue.ts, artifact-validator.ts, etc.)
   - `ARCHITECTURE` → design change, flag for manual review

2. **Apply fix** in the source file (NOT in `.omp/` - those are generated)

3. **Rebuild and sync**:
   ```bash
   cd ~/vault/projects/specworkflow
   npm run build
   # Sync platform files to main project
   bp update
   # Also sync to fixture if it has its own .omp/
   cd "$FIXTURE" && bp update 2>/dev/null || true
   cd -
   ```

4. **Record the optimization** in the run JSON:
   ```json
   "optimizations_applied": [
     {
       "problem_id": "P1",
       "file": "src/templates/workflows/plan.ts",
       "change": "Added post-planner validation: reject if delta spec has < 3 non-template lines",
       "lines_changed": "42-58"
     }
   ]
   ```

### Phase 8: Commit Gate

**Only commit when ALL conditions are met:**
1. `NEW_SCORE > PREVIOUS_SCORE` (strict improvement)
2. `NEW_SCORE > 95` (quality threshold)
3. All optimizations have been verified by a re-run (Phase 3-5 on the SAME fixture)

```bash
if [ "$NEW_SCORE" -gt "$PREV_SCORE" ] && [ "$NEW_SCORE" -gt 95 ]; then
  cd ~/vault/projects/specworkflow
  git add src/templates/ src/core/ tests/e2e/
  git commit -m "fix(bp): optimize BP workflow quality (score: $PREV_SCORE → $NEW_SCORE)

  Problems fixed:
  $(jq -r '.problems[] | select(.status == "fixed") | "  - \(.id): \(.description)"' tests/e2e/history/run-$RUN_ID.json)

  Score breakdown:
  $(jq -r '.score.dimensions | to_entries[] | "  \(.key): \(.value)pts"' tests/e2e/history/run-$RUN_ID.json)"
  cd -
fi
```

If conditions are NOT met:
- If optimizations were applied but score didn't improve: **revert** the
  optimizations (`git checkout -- src/templates/ src/core/`) and try a different
  approach in the next iteration.
- If score improved but ≤ 95: keep the optimizations (don't revert), continue
  to the next iteration to find more improvements.

### Phase 9: Self-Update Protocol

After each iteration, assess whether the **loop methodology itself** has issues.
If any of these conditions are true, update this SKILL.md:

| Trigger | Action |
|---------|--------|
| Score never reaches 95 after 3+ runs, but artifacts look good | Rubric too strict → adjust deductions or thresholds |
| Score reaches 95+ but real problems exist | Rubric too loose → add checks or increase deductions |
| Same problems recur across 3+ runs without improvement | Loop is stuck → add escalation logic or change optimization approach |
| A quality aspect not in the rubric is discovered | Add a new check to the relevant dimension |
| RPC protocol changes or OMP version updates | Update Phase 2/3 commands |
| `score.py` produces wrong results | Fix the script, update rubric if needed |

**How to self-update:**
1. Read this SKILL.md
2. Identify what needs to change
3. Use `edit` tool to make surgical changes
4. Document the change in the run JSON:
   ```json
   "skill_updates": [
     {
       "trigger": "Score never reaches 95 after 3 runs",
       "change": "Reduced spec_quality deduction for missing scenarios from -2 to -1 per missing",
       "file": "tests/e2e/SKILL.md",
       "rationale": "Small projects may have requirements with only happy-path scenarios"
     }
   ]
   ```
5. Continue the loop with the updated methodology

### Phase 10: Loop

After completing all phases, immediately start the next iteration from Phase 1.
**Do not stop.** The loop is the methodology - each iteration improves the BP
system incrementally.

If you need to pause (context limit, user intervention):
1. Write current state to `tests/e2e/history/.loop-state.json`
2. On resume, read the state file and continue from the appropriate phase

## RPC Driving

### Starting SUT

```bash
# SUT = OMP RPC session on fixture project
python3 tests/e2e/scripts/rpc-driver.py \
  --profile "$PROFILE" \
  --step "00-start" \
  --message "<initial prompt>" \
  --start \
  --timeout 600
```

The `--start` flag launches OMP in background via FIFOs. Subsequent calls reuse
the session (omit `--start`).

### Sending Commands

```bash
python3 tests/e2e/scripts/rpc-driver.py \
  --profile "$PROFILE" \
  --step "01-continue" \
  --message "Run 'bp continue' and follow its instructions. Use sensible defaults for any questions." \
  --timeout 900
```

### Auto-Answering

The rpc-driver.py auto-answers `extension_ui_request` events:
- `confirm` → always confirm
- `select` → pick `recommended` option, or first if none recommended
- `input` → use value from `--answers` file, or "ok" as default

### Stopping SUT

```bash
kill $(cat /tmp/omp_${PROFILE}.pid) 2>/dev/null
rm -f /tmp/omp_${PROFILE}_{in,out} /tmp/omp_${PROFILE}.pid /tmp/omp_${PROFILE}_wrapper.py
```

### Common Issues

| Problem | Symptom | Fix |
|---------|---------|-----|
| OMP 401 | message_start errorStatus=401 | `export MINIMAX_API_KEY=...` and restart |
| OMP no model | "No models available" | Copy `~/.omp/agent/models.yml` to profile dir |
| agent_end timeout | apply step > 15min | Increase `--timeout`, or use `--auto-approve` |
| FIFO deadlock | SUT hangs on start | rpc-driver.py handles this; don't use raw bash FIFOs |
| SUT asks questions via text | Agent uses text instead of extension UI | Reply with sensible defaults in next message |

## Optimization Targets

All BP behavior lives in these source files. Fix HERE, never in `.omp/`:

| Layer | Files | What to Fix |
|-------|-------|-------------|
| **Workflows** | `src/templates/workflows/*.ts` | Step instructions (propose, plan, apply, review, archive, loop, continue) |
| **Agents** | `src/templates/agents/index.ts` | Sub-agent system prompts (planner, executor, reviewer, codebase-scanner) |
| **Artifacts** | `src/templates/artifacts/*.ts` | Output document templates (proposal, design, tasks, spec, review, roadmap) |
| **Engine** | `src/core/*.ts` | Schema, artifact validation, continue engine, config |
| **Commands** | `src/commands/bp-*.ts` | CLI command implementations |

After any change:
```bash
npm run build          # Rebuild CLI
bp update              # Sync .omp/ platform files (in main project)
cd "$FIXTURE" && bp update 2>/dev/null || true  # Sync fixture
```

## Constraints

1. **Never do the SUT's work.** You drive, observe, score, and optimize the BP
   system. You do NOT write proposals, code, or reviews for the fixture project.
2. **Never fake a score.** If a check was skipped, record it as SKIPPED with
   reason. A fake PASS is worse than an honest FAIL.
3. **Fix at the source.** Always fix in `src/templates/` or `src/core/`, never
   in generated `.omp/` files.
4. **Atomic commits.** Each optimization commit must be self-contained and
   reproducible.
5. **No user interaction needed.** The loop runs autonomously. Only stop for
   unrecoverable errors or user-initiated interrupts.
6. **Preserve evidence.** Keep all run artifacts in `tests/e2e/history/run-N/`.
   Failed runs are as valuable as successful ones.
7. **Commit gate is absolute.** Never commit optimizations unless
   `new_score > prev_score AND new_score > 95`. If you can't verify both
   conditions, don't commit.

## Related Files

- `tests/e2e/scripts/rpc-driver.py` - OMP RPC driver (FIFO-based, auto-answer UI)
- `tests/e2e/scripts/score.py` - Automated quality scoring script
- `tests/e2e/history/` - Run history (JSON per run)
- `tests/e2e/TEST-GOAL.md` - Historical reference (v1 flow, kept for context)
- `tests/e2e/TEST-REPORT.md` - Last v1 test report (historical)
