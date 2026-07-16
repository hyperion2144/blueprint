# Proposal: e2e-loop-quality-test

## Intent

The existing E2E test (`tests/e2e/SKILL.md`) was designed for the v1 BP flow
(init -> grill -> research -> roadmap -> discuss -> split -> ...). The v2 BP
flow is fundamentally different (init -> roadmap -> propose -> plan -> apply ->
review -> archive -> continue -> loop). The old test cannot exercise the v2
workflow. Additionally, the old test was a one-shot manual process with no
quality scoring, no loop, and no self-optimization.

This change redesigns the E2E test as a **loop-mode quality optimization system**
that continuously drives a separate OMP session through a full BP project
lifecycle, scores the workflow quality (100pts across 7 dimensions), and
optimizes BP templates/prompts/engine until quality exceeds 95.

## Scope

### In Scope
- Rewrite `tests/e2e/SKILL.md` as loop-mode methodology with quality rubric
- Create `tests/e2e/scripts/score.py` for automated quality scoring
- Update `tests/e2e/scripts/rpc-driver.py` with configurable paths
- Create `tests/e2e/history/` for run result storage

### Out of Scope
- Changes to BP core engine or templates (those are what the loop optimizes)
- Fixture project setup (already exists at `~/vault/projects/specworkflow-fixture/sokoban`)
- CI integration (future work once loop is proven stable)

## Approach

1. **Quality Rubric**: 100 points across 7 dimensions (Artifact Completeness,
   Traceability, Spec Quality, TDD Compliance, Code Quality, Review Quality,
   Workflow Efficiency). Each dimension has mechanical checks (automated via
   `score.py`) and qualitative checks (agent judgment per SKILL.md notes).

2. **Loop Protocol**: 10 phases per iteration - Prepare Fixture -> Start SUT ->
   Drive SUT -> Collect Evidence -> Score -> Compare -> Optimize -> Commit Gate
   -> Self-Update -> Loop. The loop never stops; each iteration tests, scores,
   optimizes, and re-tests.

3. **Commit Gate**: Optimizations are only committed when
   `new_score > prev_score AND new_score > 95`. This prevents regressions and
   ensures only high-quality changes land.

4. **Self-Update**: The loop can modify its own SKILL.md when the methodology
   or scoring criteria are wrong (e.g., rubric too strict/loose, loop stuck,
   missing quality dimension).

5. **SUT Driving**: Uses `rpc-driver.py` to send BP commands to an OMP RPC
   session running the fixture project. Supports both step-by-step
   (`bp continue` per step) and autonomous (`bp loop`) modes.

## Deliverables

| ID | Deliverable | Verify |
|----|-------------|--------|
| PR-1 | Rewritten SKILL.md with loop methodology, 100pts rubric, commit gate, self-update protocol | SKILL.md contains all 10 phases, 7 dimensions, commit gate logic, self-update triggers |
| PR-2 | Automated scoring script (score.py) with 7 dimension checks | `python3 score.py --fixture <path>` produces valid JSON with 7 dimensions summing to total |
| PR-3 | Updated rpc-driver.py with configurable --fixture and --run-dir | `rpc-driver.py --help` shows new parameters |
| PR-4 | History directory structure for run result storage | `tests/e2e/history/` exists with .gitkeep |

## Roadmap Reference

Phase: P1.3 - Platform Integration & Testing
