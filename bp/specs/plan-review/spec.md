# Plan Review - Delta Spec

## Purpose

Govern the design-quality review performed by the orchestrator in the `plan` workflow step (Step 4) and the planner sub-agent's self-verification (PLANNER_PROMPT Step 6). This domain ensures designs are correct, complete, and implementable BEFORE execution begins - preventing flawed designs from cascading into implementation failure.

The review covers five content-quality dimensions distinct from format/structural checks: Implementability, Design Correctness, Decision Completeness, Impact Completeness, and File Manifest Consistency.

## SHALL

### SHALL review design across five content-quality dimensions

- SHALL the `plan` workflow Step 4: instruct the orchestrator to review planner output across exactly five dimensions before committing: Implementability, Design Correctness, Decision Completeness, Impact Completeness, and File Manifest Consistency.
  - GIVEN the planner sub-agent has produced design.md, tasks.md, and delta specs
  - WHEN the orchestrator executes plan workflow Step 4
  - THEN the instructions MUST list all five dimensions by name with specific verification questions per dimension
  - AND MUST include a FAIL example per dimension illustrating what a flawed design looks like

### SHALL separate content-quality review from format checks

- SHALL the `plan` workflow: keep content-quality review (Step 4) separate from structural/format verification (Step 5). Step 5 MUST NOT duplicate content-quality checks already covered in Step 4.
  - GIVEN the plan workflow instructions
  - WHEN parsed for Step 4 and Step 5 content
  - THEN Step 4 MUST contain the five content-quality dimensions
  - AND Step 5 Quality section MUST be labeled as structural/format completeness
  - AND Step 5 MUST NOT contain "DS-N single responsibility" or "D-N real alternatives" checks (these belong to Step 4 Dimensions 1 and 3)

### SHALL require structured feedback on re-dispatch

- SHALL the `plan` workflow Step 4: when any dimension fails, instruct the orchestrator to re-dispatch the planner with structured feedback containing dimension, DS-N/file, problem, and expected state.
  - GIVEN a design fails one or more Step 4 dimensions
  - WHEN the orchestrator re-dispatches the planner
  - THEN the feedback MUST include: Dimension name, DS-N or file reference, Problem description, Expected state
  - AND the orchestrator MUST re-run Step 4 review after re-dispatch until all dimensions pass

### SHALL planner self-verify implementability before returning

- SHALL the planner sub-agent prompt (PLANNER_PROMPT Step 6): include an implementability self-check that requires the planner to verify each DS-N's Detailed Design is complete enough for an executor to implement without guessing.
  - GIVEN the planner has drafted design.md
  - WHEN the planner executes its Step 6 verification
  - THEN it MUST re-read each DS-N's Detailed Design and verify: interface signatures, state/data structures, UI states, API validation/error codes, error paths, and detail beyond Key Interfaces
  - AND MUST NOT return a design where any DS-N fails this check

### SHALL cover specific verification questions per dimension

- SHALL each of the five dimensions include specific, answerable verification questions (not vague "is it good?"):
  - GIVEN the five dimensions in plan workflow Step 4
  - WHEN each dimension's questions are parsed
  - THEN Dimension 1 (Implementability) MUST ask about interface completeness, state transitions, UI states, API error codes, error paths, and detail-beyond-Key-Interfaces
  - AND Dimension 2 (Design Correctness) MUST ask about diagram-flow consistency, annotation-manifest consistency, and data structure-interface type consistency
  - AND Dimension 3 (Decision Completeness) MUST ask about state management, error handling, persistence, async patterns, and external dependencies
  - AND Dimension 4 (Impact Completeness) MUST ask about `bp map impact` usage, direct/indirect/test impacts, and non-empty indirect impacts for changed public exports
  - AND Dimension 5 (File Manifest Consistency) MUST ask about DS-N-to-file traceability, orphans, and absence of vague references
