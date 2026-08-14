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
  - Phase: P{milestone}.{id} (e.g., P1.1, P1.2) — full-structure milestones only
  - Change: listed under phase with [x] (done) or [ ] (pending)
  - All three layers share Goal / What / Deliverables / Outcomes fields
  - Full-structure milestone: phases + changes decomposed
  - Placeholder milestone: Goal/What/Deliverables/Outcomes + Key Decisions only (no phases)
  - Phase status must match between heading [STATUS] and **Status** line
  - Progress Summary: full-structure = numeric; placeholder = "-/-"
-->

## Milestone: M1 - v2 Architecture Refactoring [ACTIVE]

**Goal**: Refactor Blueprint from v1 (state machine, 25 commands, PEG grammars) to v2 (artifact-based, 8 commands, YAML schema) while preserving engineering rigor.
**What**: Three phases — core engine rewrite; commands & templates; platform integration & testing.
**Deliverables**: v2 CLI with 8 core commands, YAML schema validation, 3 sub-agent prompts, 4 platform generators (OMP, Claude Code, .agent, Codex).
**Outcomes**: User can run `bp init` → `bp propose` → `bp plan` → `bp apply` → `bp check` → `bp archive` end-to-end with artifact-based progress detection.
**Status**: ACTIVE

### Phase: P1.1 - Core Engine [COMPLETED]

- **Goal**: Rewrite core types, config, file-tree, continue engine for artifact-based progress detection
- **What**: Replace v1 state machine with file-existence-based progress detection; migrate config to Zod-validated YAML; implement delta-spec merge with SHA-256 fingerprinting.
- **Deliverables**: src/core/{schema,artifact-validator,continue,config,file-tree,delta-merge,spec-injector,code-extract,brownfield,platform-registry}.ts
- **Outcomes**: `bp continue` reads change directory, detects artifact presence, outputs next step without any state.md file.
- **Depends on**: none
- **Spec domain**: core
- **Changes**: 2/2 completed
- **Status**: COMPLETED

### Key Decisions

- [P1.1-KD] Progress detection — file existence over state machine (reason: eliminates state drift; alt: persisted state.md)

**Changes**:

- [x] v2-core-refactor (archived 2026-07-16)
  - **Goal**: Rewrite core engine modules for v2 artifact-based workflow
  - **What**: New schema loader, artifact validator, continue engine, config with Zod, file-tree ops, delta-merge, spec-injector, code-extract, brownfield, platform-registry
  - **Deliverables**: 10 core modules under src/core/
  - **Outcomes**: `bp continue` works without state.md; all 13 commands resolve via artifact presence
  - **Depends on**: none
- [x] refactor-command (archived 2026-08-07)
  - **Goal**: Dedicated refactor workflow step (bp-refactor command/skill) with deterministic analyzer + refactorer sub-agent to consolidate fragmented/duplicated/flat/low-reuse code into deep modules and keep specs in sync
  - **What**: New `refactor` step in WORKFLOW_REGISTRY/STEP_DEFS + platform generators; `bp refactor <target>` outputs step content; `bp refactor analyze <target>` computes four anti-pattern metrics + depth ratio to bp/.refactor-report.md; refactorer sub-agent performs behavior-preserving consolidation + affected-spec sync
  - **Deliverables**: src/commands/bp-refactor.ts, src/core/refactor-analyzer.ts, src/templates/workflows/refactor.ts, src/templates/agents refactorer prompt, platform generators
  - **Outcomes**: `bp refactor <target>` prints the refactor steps; `bp refactor analyze` produces evidence-backed report; refactorer consolidates modules toward deep modules with tests green and specs updated
  - **Depends on**: none

**Next**: Phase P1.2

### Phase: P1.2 - Commands & Templates [IN_PROGRESS]

- **Goal**: Rewrite 8 commands, 7 artifact templates, 3 agent prompts, 8 workflow instructions
- **What**: Migrate 13 v1 commands down to 8 core + 5 aliases; rebuild all artifact templates with structured sections (PR-N, DS-N, T-N, R-N); rewrite planner/executor/reviewer prompts with TDD wave semantics.
- **Deliverables**: src/commands/bp-*.ts (13 files), src/templates/artifacts/index.ts (7 templates), src/templates/agents/index.ts (3 prompts), src/templates/workflows/registry.ts (8 workflows)
- **Outcomes**: Every CLI subcommand produces a parseable artifact that passes artifact-validator; every sub-agent prompt enforces TDD (RED→GREEN→REFACTOR) for behavior tasks.
- **Depends on**: P1.1
- **Spec domain**: templates
- **Changes**: 1/1 completed
- **Status**: IN_PROGRESS

### Key Decisions

- [P1.2-KD] TDD protocol — 3 commits per behavior task (reason: enforces test-first; alt: single commit)

**Changes**:

- [x] v2-commands-templates (archived 2026-07-16)
  - **Goal**: Ship all v2 commands, artifact templates, and agent prompts
  - **What**: 13 command files, 7 artifact templates, 3 agent prompts, 8 workflow instructions
  - **Deliverables**: src/commands/, src/templates/
  - **Outcomes**: `bp template <name> --stdout` returns every artifact template; `bp validate` accepts all v2 artifacts
  - **Depends on**: v2-core-refactor
- [ ] add-design-workflow (planned 2026-08-14)

**Next**: Phase P1.3

### Phase: P1.3 - Platform Integration & Testing [COMPLETED]

- **Goal**: Update integrations (OMP, Claude Code, .agent, Codex), fix test suite, update docs
- **What**: Migrate OMP/Claude/.agent generators to v2 platform-registry; add Codex generator; add Claude Code hooks; wire OMP extension for auto-context-injection.
- **Deliverables**: src/integrations/{omp,claude-code,agent,codex}/, full test suite under tests/
- **Outcomes**: `bp init --platform <p>` generates correct platform files; `npm test` passes with 324+ tests across unit/integration/parser/command suites.
- **Depends on**: P1.2
- **Spec domain**: platform-gen
- **Changes**: 3/3 completed
- **Status**: COMPLETED

### Key Decisions

- [P1.3-KD] Codex generator — added as 4th platform (reason: OpenAI Codex CLI adoption; alt: skip Codex)

**Changes**:

- [x] v2-platform-tests (archived 2026-07-16)
  - **Goal**: Migrate platform generators to v2 platform-registry and fix test suite
  - **What**: OMP, Claude Code, .agent generators + test suite migration
  - **Deliverables**: src/integrations/{omp,claude-code,agent}/, tests/
  - **Outcomes**: All 3 platform generators produce byte-deterministic output pinned by snapshots
  - **Depends on**: v2-commands-templates
- [x] bp-auto-context-injection (archived 2026-07-19)
  - **Goal**: Wire OMP extension to auto-inject bp context for sub-agents
  - **What**: session_start/before_agent_start/context handlers; compact context block; sub-agent discrimination (planner/executor/reviewer)
  - **Deliverables**: src/templates/omp/extension.tmpl.ts, src/integrations/omp/extension-runtime.ts
  - **Outcomes**: Sub-agents never call `bp context` themselves — Extension injects it automatically
  - **Depends on**: v2-platform-tests
- [x] add-claude-code-hooks (archived 2026-07-24)
  - **Goal**: Add Claude Code hooks for context injection parity with OMP
  - **What**: handler.ts with execFileSync + timeout; hooks.json wiring
  - **Deliverables**: src/integrations/claude-code/handler.ts, hooks.json template
  - **Outcomes**: Claude Code users get the same auto-context-injection as OMP users
  - **Depends on**: bp-auto-context-injection

**Next**: M2 planning

---

## Milestone: M2 - Polish & Extensions [PLANNED]

<!--
  Placeholder milestone — direction known, but NOT fully discussed yet.
  DO NOT decompose into phases or list changes here.
  Promote to full structure (with phase decomposition) when discussion is complete.
-->

**Goal**: Polish v2 with custom schemas, brownfield support improvements, and community feedback integration.
**What**: TBD — details deferred until M1 ships and user feedback arrives
**Deliverables**: TBD
**Outcomes**: TBD
**Status**: PLANNED

### Key Decisions

- [M2-KD] (none yet)

---

## Milestone: M3 - Telemetry-Driven Evolution [PLANNED]

**Goal**: From static workflow to telemetry-driven evolution. User-side collects telemetry; maintainers analyze and release evolved versions. See DESIGN-v3.md.
**What**: Five phases — telemetry foundation; spec governance; cross-change scheduling; uncertainty quantification; maintainer analysis tools.
**Deliverables**: Telemetry collection/export modules, spec audit commands, dependency graph commands, tiered verification workflow, audit tooling.
**Outcomes**: Framework self-evolves based on real usage data; specs carry computable confidence; cross-change dependencies visualized as DAG.
**Status**: PLANNED

### Phase: P3.1 - Telemetry Foundation [NOT_STARTED]

- **Goal**: Auto-collect telemetry in command handlers + anonymization + auto-report (opt-in)
- **What**: Auto-collect .meta/ data in command handlers (plan/apply/review/archive auto-write run data); add failure mode marks + step usage stats; anonymization (hash code snippets, strip paths); auto-report if telemetry.enabled (async, non-blocking); bp telemetry status/export; config.telemetry field.
- **Deliverables**: Telemetry collection module, .meta/ run-data writer, anonymization handler, bp telemetry status/export commands, config.telemetry config field, async upload module.
- **Outcomes**: Given any bp command (plan/apply/review/archive) completes, then `.meta/<timestamp>.json` exists with fields {command, exitCode, durationMs, failureMode?}, anonymized; `bp telemetry status` shows collection state; `bp telemetry export` outputs the records; when `telemetry.enabled: true`, records upload async without blocking command exit.
- **Depends on**: none
- **Spec domain**: telemetry
- **Changes**: 0/1 completed
- **Status**: NOT_STARTED

### Key Decisions

- [P3.1-KD] Storage format — JSON per run under .meta/ (reason: append-only, diffable; alt: single sqlite db)

**Changes**:

- [ ] telemetry (proposed 2026-07-22)
  - **Goal**: Auto-collect runtime telemetry in command handlers and provide export + opt-in auto-report capabilities
  - **What**: Write .meta/ run data in plan/apply/review/archive handlers; add failure-mode marks and step-usage stats; anonymize (hash code snippets, strip paths); implement bp telemetry status/export commands; config.telemetry field; async non-blocking auto-report when telemetry.enabled
  - **Deliverables**: Telemetry collection module, .meta/ run-data writer, anonymization handler, bp telemetry status command, bp telemetry export command, config.telemetry config, async upload module
  - **Outcomes**: Each command run produces an anonymized telemetry record at `.meta/<timestamp>.json` with {command, exitCode, durationMs, failureMode?}; `bp telemetry export` outputs all records; opt-in enables non-blocking auto-upload
  - **Depends on**: none

**Next**: Phase P3.2

### Phase: P3.2 - Spec Governance [NOT_STARTED]

- **Goal**: Prevent specs/ from rotting — confidence, audit, version management
- **What**: Auto-infer spec confidence from codebase-map exports + test files (high=has test+code, medium=code no test, low=spec only); implement bp spec audit (redundancy/staleness/coverage); add since version tags to requirements; bp spec diff.
- **Deliverables**: Confidence inference module, since-version tag mechanism, spec confidence annotations, bp spec audit command, bp spec diff command, audit report output.
- **Outcomes**: Every spec requirement carries a computable confidence level (high/medium/low) and version origin; `bp spec audit` outputs redundancy/staleness/coverage report; `bp spec diff` shows requirement deltas between versions.
- **Depends on**: P3.1
- **Spec domain**: specs
- **Changes**: 0/2 completed
- **Status**: NOT_STARTED

### Key Decisions

- [P3.2-KD] Confidence levels — three-tier high/medium/low (reason: matches review intensity tiers; alt: continuous 0-1 score)

**Changes**:

- [ ] spec-confidence (proposed 2026-07-22)
  - **Goal**: Auto-infer spec confidence so maintainers know which specs have code/test backing
  - **What**: Infer confidence from codebase-map exports and test files (high=test+code, medium=code no test, low=spec only); add since-version tags to requirements
  - **Deliverables**: Confidence inference module, since-version tag mechanism, spec confidence annotations
  - **Outcomes**: Every spec requirement carries a computable confidence level and version origin for audit
  - **Depends on**: telemetry (P3.1)
- [ ] spec-audit (proposed 2026-07-22)
  - **Goal**: Provide spec audit capability to surface redundancy, staleness, and coverage gaps
  - **What**: Implement bp spec audit (redundancy/staleness/coverage detection); implement bp spec diff
  - **Deliverables**: bp spec audit command, bp spec diff command, audit report output
  - **Outcomes**: Maintainers can one-shot detect spec health and locate requirements that need updates
  - **Depends on**: spec-confidence

**Next**: Phase P3.3

### Phase: P3.3 - Cross-Change Scheduling [NOT_STARTED]

- **Goal**: Support multi-change parallel development with dependency DAG
- **What**: bp deps graph (DAG output + cycle detection); cascade change detection after archive (queryImpact + spec diff); enhanced parallel conflict detection (file + spec + module upstream/downstream via codebase-map).
- **Deliverables**: bp deps graph command, DAG output, cycle-detection algorithm, cascade detection module, queryImpact query, enhanced conflict detector.
- **Outcomes**: `bp deps graph` renders the change dependency DAG and fails on cycles; after `bp archive`, downstream affected changes are listed; parallel-work conflicts (file/spec/module) are flagged before execution.
- **Depends on**: P3.2
- **Spec domain**: scheduling
- **Changes**: 0/2 completed
- **Status**: NOT_STARTED

### Key Decisions

- [P3.3-KD] DAG representation — adjacency list in codebase-map (reason: queryable; alt: graph DB)

**Changes**:

- [ ] deps-graph (proposed 2026-07-22)
  - **Goal**: Visualize cross-change dependencies as a DAG with cycle detection
  - **What**: Implement bp deps graph command; output DAG; implement cycle detection
  - **Deliverables**: bp deps graph command, DAG output, cycle-detection algorithm
  - **Outcomes**: Maintainers can view the change dependency graph and spot cyclic dependencies before parallel work
  - **Depends on**: spec-audit (P3.2)
- [ ] cascade-detection (proposed 2026-07-22)
  - **Goal**: Auto-detect downstream cascade impacts after archive to avoid missing affected changes
  - **What**: Implement cascade detection via queryImpact + spec diff; enhance parallel conflict detection (file + spec + module upstream/downstream via codebase-map)
  - **Deliverables**: Cascade detection module, queryImpact query, enhanced conflict detector
  - **Outcomes**: Archiving a change surfaces affected downstream changes; parallel-work conflicts are flagged early
  - **Depends on**: deps-graph

**Next**: Phase P3.4

### Phase: P3.4 - Uncertainty Quantification [NOT_STARTED]

- **Goal**: Match verification intensity to output confidence
- **What**: Add Confidence field to DESIGN_TEMPLATE DS-N; update PLANNER_PROMPT to annotate confidence (high/medium/low); update review workflow to tier verification (high=auto test, medium=sub-agent review, low=triple review + human gate).
- **Deliverables**: DESIGN_TEMPLATE Confidence field, PLANNER_PROMPT confidence-annotation guidance, tiered review workflow, verification-intensity routing logic.
- **Outcomes**: Every design component DS-N carries a confidence level; review workflow routes high→auto test, medium→sub-agent review, low→triple review + human gate; low-confidence changes cannot archive without human approval.
- **Depends on**: P3.3
- **Spec domain**: verification
- **Changes**: 0/1 completed
- **Status**: NOT_STARTED

### Key Decisions

- [P3.4-KD] Verification tiers — three-tier matching confidence levels (reason: symmetric with spec confidence; alt: continuous score)

**Changes**:

- [ ] tiered-verification (proposed 2026-07-22)
  - **Goal**: Let planners annotate per-component confidence at design time and tier verification by confidence — high-confidence gets lightweight checks, low-confidence gets strict gates
  - **What**: Add Confidence field to DESIGN_TEMPLATE DS-N; update PLANNER_PROMPT to annotate confidence (high/medium/low); update review workflow to tier verification (high=auto test, medium=sub-agent review, low=triple review + human gate)
  - **Deliverables**: DESIGN_TEMPLATE Confidence field, PLANNER_PROMPT confidence-annotation guidance, tiered review workflow, verification-intensity routing logic
  - **Outcomes**: Every design component carries a confidence level that review uses to route verification intensity; low-confidence changes must pass a human gate
  - **Depends on**: cascade-detection (P3.3)

**Next**: Phase P3.5

### Phase: P3.5 - Maintainer Analysis Tools [NOT_STARTED]

- **Goal**: Telemetry-driven framework evolution tooling
- **What**: Telemetry aggregation tool; failure mode frequency stats; step usage rate report; bp audit workflow (prompt redundancy + step necessity + model version adaptation); complexity budget check (prompt tokens/step count/config count).
- **Deliverables**: Telemetry aggregation tool, failure-mode frequency stats, step-usage-rate report, bp audit workflow command, complexity budget checker, audit report.
- **Outcomes**: Maintainers can run `bp audit workflow` to get a report of prompt redundancy, step necessity, and complexity budget status; failure-mode frequency and step-usage-rate stats identify high-failure and rarely-used steps from real usage data.
- **Depends on**: P3.4
- **Spec domain**: telemetry
- **Changes**: 0/2 completed
- **Status**: NOT_STARTED

### Key Decisions

- [P3.5-KD] Complexity budget — token/step/config thresholds (reason: prevents framework bloat; alt: no budget)

**Changes**:

- [ ] telemetry-analysis (proposed 2026-07-22)
  - **Goal**: Aggregate user-side telemetry into failure-mode frequency and step-usage-rate reports
  - **What**: Build telemetry aggregation tool; failure-mode frequency stats; step-usage-rate report
  - **Deliverables**: Telemetry aggregation tool, failure-mode frequency stats, step-usage-rate report
  - **Outcomes**: Maintainers can identify high-failure steps and rarely used steps from real usage data
  - **Depends on**: tiered-verification (P3.4)
- [ ] workflow-audit (proposed 2026-07-22)
  - **Goal**: Audit the workflow itself to drive framework self-evolution
  - **What**: Implement bp audit workflow (prompt redundancy + step necessity + model-version adaptation); complexity budget check (prompt tokens / step count / config count)
  - **Deliverables**: bp audit workflow command, complexity budget checker, audit report
  - **Outcomes**: Maintainers can locate redundant prompts and prunable steps, keeping framework complexity within budget
  - **Depends on**: telemetry-analysis

**Next**: All changes completed

---

## Future Considerations

- Multi-repo blueprint — supporting changes that span multiple repositories (notes: needs cross-repo spec merge)

---

## Progress Summary

| Milestone | Phases | Changes | Status |
| ----------- | -------- | --------- | -------- |
| M1 - v2 Architecture Refactoring | 1/3 | 3/3 | ACTIVE |
| M2 - Polish & Extensions | -/- | -/- | PLANNED |
| M3 - Telemetry-Driven Evolution | 0/5 | 0/8 | PLANNED |
