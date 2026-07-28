# Roadmap: blueprint

<!--
  Living document. Tracks project direction and progress.
  NOT a state machine - it doesn't gate change execution.

  Purpose:
  1. Make direction explicit (prevent drift)
  2. Track progress (count of archived changes per phase)
  3. Show what's planned next

  Updated automatically by `bp archive` (marks changes [x], increments counts).
  Updated manually by `bp roadmap` (add milestones, phases, planned changes).

  Format rules:
  - Status tags: [NOT_STARTED], [ACTIVE], [IN_PROGRESS], [COMPLETED], [SHIPPED]
  - Milestone: M{id} (e.g., M1, M2)
  - Phase: P{milestone}.{id} (e.g., P1.1, P1.2)
  - Change: listed under phase with [x] (done) or [ ] (pending)
-->

## Milestone: M1 - v2 Architecture Refactoring [ACTIVE]

**Goal**: Refactor Blueprint from v1 (state machine, 25 commands, PEG grammars) to v2 (artifact-based, 8 commands, YAML schema) while preserving engineering rigor.
**Status**: ACTIVE

### Phase: P1.1 - Core Engine [IN_PROGRESS]

- **Goal**: Rewrite core types, config, file-tree, continue engine for artifact-based progress detection
- **Spec domain**: core
- **Changes**: 1/1 completed
- **Status**: IN_PROGRESS

**Changes**:
- [x] v2-core-refactor (archived 2026-07-16)

**Next**: Phase P1.2

### Phase: P1.2 - Commands & Templates [IN_PROGRESS]

- **Goal**: Rewrite 8 commands, 7 artifact templates, 3 agent prompts, 8 workflow instructions
- **Spec domain**: templates
- **Changes**: 1/1 completed
- **Status**: IN_PROGRESS

**Changes**:
- [x] v2-commands-templates (archived 2026-07-16)

**Next**: Phase P1.3

### Phase: P1.3 - Platform Integration & Testing [NOT_STARTED]

- **Goal**: Update integrations (OMP, Claude Code, .agent), fix test suite, update docs
- **Spec domain**: platform-gen
- **Changes**: 4/4 planned
- **Status**: IN_PROGRESS

**Changes**:
- [x] v2-platform-tests (archived 2026-07-16)
- [x] bp-auto-context-injection (archived 2026-07-19)
- [x] add-claude-code-hooks (archived 2026-07-24)

**Next**: M2 planning

---

## Milestone: M2 - Polish & Extensions [PLANNED]

**Goal**: Polish v2 with custom schemas, brownfield support improvements, and community feedback integration.
**Status**: PLANNED

## Milestone: M3 - Telemetry-Driven Evolution [PLANNED]

**Goal**: From static workflow to telemetry-driven evolution. User-side collects telemetry; maintainers analyze and release evolved versions. See DESIGN-v3.md.
**Status**: PLANNED

### Phase: P3.1 - Telemetry Foundation [NOT_STARTED]

- **Goal**: Auto-collect telemetry in command handlers + anonymization + auto-report (opt-in)
- **Description**: Auto-collect .meta/ data in command handlers (plan/apply/review/archive auto-write run data); add failure mode marks + step usage stats; anonymization (hash code snippets, strip paths); auto-report if telemetry.enabled (async, non-blocking); bp telemetry status/export; config.telemetry field
- **Spec domain**: telemetry
- **Changes**: 0/2 completed
- **Status**: NOT_STARTED

**Changes**:
- [ ] telemetry-collection (proposed 2026-07-22)
  - **Goal**: Auto-collect runtime telemetry in command handlers to ground framework evolution in real data
  - **What**: Write .meta/ run data in plan/apply/review/archive handlers; add failure-mode marks and step-usage stats; anonymize (hash code snippets, strip paths)
  - **Deliverables**: Telemetry collection module, .meta/ run-data writer, anonymization handler
  - **Outcomes**: Each command run produces an anonymized telemetry record that can be exported and reported
- [ ] telemetry-export-upload (proposed 2026-07-22)
  - **Goal**: Provide telemetry export and opt-in auto-report capabilities
  - **What**: Implement bp telemetry status/export commands; config.telemetry field; async non-blocking auto-report when telemetry.enabled
  - **Deliverables**: bp telemetry status command, bp telemetry export command, config.telemetry config, async upload module
  - **Outcomes**: Users can view/export telemetry state; opt-in enables non-blocking auto-upload

**Next**: Phase P3.2

### Phase: P3.2 - Spec Governance [NOT_STARTED]

- **Goal**: Prevent specs/ from rotting — confidence, audit, version management
- **Description**: Auto-infer spec confidence from codebase-map exports + test files (high=has test+code, medium=code no test, low=spec only); implement bp spec audit (redundancy/staleness/coverage); add since version tags to requirements; bp spec diff
- **Spec domain**: specs
- **Changes**: 0/2 completed
- **Status**: NOT_STARTED

**Changes**:
- [ ] spec-confidence (proposed 2026-07-22)
  - **Goal**: Auto-infer spec confidence so maintainers know which specs have code/test backing
  - **What**: Infer confidence from codebase-map exports and test files (high=test+code, medium=code no test, low=spec only); add since-version tags to requirements
  - **Deliverables**: Confidence inference module, since-version tag mechanism, spec confidence annotations
  - **Outcomes**: Every spec requirement carries a computable confidence level and version origin for audit
- [ ] spec-audit (proposed 2026-07-22)
  - **Goal**: Provide spec audit capability to surface redundancy, staleness, and coverage gaps
  - **What**: Implement bp spec audit (redundancy/staleness/coverage detection); implement bp spec diff
  - **Deliverables**: bp spec audit command, bp spec diff command, audit report output
  - **Outcomes**: Maintainers can one-shot detect spec health and locate requirements that need updates

**Next**: Phase P3.3

### Phase: P3.3 - Cross-Change Scheduling [NOT_STARTED]

- **Goal**: Support multi-change parallel development with dependency DAG
- **Description**: bp deps graph (DAG output + cycle detection); cascade change detection after archive (queryImpact + spec diff); enhanced parallel conflict detection (file + spec + module upstream/downstream via codebase-map)
- **Spec domain**: scheduling
- **Changes**: 0/2 completed
- **Status**: NOT_STARTED

**Changes**:
- [ ] deps-graph (proposed 2026-07-22)
  - **Goal**: Visualize cross-change dependencies as a DAG with cycle detection
  - **What**: Implement bp deps graph command; output DAG; implement cycle detection
  - **Deliverables**: bp deps graph command, DAG output, cycle-detection algorithm
  - **Outcomes**: Maintainers can view the change dependency graph and spot cyclic dependencies before parallel work
- [ ] cascade-detection (proposed 2026-07-22)
  - **Goal**: Auto-detect downstream cascade impacts after archive to avoid missing affected changes
  - **What**: Implement cascade detection via queryImpact + spec diff; enhance parallel conflict detection (file + spec + module upstream/downstream via codebase-map)
  - **Deliverables**: Cascade detection module, queryImpact query, enhanced conflict detector
  - **Outcomes**: Archiving a change surfaces affected downstream changes; parallel-work conflicts are flagged early

**Next**: Phase P3.4

### Phase: P3.4 - Uncertainty Quantification [NOT_STARTED]

- **Goal**: Match verification intensity to output confidence
- **Description**: Add Confidence field to DESIGN_TEMPLATE DS-N; update PLANNER_PROMPT to annotate confidence (high/medium/low); update review workflow to tier verification (high=auto test, medium=sub-agent review, low=triple review + human gate)
- **Spec domain**: verification
- **Changes**: 0/2 completed
- **Status**: NOT_STARTED

**Changes**:
- [ ] confidence-annotation (proposed 2026-07-22)
  - **Goal**: Let planners annotate per-component confidence at design time to drive differentiated verification
  - **What**: Add Confidence field to DESIGN_TEMPLATE DS-N; update PLANNER_PROMPT to annotate confidence (high/medium/low)
  - **Deliverables**: DESIGN_TEMPLATE Confidence field, PLANNER_PROMPT confidence-annotation guidance
  - **Outcomes**: Every design component carries a confidence level that review can use to route verification intensity
- [ ] tiered-verification (proposed 2026-07-22)
  - **Goal**: Tier verification by confidence — high-confidence gets lightweight checks, low-confidence gets strict gates
  - **What**: Update review workflow to tier verification (high=auto test, medium=sub-agent review, low=triple review + human gate)
  - **Deliverables**: Tiered review workflow, verification-intensity routing logic
  - **Outcomes**: Verification resources are allocated by risk; low-confidence changes must pass a human gate

**Next**: Phase P3.5

### Phase: P3.5 - Maintainer Analysis Tools [NOT_STARTED]

- **Goal**: Telemetry-driven framework evolution tooling
- **Description**: Telemetry aggregation tool; failure mode frequency stats; step usage rate report; bp audit workflow (prompt redundancy + step necessity + model version adaptation); complexity budget check (prompt tokens/step count/config count)
- **Spec domain**: telemetry
- **Changes**: 0/2 completed
- **Status**: NOT_STARTED

**Changes**:
- [ ] telemetry-analysis (proposed 2026-07-22)
  - **Goal**: Aggregate user-side telemetry into failure-mode frequency and step-usage-rate reports
  - **What**: Build telemetry aggregation tool; failure-mode frequency stats; step-usage-rate report
  - **Deliverables**: Telemetry aggregation tool, failure-mode frequency stats, step-usage-rate report
  - **Outcomes**: Maintainers can identify high-failure steps and rarely used steps from real usage data
- [ ] workflow-audit (proposed 2026-07-22)
  - **Goal**: Audit the workflow itself to drive framework self-evolution
  - **What**: Implement bp audit workflow (prompt redundancy + step necessity + model-version adaptation); complexity budget check (prompt tokens / step count / config count)
  - **Deliverables**: bp audit workflow command, complexity budget checker, audit report
  - **Outcomes**: Maintainers can locate redundant prompts and prunable steps, keeping framework complexity within budget

**Next**: All changes completed

---

## Progress Summary

| Milestone | Phases | Changes | Status |
|-----------|--------|---------|--------|
| M1 - v2 Architecture Refactoring | 2/3 | 3/3 | ACTIVE |
| M2 - Polish & Extensions | 0/0 | 0/0 | PLANNED |
| M3 - Telemetry-Driven Evolution | 0/5 | 0/10 | PLANNED |
