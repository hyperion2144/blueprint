# Proposal: add-design-workflow

## Level

**Level**: standard
**Auto-assessed**: standard (cross-module: 5 new workflow steps + 5 CLI commands + 4 platform generators + new sub-agent role + artifact additions; medium risk)

## Intent

Blueprint v2 ships an 8-step core workflow (init → roadmap → propose → plan → apply → check → archive → continue) plus auxiliary steps (ff, loop, refactor). It is spec-driven and behavior-first — but it has **no design workflow track**. Users who build UI products with bp get rigorous behavioral specs and zero design-system guidance: no design system source of truth, no visual audit, no design-to-HTML path.

The gstack project (<https://github.com/garrytan/gstack>) solves exactly this problem with five UI design skills: `design-consultation` (complete design system proposal → DESIGN.md), `design-html` (design → production HTML/CSS), `design-review` (designer's-eye QA audit), `design-shotgun` (multi-variant exploration + comparison board + approval), and `plan-design-review` (plan-phase design audit). These are proven workflows — but they are inseparable from gstack's proprietary plumbing: a ~700-line preamble (telemetry, upgrade checks, gstack-config, gbrain sync), Claude-Code-only paths, custom `design`/`browse` binaries, the Pretext HTML framework, and `~/.gstack` state. None of that exists here or belongs in bp.

This change ports those five workflows into blueprint as first-class workflow steps — each generating a platform skill (`bp:<name>`) and a CLI command (`bp design*`) for every configured platform — rewritten to bp conventions: orchestrator dispatches sub-agents, artifacts land in repo (root `DESIGN.md`) or change dirs (`design-review.md`), content is platform-agnostic, and `plan-design-review` is trimmed to **UI-only audit** per explicit user requirement. The user also requires the skill content to be adapted to this project (bp's architecture and conventions), not copied.

## Scope

### In Scope

- Five new workflow steps registered in `WORKFLOW_REGISTRY`: `design`, `design-html`, `design-review`, `design-shotgun`, `plan-design-review`.
- Each step ships a workflow-instruction template used for BOTH the generated platform skill (SKILL.md body) and the CLI command output — mirroring the existing ff/loop/refactor pattern (`getXSkillTemplate` + `getXCommandTemplate`).
- Five new CLI commands: `bp design`, `bp design-html`, `bp design-review`, `bp design-shotgun`, `bp plan-design-review` — each prints the step's orchestrator instructions (bp commands do not execute the work; they direct the agent).
- New `designer` sub-agent role (system prompt in `src/templates/agents/index.ts`) dispatched by the design steps; per-platform dispatch entries in `bp-dispatch.ts`; config model tier for the role.
- Platform integration: STEPS lists extended to 16 in pi/omp/codex/agent skill+command generators; pi extension agent-type detection gains a `designer` marker; snapshots regenerated; `bp update` dogfoods the five new skills.
- Design artifacts: `design-system` template (output → root `DESIGN.md`, the cross-change design source of truth) and `design-review.md` change artifact (registered so the continue engine tolerates it).
- Advisory hooks in the core loop: `plan` step text suggests `bp plan-design-review` when change scope includes UI; `check` step text suggests `bp design-review` for UI-scoped changes. Core 8-step semantics unchanged.
- Roadmap: planned change entry under M1 P1.2 (Commands & Templates).

### Out of Scope

- `ios-design-review` (iOS-hardware audit; no iOS project type in bp's brownfield detection).
- gstack plumbing of any kind: preamble/telemetry/gstack-config/gbrain, `design` and `browse` binaries, Pretext framework, `~/.gstack` state, Claude-Code-only paths. The ported templates must be self-contained markdown instructions runnable by any bp platform agent.
- Changes to the core 8-step loop semantics (propose→plan→apply→check→archive stays authoritative; design steps are auxiliary like ff/loop/refactor).
- Native design-mockup generation (no AI-image binary shipped). Preview path is the HTML preview page + browser screenshots, using whatever browsing capability the host platform provides.
- Changes to `init-wizard` (no new wizard prompts for design).
- `DESIGN.md` merge machinery (archive does not merge design docs; DESIGN.md is a live root file, updated in place by `bp design`).

## Research Landscape

> This change was informed by investigation of:
>
> - garrytan/gstack `design-consultation/` (SKILL.md 1230 lines + `sections/proposal-and-preview.md` 408 lines + manifest.json): the reference design-system workflow — Phase 0 pre-checks, Phase 1 product context, Phase 2 research, Phase 3 complete proposal (aesthetic/typography/color/spacing/layout/motion), Phase 4 drill-downs, Phase 5 preview (mockups or HTML), Phase 6 write DESIGN.md. Its DESIGN.md template (`## Design System` section with Product Context / Aesthetic Direction / Typography / Color / Spacing / Layout / Motion / Decisions Log) is the artifact shape worth keeping.
> - gstack `plan-design-review/SKILL.md` (1522 lines): plan-phase interactive design review — Step 0 design scope assessment (0A initial rating, 0B DESIGN.md status, 0C design leverage, 0D focus areas), UI scope detection, 0-10 rating method, outside design voices. Only the UI audit machinery survives the port; platform/branch gates, plan-mode EXIT gate, codex design voice, and gstack plumbing are dropped per user requirement.
> - gstack `design-review/SKILL.md` (1994 lines): audit baseline with modes (full/quick/deep/diff-aware/regression) and Phases 1-4 (first impression, design system extraction, page-by-page visual audit with a 10-category ~80-item checklist + trunk test, interaction flow review). The TESTING.md bootstrap phase is non-UI and dropped.
> - gstack `design-html/SKILL.md` (1511 lines): input detection (approved.json / design variants / clean slate), design analysis, framework detection, HTML/CSS generation, live-reload preview loop, design-token extraction. Pretext-specific routing is dropped; generation targets the detected project framework.
> - gstack `design-shotgun/SKILL.md` (1373 lines): session detection, context gathering, taste memory, variant generation (concept → confirm → parallel), comparison board + feedback loop, approval, save. Feeds `approved.json` into design-html.
> - bp internals (verified this session): `src/templates/workflows/registry.ts` maps step → `{skill, command}` getters (11 steps); `src/templates/workflows/ff.ts` is the minimal template shape (SkillTemplate = name/description/instructions; CommandTemplate = description/category/tags/content); `src/cli.ts` registers commands via per-file `register`; platform generators each hold a STEPS array mirroring registry keys (pi/skills.ts 11 keys, omp/skills.ts 11 + omp/commands.ts, codex/skills.ts, agent/skills.ts 11); `src/commands/bp-dispatch.ts` has FORMATS (per-platform dispatch tool text), EXECUTOR_ISOLATION, ROLE_TEMPLATES (planner → design/tasks/spec/global-spec; reviewer → review); pi extension `detectAgentTypeFromPrompt` maps agent-type markers per role; `src/templates/artifacts/` holds the 7 output templates.

## Approach

Port the five gstack design workflows as five auxiliary workflow steps, one change, five PRs. Each step's workflow template is written fresh (not copied): strip every gstack binary/config/state dependency, keep the phase structure and design judgment content, and re-express as bp-style orchestrator instructions (Step 0..N, Input, Steps, Output, Guardrails) that dispatch the new `designer` sub-agent, use `bp` CLI + platform browsing tools, and produce artifacts at the agreed locations (root `DESIGN.md`; change-dir `design-review.md`; `design/` scratch dir for shotgun variants + `approved.json` when no change is active). Content is tool-agnostic: "use your browser capability" instead of `$B goto`, "HTML preview page" instead of the design binary.

`plan-design-review` is the UI-audit-only variant: UI scope detection → DESIGN.md status → 0-10 rating → focus areas → design-system conformance checklist for the planned UI changes → verdict routing into the existing plan review cycle.

The registry addition automatically flows into all platform generators (their STEPS arrays are extended in the same change), and `bp update` regenerates skills so every configured platform (incl. this repo's pi dogfood) picks up the five new `bp:*` skills.

## Deliverables

### PR-1: Workflow step templates for the design track

- **Domain**: specs/design/spec.md
- **Behavior**: The system SHALL register five design workflow steps (`design`, `design-html`, `design-review`, `design-shotgun`, `plan-design-review`) in `WORKFLOW_REGISTRY`, each providing a skill template (`bp:<name>`) and a command template whose instructions are self-contained markdown (no external binaries, no platform-specific paths, no template placeholders).

**Rationale**:
The registry is the single source of truth for the workflow — every platform skill and command derives from it. Making the design track a registry citizen (like ff/loop/refactor) means one template authoring step covers pi, OMP, Claude Code, .agent, and Codex outputs automatically. The adapted content must preserve gstack's design judgment (phases, checklists, coherence rules) while dropping all gstack runtime dependencies, otherwise the skills only work inside gstack's harness. Per user: content adapted to this project (bp conventions), platform-agnostic.

**Research**:

| Source | Finding | Impact |
| -------- | --------- | -------- |
| gstack design-consultation/SKILL.md + sections/proposal-and-preview.md | Phase structure 0-6, DESIGN.md shape (`## Design System` + context/aesthetic/typography/color/spacing/layout/motion/decisions) | Template `bp design` keeps phases 0-6 + the DESIGN.md shape |
| gstack plan-design-review/SKILL.md | UI scope detection, 0-10 rating, DESIGN.md status, focus areas | `bp plan-design-review` keeps UI-audit subset only (user requirement) |
| gstack design-review/SKILL.md | Modes + Phases 1-4, 10-category audit checklist | `bp design-review` keeps audit baseline; drops TESTING.md bootstrap |
| gstack design-html/SKILL.md | Input detection, framework detection, preview/refine loop, token extraction | `bp design-html` keeps generation loop; drops Pretext routing |
| gstack design-shotgun/SKILL.md | Variant gen → comparison → approval → approved.json | `bp design-shotgun` keeps the loop; scratch output to `design/` |
| bp src/templates/workflows/ff.ts | Minimal SkillTemplate/CommandTemplate shape | 5 new template files mirror this shape |

**Alternatives Considered**:

| Alternative | Reason Rejected |
| ------------- | ---------------- |
| Copy gstack SKILL.md bodies verbatim | 1300-2000 lines each, bound to gstack binaries/config/telemetry; violates "adapt to this project" |
| One combined "bp design" mega-step | User asked for independent skills and commands per capability |
| Put design templates under src/templates/design/ instead of workflows/ | Platform generators iterate WORKFLOW_REGISTRY; separate dir would require a parallel registry and break skill generation |

**Risks & Mitigations**:

| Risk | Likelihood | Mitigation |
| ------ | ----------- | ------------ |
| Ported content drifts from gstack's proven phases | med | Keep phase names + core checklists in the templates; note provenance in a comment |
| Templates too long (gstack bodies are huge) | med | Target lean 120-250 line templates; full gstack source stays reference-only |
| Placeholders leak into generated skills | low | Template render test asserts no `{{` remains for every new step |

- **Verify**: Unit test: `WORKFLOW_REGISTRY` has 16 steps; each new step's skill+command template renders without `{{`; instruction text contains no `~/.gstack`, `Pretext`, or `gstack-config`.
- **Files**: src/templates/workflows/design.ts, design-html.ts, design-review.ts, design-shotgun.ts, plan-design-review.ts, registry.ts

### PR-2: Designer sub-agent role + dispatch + model tier

- **Domain**: specs/design/spec.md
- **Behavior**: The system SHALL provide a `designer` sub-agent (system prompt in `AGENT_PROMPTS`) and SHALL output per-platform dispatch instructions for it from `bp dispatch designer`, including a configurable model tier.

**Rationale**:
bp's architecture is orchestrator-dispatch: workflow steps instruct the orchestrator to delegate to sub-agents (planner/executor/reviewer/…). Design work is a distinct specialty — a consultant proposing a system, an auditor reviewing against it — that does not fit planner (technical design) or reviewer (spec/quality/goal gates). One `designer` role covers all five design steps: consultation, HTML generation, audit, variant generation, and plan-phase UI review share the same design judgment prompt with step-specific tasks supplied at dispatch. Config model tier lets users route design work to a strong model without touching prompts.

**Research**:

| Source | Finding | Impact |
| -------- | --------- | -------- |
| bp src/templates/agents/index.ts | AGENT_PROMPTS map, ENGINEERING-CONSTRAINT/CAPABILITY-COMPENSATION sections, AGENT_CONSTRAINTS shared block | Designer prompt follows the same shape; shares AGENT_CONSTRAINTS |
| bp src/commands/bp-dispatch.ts | FORMATS/ROLE_TEMPLATES/EXECUTOR_ISOLATION maps | Add `designer` role: FORMATS entries per platform, ROLE_TEMPLATES.designer → output templates |
| bp src/core/config.ts | PROFILE_MODEL_MAP tiered model resolution | Add `designer` tier (default: the standard planner-tier model) |

**Alternatives Considered**:

| Alternative | Reason Rejected |
| ------------- | ---------------- |
| No new agent; orchestrator does design work inline | Violates bp's dispatch architecture and bloats the orchestrator; design judgment needs its own context |
| Reuse reviewer agent for design audits | Reviewer prompt is spec/quality/goal-gate bound; design audit needs visual/UX lens |

**Risks & Mitigations**:

| Risk | Likelihood | Mitigation |
| ------ | ----------- | ------------ |
| Designer prompt drifts from bp constraint conventions | low | Mirror ENGINEERING-CONSTRAINT/CAPABILITY-COMPENSATION structure; agents test asserts presence |
| Dispatch maps miss a platform | med | Test iterates all platforms asserting a designer FORMATS entry |

- **Verify**: `AGENT_PROMPTS` contains `designer` (agents test); `bp dispatch designer` prints per-platform instructions; config accepts `designer` model tier.
- **Files**: src/templates/agents/index.ts, src/commands/bp-dispatch.ts, src/core/config.ts, tests/templates/agents.test.ts

### PR-3: Five design CLI commands

- **Domain**: specs/design/spec.md
- **Behavior**: The system SHALL provide CLI commands `bp design`, `bp design-html`, `bp design-review`, `bp design-shotgun`, and `bp plan-design-review`, each printing its step's orchestrator instructions (with optional change-name argument where scoped) and exiting 0.

**Rationale**:
User requirement: each design capability must be both a skill and a command. bp commands are instruction printers — they output the workflow steps the orchestrating agent executes (same contract as `bp propose`/`bp plan`). Five thin command files registered in `src/cli.ts` complete the user-visible surface: `bp design` starts the design system consultation, `bp design-html` implements it, `bp design-review` audits, `bp design-shotgun` explores variants, `bp plan-design-review` audits UI scope at plan time.

**Research**:

| Source | Finding | Impact |
|--------|---------|--------|
| src/cli.ts | per-file `register` pattern, Commander.js | 5 register calls + 5 command files |
| src/commands/bp-ff.ts pattern (via templates) | commands print instructions from the workflow template | Command files reuse `getXCommandTemplate` content |

**Alternatives Considered**:

| Alternative | Reason Rejected |
| ------------- | ---------------- |
| Single `bp design <subcommand>` | User asked for independent commands; flat naming matches existing bp-* surface |
| Commands execute work directly | Breaks orchestrator-dispatch contract; bp commands never do the work |

**Risks & Mitigations**:

| Risk | Likelihood | Mitigation |
| ------ | ----------- | ------------ |
| Command help drift from template content | low | Commands read from the same registry getters |
| Name collision with future steps | low | `bp design*` prefix reserved in help text |

- **Verify**: `bp --help` lists all five; each command exits 0 and prints non-empty instructions; command tests snapshot output.
- **Files**: src/commands/bp-design.ts, bp-design-html.ts, bp-design-review.ts, bp-design-shotgun.ts, bp-plan-design-review.ts, src/cli.ts

### PR-4: Platform integration (skills, commands, agent detection, dogfood)

- **Domain**: specs/design/spec.md
- **Behavior**: The system SHALL generate the five design steps' skills (and commands where the platform has them) for every configured platform, and SHALL detect the `designer` agent type in the pi extension's context augmentation.

**Rationale**:
The registry addition is inert until each platform generator's STEPS list includes the new steps. pi/omp/codex/agent skill generators each hold an explicit STEPS array (mirroring registry keys) — all four must grow from 11 to 16. OMP also generates slash commands (`bp:design` etc.) via omp/commands.ts. The pi extension's `detectAgentTypeFromPrompt` (title-phrase markers per role) must gain a `designer` marker so designer sub-agent sessions get the right bp-context augmentation instead of falling to `default`; the same applies to any OMP agent-type discrimination. Snapshot tests regenerate; `bp update` dogfoods the five skills into `.pi/skills/bp-*` (this repo runs pi) and other configured platforms.

**Research**:

| Source | Finding | Impact |
| -------- | --------- | -------- |
| src/integrations/pi/skills.ts | STEPS: WorkflowStep[] 11 keys → skills | +5 keys |
| src/integrations/omp/skills.ts + omp/commands.ts | STEPS 11 + command defs with usesAgent/agents | +5 steps; commands gain bp:design* with agents ['designer'] |
| src/integrations/codex/skills.ts, agent/skills.ts | STEPS 11 | +5 keys |
| src/integrations/pi/extension-runtime.ts + extension.tmpl.ts | detectAgentTypeFromPrompt title-phrase markers | + designer marker + regression test |
| bp/changes/archive/2026-08-14-add-pi-platform/ | prior pi platform change (this repo) | dogfood `.pi/skills/bp-design*` after `bp update` |

**Alternatives Considered**:

| Alternative | Reason Rejected |
| ------------- | ---------------- |
| Derive STEPS dynamically from WORKFLOW_REGISTRY everywhere | Existing generators hardcode lists + descriptions; refactor is out of scope and risks snapshot churn across platforms |
| Skip pi extension detection (designer falls to default) | Designer sessions would miss role-specific context; extension tests pin detection |

**Risks & Mitigations**:

| Risk | Likelihood | Mitigation |
| ------ | ----------- | ------------ |
| Snapshot churn across 4 generators | high | Regenerate intentionally with `--update`; review diffs are new-step-only |
| Pi extension marker collision | low | designer marker phrase chosen disjoint from existing markers (test-pinned) |
| Dogfood `.pi/` regenerated skills diverge from templates | low | Byte-deterministic templates; diff check in dogfood |

- **Verify**: `npx vitest run` green incl. regenerated snapshots; `bp update` emits `.pi/skills/bp-design*/SKILL.md` (+ omp/codex/agent equivalents when configured); pi extension detection test covers `designer`.
- **Files**: src/integrations/{pi,omp,codex,agent}/*.ts + **snapshots**/**, src/templates/pi/extension.tmpl.ts

### PR-5: Design artifacts + core-loop advisory hooks

- **Domain**: specs/design/spec.md
- **Behavior**: The system SHALL provide a `design-system` artifact template whose output is written to the repository root as `DESIGN.md`, SHALL tolerate a `design-review.md` change artifact in the continue engine, and SHALL include advisory references to `bp plan-design-review` and `bp design-review` in the plan/check step instructions for UI-scoped changes.

**Rationale**:
User decision: design-system doc lives at root `DESIGN.md` (cross-change source of truth, analogous to `bp/specs/`; archive does not merge it — `bp design` updates it in place). The audit report needs a home per change: `bp/changes/<name>/design-review.md`, which the continue engine must recognize so it is not treated as an error or gating artifact. The core loop stays authoritative but should surface the design track: plan instructions mention `bp plan-design-review` when the change touches UI; check instructions mention `bp design-review` for UI-scoped changes — advisory text only, no gate.

**Research**:

| Source | Finding | Impact |
| -------- | --------- | -------- |
| src/templates/artifacts/index.ts | 7 output templates (proposal/design/tasks/spec/review/roadmap/config) | + design-system template |
| src/core/artifact-validator.ts + continue.ts | artifact graph from file existence | register design-review.md so continue treats it as a known optional artifact |
| src/templates/workflows/plan.ts, check.ts | step instruction text | append advisory design-track hints |
| gstack DESIGN.md template (`## Design System`) | section shape | adapt into design-system template |

**Alternatives Considered**:

| Alternative | Reason Rejected |
| ------------- | ---------------- |
| DESIGN.md inside bp/changes/ | User chose root DESIGN.md; change-local design docs die at archive |
| No validator change (design-review.md unrecognized) | Continue engine may misreport unknown artifacts; explicit registration is the root-cause fix |
| Hard-gate plan/check on design steps | User chose advisory-only hooks; core 8-step semantics unchanged |

**Risks & Mitigations**:

| Risk | Likelihood | Mitigation |
| ------ | ----------- | ------------ |
| Root DESIGN.md conflicts with existing DESIGN.md | low | `bp design` checks for an existing DESIGN.md and offers update/fresh/cancel (gstack Phase 0 pattern) |
| design-review.md registered but never produced | low | Optional artifact — absence must not block continue (tested) |
| Advisory text drifts from actual design commands | low | Text references the exact `bp <name>` commands |

- **Verify**: artifact template renders without `{{`; continue engine passes a change dir containing design-review.md; plan/check template text contains the advisory references.
- **Files**: src/templates/artifacts/design-system.ts (+index.ts), src/core/artifact-validator.ts, src/templates/workflows/plan.ts, check.ts, tests/

## Dependencies

- PR-1 (registry + templates) → PR-4 (platform STEPS consume registry keys). PR-2 (designer agent) → PR-3 (commands dispatch the designer) and PR-4 (agent detection). PR-5 (hooks) → PR-1 (plan/check text references design steps). PR-3 independent-ish (commands read registry getters; safe after PR-1).
- No dependency on the pi platform change (archived 2026-08-14) beyond the existing pi generator it touches.
- Config `models.designer` tier (PR-2) optional at runtime — falls back to default when unset.

## Roadmap Reference

Milestone M1 - v2 Architecture Refactoring, Phase P1.2 - Commands & Templates (IN_PROGRESS).
