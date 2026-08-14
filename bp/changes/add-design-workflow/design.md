# Design: add-design-workflow

<!--
  Structured technical design. Produced by the planner agent.
  Ports five gstack UI design workflows into bp as auxiliary workflow steps,
  a designer sub-agent, five CLI commands, platform integration, and design artifacts.
-->

## Impact Analysis

Research basis: `bp map list`, `bp map module src/templates/workflows`, direct reads of every touched module, `git log` verification of commit 02dd037 (colon-in-description fix for ff/loop).

### Direct Impacts (files modified)

| File | Action |
| ------ | -------- |
| `src/templates/workflows/design.ts` | create |
| `src/templates/workflows/design-html.ts` | create |
| `src/templates/workflows/design-review.ts` | create |
| `src/templates/workflows/design-shotgun.ts` | create |
| `src/templates/workflows/plan-design-review.ts` | create |
| `src/templates/workflows/registry.ts` | modify (11 → 16 registry entries) |
| `src/templates/agents/index.ts` | modify (DESIGNER_PROMPT + AGENT_PROMPTS['designer']) |
| `src/commands/bp-dispatch.ts` | modify (ROLE_TEMPLATES['designer'] = ['design-system']) |
| `src/types/config.ts` | modify (PROFILE_MODEL_MAP gains `designer` tier) |
| `src/commands/bp-design.ts` | create |
| `src/commands/bp-design-html.ts` | create |
| `src/commands/bp-design-review.ts` | create |
| `src/commands/bp-design-shotgun.ts` | create |
| `src/commands/bp-plan-design-review.ts` | create |
| `src/cli.ts` | modify (5 register imports + calls) |
| `src/integrations/pi/skills.ts` | modify (STEPS 11 → 16) |
| `src/integrations/omp/skills.ts` | modify (STEPS 10 → 15; refactor absent pre-existing) |
| `src/integrations/omp/commands.ts` | modify (STEPS 11 → 16, agents: ['designer']) |
| `src/integrations/claude-code/commands.ts` | modify (STEPS 11 → 16) |
| `src/integrations/codex/skills.ts` | modify (STEPS 11 → 16) |
| `src/integrations/agent/skills.ts` | modify (STEPS 11 → 16) |
| `src/integrations/pi/agents.ts` | modify (PI_AGENT_DEFS 6 → 7) |
| `src/integrations/agent/agents.ts` | modify (role list + designer) |
| `src/integrations/claude-code/agents.ts` | modify (role list + designer) |
| `src/integrations/omp/agents.ts` | modify (AGENT_DEFS + designer) |
| `src/integrations/pi/extension-runtime.ts` | modify (AgentType + marker + augmentation) |
| `src/templates/pi/extension.tmpl.ts` | modify (lockstep mirror) |
| `src/templates/artifacts/design-system.ts` | create |
| `src/templates/artifacts/index.ts` | modify (re-export + ARTIFACT_TEMPLATES entry) |
| `src/commands/bp-template.ts` | modify (FILENAMES['design-system'] = 'DESIGN.md') |
| `src/core/artifact-validator.ts` | modify (design-review.md known optional artifact) |
| `src/templates/workflows/plan.ts` | modify (advisory bp plan-design-review note) |
| `src/templates/workflows/check.ts` | modify (advisory bp design-review note) |
| Snapshot + count-pin tests | modify (see Test Impacts) |
| `.pi/`, `.omp/`, `.claude/`, `.agents/`, `.codex/` repo-root dogfood outputs | regenerate via `bp update` |

### Indirect Impacts (callers / dependents)

- **WORKFLOW_REGISTRY consumers** — `getWorkflowInstructions()` (src/core/continue.ts) and every platform generator iterate the registry; all read-only consumers accept the 5 new keys without change. The design steps are **auxiliary** (like ff/loop/refactor): they are NOT added to the continue/state transition graph (`getTransition`, `getNextSteps` in state machine) — `bp continue` never routes into them; they are invoked explicitly.
- **pi extension `bp_subagent` tool** — discovers agents from `.pi/agents/` automatically; `.pi/agents/bp-designer.md` becomes delegatable with zero code change once generated.
- **pi skill discovery** — pi discovers `.pi/skills/bp-<step>/` recursively; the 5 new skills become invocable (`bp:design` etc.) after `bp update` with zero code change.
- **`bp update` / `generateAll`** — src/generators/index.ts delegates to per-platform providers; no generator-coordination change needed.
- **OMP extension** — not touched: OMP agent-type discrimination reads `ctx.agentTemplate` (template *file names*, driven by AGENT_DEFS), so `bp-designer.md` is already recognized as a valid sub-agent template. Only the **pi** extension's prompt-marker detection (DS-6) needs the designer entry.

### Test Impacts (existing tests that may break)

Count pins and golden snapshots that MUST be updated in T-5 (GREEN):

| Test | Pin | New value |
| ------ | ----- | ----------- |
| `src/integrations/pi/index.test.ts` | 18 `.pi/` files | 24 (16 skills + 7 agents + 1 extension) |
| `src/integrations/pi/skills.test.ts` | PI_SKILL_DEFS 11 | 16 |
| `src/integrations/pi/agents.test.ts` | PI_AGENT_DEFS 6 | 7 |
| `src/integrations/codex/skills.test.ts` | CODEX_SKILL_DEFS 11 | 16 |
| `src/integrations/agent/skills.test.ts` | 11 skills | 16 |
| `src/integrations/agent/agents.test.ts` | 6 agents | 7 |
| `src/integrations/claude-code/commands.test.ts` | 11 commands | 16 |
| `src/integrations/claude-code/agents.test.ts` | 6 agents | 7 |
| `src/generators/__snapshots__/multi-platform.test.ts.snap` | golden file set | regenerated (+5 steps, +designer agent) |
| per-platform snapshots (`src/integrations/{pi,omp,codex,agent,claude-code}/__snapshots__/`) | file sets | regenerated with `npx vitest run --update` |

No change: `src/integrations/opencode/commands.test.ts` + `src/generators/opencode.test.ts` (11 commands / 6 agents) — opencode intentionally untouched (D-6).

## Design Items

### DS-1: Design-track workflow step templates

- **Refs**: PR-1
- **Source**: PR-1 (proposal.md)
- **Responsibility**: Register five auxiliary workflow steps (`design`, `design-html`, `design-review`, `design-shotgun`, `plan-design-review`) in `WORKFLOW_REGISTRY`, each providing a skill template and a command template sharing one self-contained `instructions` string.
- **Requirements**:
  - `WORKFLOW_REGISTRY` contains all five new keys, each a `WorkflowEntry { skill, command }` resolving to the new getters.
  - Each step's `get<Step>SkillTemplate().instructions` and `get<Step>CommandTemplate().content` are the identical string, containing `## Input`, `## Steps`, `## Output`, `## Guardrails` in order (templates spec contract).
  - Instructions are English-only, self-contained markdown: no `~/.gstack`, `Pretext`, `gstack-config`, `$B goto`, or `design`/`browse` binary references; browsing is expressed as "use your platform's browser capability".
  - No `{{` template placeholders remain after render.
  - `plan-design-review` instructions are UI-audit-only: UI scope detection → DESIGN.md status → 0-10 rating → focus areas → design-system conformance checklist → verdict into the existing plan review cycle. No platform gates, no codex design voice, no plan-mode EXIT machinery.
  - Skill/command `description` strings contain NO `': '` (colon+space) — pi parseFrontmatter (gray-matter) throws on nested mappings (fixed repo-wide for ff/loop in commit 02dd037).
- **Constraints**: One file per step in `src/templates/workflows/` mirroring `ff.ts`'s exact module shape (`const instructions`, `export function get<X>SkillTemplate(): SkillTemplate`, `export function get<X>CommandTemplate(): CommandTemplate`); `CommandTemplate.category` = `'Workflow'`; templates are data (no I/O); registry stays `as const satisfies Record<string, WorkflowEntry>` so `WorkflowStep` auto-widens to 16 keys.
- **Acceptance Criteria**: `WORKFLOW_REGISTRY` has exactly 16 keys including the five new ones; for each new step, skill and command share byte-identical instructions; every new instructions string contains the four section headers in order; no `{{`, no gstack runtime tokens; every new description is free of `': '`.
- **Key Interfaces**: `getDesignSkillTemplate()`, `getDesignCommandTemplate()`, `getDesignHtmlSkillTemplate()`, `getDesignHtmlCommandTemplate()`, `getDesignReviewSkillTemplate()`, `getDesignReviewCommandTemplate()`, `getDesignShotgunSkillTemplate()`, `getDesignShotgunCommandTemplate()`, `getPlanDesignReviewSkillTemplate()`, `getPlanDesignReviewCommandTemplate()`.

#### Detailed Design

**Per-step instructions content** (120–250 lines each, adapted from gstack phase structure — keep phase names + core checklists, re-express as bp orchestrator instructions; note provenance in a file-header comment `/* Adapted from gstack <skill> — reference-only source */`):

- `design.ts` (`bp design`): **Step 0** pre-check — if root `DESIGN.md` exists, present update / fresh / cancel (update reuses prior decisions, fresh starts over, cancel aborts); **Step 1** product context (product, users, UI surface inventory); **Step 2** research (competitor/reference patterns via browser); **Step 3** complete design-system proposal — aesthetic direction, typography, color, spacing, layout, motion — with rationale per decision; **Step 4** drill-downs for any ambiguous area; **Step 5** preview (HTML preview page + browser screenshots when the platform supports browsing); **Step 6** write root `DESIGN.md` using the `## Design System` shape (Product Context / Aesthetic Direction / Typography / Color / Spacing / Layout / Motion / Decisions Log) — fetch `bp template design-system --stdout` for the shape. Dispatch: `bp dispatch designer` for the consultation work.
- `design-html.ts` (`bp design-html`): **Input detection** — prefer `design/approved.json` (shotgun output) → else root `DESIGN.md` → else clean slate; **design analysis** (extract tokens from DESIGN.md); **framework detection** (read `package.json`/config per `bp config.yaml` context); **generation** (HTML/CSS per detected framework, design tokens as CSS custom properties); **preview/refine loop** (HTML preview page + screenshots; refine on visual feedback); **token extraction** (final tokens written back into DESIGN.md Decisions Log). Dispatch `bp dispatch designer`.
- `design-review.ts` (`bp design-review`): **mode selection** (full / quick / deep / diff-aware / regression); **Phase 1** first impression (10-second glance notes); **Phase 2** design-system extraction (compare UI against DESIGN.md tokens); **Phase 3** page-by-page visual audit — 10-category checklist (~80 items) + trunk test (every page shares the system); **Phase 4** interaction-flow review. Output: `bp/changes/<name>/design-review.md` when a change is active (`$ARGUMENTS`), else `design/review-<iso-date>.md`; report carries a 0-10 rating and a prioritized issue list. Dispatch `bp dispatch designer`.
- `design-shotgun.ts` (`bp design-shotgun`): **session detection** (design/ scratch dir reuse), **context gathering** (DESIGN.md, product context, constraints), **taste memory** (prior approved variants), **variant generation** — propose 2-3 concepts, confirm direction with the user, then generate variants in parallel (browser mockups or HTML previews); **comparison board** — side-by-side with strengths/weaknesses; **feedback loop** (refine per feedback, re-board); **approval** (user picks a winner); **save** — `design/approved.json` (winner + rationale + tokens). Dispatch `bp dispatch designer`.
- `plan-design-review.ts` (`bp plan-design-review`): **Step 0** UI scope detection (proposal deliverables touching user-facing screens/components/styling? if none, verdict "no UI scope" and stop); **Step 1** DESIGN.md status (exists? current? missing → recommend `bp design`); **Step 2** 0-10 initial rating of the planned UI approach; **Step 3** focus areas (2-4 highest-leverage design risks); **Step 4** conformance checklist — planned changes vs existing design system (typography/color/spacing/layout/motion); **Step 5** verdict routing — attach the audit to the plan review (`review.md` input) as advisory input; the verdict does NOT gate `bp plan`. Dispatch `bp dispatch designer --change <name>`.

**Registration** in `registry.ts`: add 5 imports and 5 entries (`design`, `design-html`, `design-review`, `design-shotgun`, `plan-design-review`) to `WORKFLOW_REGISTRY`; no other registry code changes — `WorkflowStep = keyof typeof WORKFLOW_REGISTRY` widens automatically.

**Descriptions (hyphen style, no `': '`)**:

| Step | description |
| ------ | ------------- |
| design | `Design system consultation - complete design proposal written to root DESIGN.md` |
| design-html | `Design to production HTML/CSS - implement DESIGN.md against the detected project framework` |
| design-review | `Designer's-eye QA audit - full visual and UX audit against DESIGN.md` |
| design-shotgun | `Multi-variant design exploration - generate, compare, and approve design variants` |
| plan-design-review | `Plan-phase UI audit - UI scope detection and 0-10 rating before implementation` |

**Error paths**: instructions tell the orchestrator to stop and ask the user when (a) `bp dispatch designer` returns a non-zero/failed run, (b) DESIGN.md exists and the user cancels (design step aborts, exit with no artifact written), (c) browser capability is unavailable (preview step degrades to a written description of intended visuals), (d) a change is active but the change dir is missing for a change-scoped step (design-review/plan-design-review) — instruct `bp propose <name>` first.

---

### DS-2: Designer sub-agent prompt

- **Refs**: PR-2
- **Source**: PR-2 (proposal.md)
- **Responsibility**: Provide the `designer` sub-agent system prompt covering consultation, HTML generation, visual audit, variant exploration, and plan-phase UI review — one role, step-specific task supplied at dispatch.
- **Requirements**: `AGENT_PROMPTS['designer']` resolves to a non-empty English `DESIGNER_PROMPT` containing `## Role`, `## Core Principles`, `## Inputs`, `## Behaviors`, `## Output`, `## Guardrails`; embeds the shared `AGENT_CONSTRAINTS` block; role-title line contains the marker phrase `Design Consultant` (disjoint from all existing markers); prompts a single-specialty identity (design judgment), not planner/reviewer duties.
- **Constraints**: Structure mirrors PLANNER_PROMPT (ENGINEERING-CONSTRAINT / CAPABILITY-COMPENSATION HTML comments on structural sections); no source-code editing authority (design artifacts only); never runs `bp continue`; English-only; the marker MUST NOT be a substring of any existing prompt title (`Change Design Specialist` contains `Design Specialist` — hence `Design Consultant`).
- **Acceptance Criteria**: `AGENT_PROMPTS['designer'] === DESIGNER_PROMPT` and is non-empty; the prompt contains all six section headers in order; it contains the substring `Design Consultant`; it does not contain `Change Design Specialist`; agents tests pass for every platform agent generator emitting `bp-designer.md`.
- **Key Interfaces**: `export const DESIGNER_PROMPT: string`, `AGENT_PROMPTS['designer']`.

#### Detailed Design

Module: `src/templates/agents/index.ts` (append next to FIXER_PROMPT; `AGENT_PROMPTS` gains `designer: DESIGNER_PROMPT`).

Prompt body outline (author fresh, ~120 lines):

- `## Role` — `You are a **Design Consultant**...` + ENGINEERING-CONSTRAINT comment; states the role serves all five design steps with the step's task supplied at dispatch.
- `## Core Principles` — ENGINEERING-CONSTRAINT comment; 4-5 principles: (1) design judgment over process boilerplate, (2) every design decision carries rationale, (3) coherence — every element traces to the design system (trunk test), (4) evidence — browser screenshots/HTML previews over prose claims, (5) artifacts only — never edit source code.
- `${AGENT_CONSTRAINTS}` — shared block, verbatim.
- `## Inputs` — root `DESIGN.md` (when present), `bp/changes/<name>/proposal.md` + `design.md` + `specs/` (when a change is active), `bp/config.yaml` (stack/profile), platform browser capability, prior `design/approved.json` (shotgun/design-html).
- `## Behaviors` — CAPABILITY-COMPENSATION comments; Step 1 read inputs; Step 2 execute the dispatched step (consultation / html / review / shotgun / plan-review) per the step instructions the orchestrator passes; Step 3 write the artifact at the agreed location (root `DESIGN.md`, change-dir `design-review.md`, or `design/` scratch); Step 4 report a diff/artifact summary.
- `## Output` — root `DESIGN.md` (design), `bp/changes/<name>/design-review.md` or `design/review-<date>.md` (design-review), `design/` variants + `approved.json` (shotgun), HTML/CSS under the project's web root or `design/` (design-html), plan-review notes for the reviewer (plan-design-review).
- `## Guardrails` — ENGINEERING-CONSTRAINT comment; NEVER edit source code (report needed code changes as notes); NEVER run `bp continue`/`bp plan`/`bp apply`; ONLY the assigned step; all output in English; when DESIGN.md exists and the task is consultation, present update/fresh/cancel to the orchestrator rather than silently overwriting.

Error handling: missing input artifacts → stop and report which input is missing; browser unavailable → degrade to written visual descriptions; existing DESIGN.md conflict → ask, never overwrite silently.

---

### DS-3: Designer dispatch output + model tier

- **Refs**: PR-2
- **Source**: PR-2 (proposal.md)
- **Responsibility**: Make `bp dispatch designer` emit per-platform dispatch instructions and route design work to a configurable model tier.
- **Requirements**: `bp dispatch designer` prints a `## Dispatch: bp-designer (<platform>)` section per configured platform (omp, claude-code, agent, codex — the four FORMATS platforms), an `### Isolation` block (read-only role — no isolation), and `### Model Selection` with `Role: designer` and the resolved model; `ROLE_TEMPLATES['designer']` lists the `design-system` output template; `PROFILE_MODEL_MAP` contains a `designer` tier defaulting to the planner-tier model per profile; `config.models.designer` overrides the default (existing `resolveModelsForLevel` spread).
- **Constraints**: `FORMATS` and `EXECUTOR_ISOLATION` are UNCHANGED (verified: FORMATS is platform-keyed with `bp-<role>` placeholders, so the designer role flows automatically; `isExecutorLike('designer')` stays false — designer writes design artifacts, never source code, matching planner/reviewer isolation). No schema change: `ModelMap = Record<string, string>` already accepts `designer`.
- **Acceptance Criteria**: `bp dispatch designer` in an initialized project with the default platform set prints four Dispatch sections and a `Role: designer` Model Selection line; setting `config.models.designer` changes the printed model; `bp dispatch designer --change <name>` includes the change context line.
- **Key Interfaces**: `ROLE_TEMPLATES['designer']`, `PROFILE_MODEL_MAP[<profile>].designer`, unchanged `dispatchHandler`.

#### Detailed Design

- `src/commands/bp-dispatch.ts`: add one line `designer: ['design-system'],` to `ROLE_TEMPLATES`. Nothing else in this module changes. The dispatch handler's model line comes from `models = resolveModelsForLevel(config, profile, round)`; `models['designer']` resolves once PROFILE_MODEL_MAP (or config.models) carries the key.
- `src/types/config.ts`: add `designer` to each profile's `PROFILE_MODEL_MAP` entry, mirroring that profile's `planner` value: trivial/light `'pi/task'`, standard `'pi/plan'`, critical `'pi/plan'` (proposal: "default: the standard planner-tier model").
- Error paths: unknown platform already skipped by `if (!fmt) continue`; designer with no `--change` prints change-agnostic instructions (fine — design and design-html are change-agnostic); the `designer` role is NOT in `isExecutorLike`, so `--target` is not required and isolation prints `Read-only role — no isolation needed.`

---

### DS-4: Five design CLI commands

- **Refs**: PR-3
- **Source**: PR-3 (proposal.md)
- **Responsibility**: Expose `bp design`, `bp design-html`, `bp design-review`, `bp design-shotgun`, `bp plan-design-review` as instruction printers.
- **Requirements**: Each command accepts an optional `[change-name]` positional, prints its step's full instructions from `WORKFLOW_REGISTRY`, and exits 0; outside a bp project each prints `Not in a blueprint project. Run "bp init" first.` to stderr and exits 1; `bp --help` lists all five.
- **Constraints**: Commands never execute design work (orchestrator-dispatch contract, same as `bp plan`/`bp refactor`); follow the `bp-refactor.ts` command pattern (findBpDir gate → `getWorkflowInstructions(step, bpDir)` → print); registered in `src/cli.ts` via the per-file `register` pattern; kebab-case command names; `bp design*` prefix reserved.
- **Acceptance Criteria**: `bp design` in an initialized project prints non-empty instructions containing `## Steps` and exits 0; `bp design` outside a project prints the not-in-project error and exits 1; `bp --help` output contains all five command names.
- **Key Interfaces**: `register(program: Command)` in each of the five files; `src/cli.ts` `registerDesign*` imports.

#### Detailed Design

Each file (`bp-design.ts`, `bp-design-html.ts`, `bp-design-review.ts`, `bp-design-shotgun.ts`, `bp-plan-design-review.ts`) mirrors `bp-refactor.ts` minus the `analyze` subcommand:

```ts
export function register(program: Command): void {
  program
    .command('design [change-name]')
    .description('Output the design workflow instructions (design-system consultation -> root DESIGN.md)')
    .action((changeName: string | undefined) => designHandler('design', changeName));
}
```

Shared handler logic per file (or a tiny shared helper if preferred — 5 copies is also acceptable at ~25 lines each; keep per-file standalone to match the flat `bp-*.ts` convention):

1. `const bpDir = findBpDir();` — if `!bpDir`, `console.error('Not in a blueprint project. Run "bp init" first.'); process.exit(1);`
2. `const instructions = getWorkflowInstructions('<step>', bpDir);` — if falsy, `console.error('<Step> workflow instructions not found.'); process.exit(1);`
3. `console.log(instructions);` — exit 0 implicitly.

The `change-name` argument is advisory (passed through in the printed instructions as `$ARGUMENTS`); the command does not resolve or validate the change dir — validation happens in the workflow step execution. Error paths: not-in-project (exit 1), missing instructions (exit 1, defensive).

`src/cli.ts`: add `import { register as registerDesign } from './commands/bp-design.js';` (×5) and five `registerDesign(program);` calls in the existing block.

---

### DS-5: Platform generator STEPS growth + designer agent files

- **Refs**: PR-4
- **Source**: PR-4 (proposal.md)
- **Responsibility**: Extend every configured platform generator's step list and agent role list so `bp update` emits the five design skills/commands and the `bp-designer` agent file for every configured platform.
- **Requirements**: After `bp update`, pi emits `.pi/skills/bp-<design-step>/SKILL.md` ×5; omp emits `.omp/skills/bp-<design-step>/SKILL.md` ×5 and `.omp/commands/bp:<design-step>.md` ×5 (with `agents: ['designer']`, `usesAgent: true`); claude-code emits `.claude/commands/bp-design*.md` ×5; codex emits `.agents/skills/bp-<design-step>/SKILL.md` ×5; agent emits `.agent/skills/bp-<design-step>/SKILL.md` ×5; every agent generator (pi, omp, claude-code, agent) emits `bp-designer.md`; generation stays byte-deterministic; generated bodies byte-identical to the registry instructions.
- **Constraints**: STEPS arrays stay explicit lists (mirroring registry keys) — NOT derived dynamically (proposal decision; avoids cross-platform snapshot churn); descriptions use the exact strings from DS-1's table (hyphen style, no `': '`); opencode generators are NOT touched (D-6); `bp-update.ts` needs no change (it delegates to `generateAll(config)`); cleanup logic (pi/omp/codex stale removal) needs no change — this change only ADDS steps, nothing becomes stale.
- **Acceptance Criteria**: `PI_SKILL_DEFS` length 16; `CODEX_SKILL_DEFS` length 16; agent skills length 16; claude-code commands length 16; omp commands length 16; omp skills length 15; `PI_AGENT_DEFS` and the agent/claude-code/omp role lists length 7 including `designer`; `npx vitest run` green with regenerated snapshots; a second `bp update` run produces byte-identical output.
- **Key Interfaces**: `PI_SKILL_DEFS`/`generatePiSkills`, `SKILL_DEFS`/`generateAllSkills` (omp), `COMMAND_DEFS` (omp), `STEPS` (claude-code commands), `CODEX_SKILL_DEFS`/`generateCodexSkills`, agent `STEPS`, `PI_AGENT_DEFS`, `AGENT_DEFS` (omp), agent/claude-code role lists.

#### Detailed Design

Per generator, extend its `STEPS` array and description map with the five design steps (order: append after `refactor` in each list; pi STEPS is the canonical order — `init, roadmap, propose, plan, apply, check, archive, continue, ff, loop, refactor, design, design-html, design-review, design-shotgun, plan-design-review`):

- `src/integrations/pi/skills.ts` — STEPS 11 → 16; `piSkillDescription` map gains the five DS-1 descriptions. `PI_SKILL_DEFS` auto-derives.
- `src/integrations/omp/skills.ts` — STEPS 10 → 15 (its list lacks `refactor` — pre-existing gap, out of scope; do NOT add refactor here); `skillDescription` map + 5 entries.
- `src/integrations/omp/commands.ts` — `COMMAND_DEFS` gains 5 entries: `{ step: 'design', name: 'bp:design', description: <DS-1>, usesAgent: true, agents: ['designer'], argumentHint: undefined }` — for `plan-design-review` and `design-review`, `argumentHint: '[change-name]'`.
- `src/integrations/claude-code/commands.ts` — STEPS + 5 entries mirroring the omp command defs (name `bp:design*`, argumentHint per step). Included despite the proposal's file-list omission — verified necessary: this repo configures `claude-code` (bp/config.yaml), the refactor precedent generated `.claude/commands/bp-refactor.md` (platform-gen spec), and PR-4's SHALL says "for every configured platform" (D-5).
- `src/integrations/codex/skills.ts` — STEPS + description map + 5 keys.
- `src/integrations/agent/skills.ts` — STEPS + description map + 5 keys.
- `src/integrations/pi/agents.ts` — `PI_AGENT_DEFS` gains `{ role: 'designer', description: 'Design consultation, HTML generation, visual audit, and variant exploration', tools: [] }`; `generatePiAgents` already reads `config.models[def.role]` so `models.designer` flows into frontmatter automatically.
- `src/integrations/agent/agents.ts` — role list gains the same designer def (description: `'Design consultation, HTML generation, visual audit, and variant exploration'`).
- `src/integrations/claude-code/agents.ts` — role list gains designer (`effort: 'high'` per its existing convention for specialist roles).
- `src/integrations/omp/agents.ts` — `AGENT_DEFS` gains designer (`tools: [], spawns: '*'` per its convention).

Test updates (part of GREEN, not RED): bump the count pins listed in Test Impacts; regenerate all snapshots with `npx vitest run --update`; add a per-generator assertion that the five design step bodies are byte-identical to `WORKFLOW_REGISTRY[step].command().content` / `.skill().instructions` (mirrors the Refactor-Step-Generation scenario).

Error paths: none new — generators are pure functions over ProjectConfig; unknown platform rejection already exists at the provider level.

---

### DS-6: Pi extension designer agent-type detection

- **Refs**: PR-4
- **Source**: PR-4 (proposal.md)
- **Responsibility**: Teach the pi extension's prompt-based agent-type detection to recognize designer sessions, in both the runtime and the generated template, kept in lockstep.
- **Requirements**: `detectAgentTypeFromPrompt` (extension-runtime.ts) and `detectAgentType` (extension.tmpl.ts) return `'designer'` when the system prompt contains the `Design Consultant` marker; `AgentType` includes `'designer'`; a designer session still receives a `<bp-context>` block at session_start (paths-only body, same as default — no new augmentation section); all existing markers keep detecting their own roles (disjointness).
- **Constraints**: Marker must be disjoint from every existing marker and from all six shipped prompts; runtime and template sources change in lockstep (they embed the same marker list); `renderAugmentedBody` (runtime) and the template's augmentation switch handle the new type without altering any existing branch.
- **Acceptance Criteria**: `detectAgentTypeFromPrompt('...You are a **Design Consultant**...') === 'designer'`; a session whose prompt is the shipped `AGENT_PROMPTS['designer']` is detected as `designer`; `AGENT_PROMPTS['planner']` still detects as `planner`; the emitted block for designer contains `<bp-context>` and no `## Roadmap State` / `## Invariants` section; template's `detectAgentType` behaves identically.
- **Key Interfaces**: `AgentType` union, `AGENT_TYPE_MARKERS`, `detectAgentTypeFromPrompt`, `renderAugmentedBody`.

#### Detailed Design

- `src/integrations/pi/extension-runtime.ts`: (1) `AgentType` union gains `'designer'` (line ~40); (2) `AGENT_TYPE_MARKERS` appends `['designer', 'Design Consultant']` AFTER the existing six entries (order irrelevant for disjointness, but append keeps existing detection stable); (3) `renderAugmentedBody`: add explicit `else if (agentType === 'designer')` returning the un-augmented block — visually identical to the default case but explicit so future designer-specific augmentation (e.g. `## Design System` summary) has a hook; do NOT route designer to any existing branch (planner/executor/reviewer/refactorer) since those augmentations are role-specific.
- `src/templates/pi/extension.tmpl.ts`: mirror exactly — same marker string, same union (its `detectAgentType` returns plain `string`, so only the marker list + augmentation switch change), same lockstep comment. The two files are source-of-truth + generated-embed; a test asserts the marker string appears in both.
- Tests: extend `extension-runtime.test.ts` with (a) designer marker detection, (b) disjointness — for every shipped prompt in `AGENT_PROMPTS`, exactly the expected type is detected (this catches marker collision), (c) designer session emits paths-only block. Add a template lockstep test asserting both files contain `Design Consultant` (or extend the existing extension.test.ts).
- Error paths: none — detection failure falls back to `default`, which already emits the paths-only block (no crash, same as today).

---

### DS-7: Design artifacts — design-system template + design-review.md tolerance

- **Refs**: PR-5
- **Source**: PR-5 (proposal.md)
- **Responsibility**: Provide the `design-system` artifact template (the root `DESIGN.md` shape) and register `design-review.md` as a known optional change artifact.
- **Requirements**: `bp template design-system --stdout` prints a non-empty English template containing the `## Design System` section with Product Context, Aesthetic Direction, Typography, Color, Spacing, Layout, Motion, and Decisions Log blocks, with no unsubstituted placeholder tokens after render (only the name/date tokens, which the template handler substitutes); `bp template design-system` writes `DESIGN.md` at the target directory; `validateChange` recognizes `design-review.md` as a known optional artifact (present → validated pass-through; absent → no finding); `bp continue` (and `bp finish`) behave identically whether or not `design-review.md` exists in the change dir.
- **Constraints**: Artifact templates live in `src/templates/artifacts/` as TypeScript constants; the new constant ships in `design-system.ts` and is re-exported + registered from `index.ts` (matches PR-5's file list and the artifacts module structure); root filename `DESIGN.md` is an explicit user decision (root-file exception, like root `README.md`); archive does NOT merge DESIGN.md (it is a live root file).
- **Acceptance Criteria**: `ARTIFACT_TEMPLATES['design-system']` exists and renders without unsubstituted placeholders; `bp template design-system --stdout` exits 0 and prints the `## Design System` shape; `validateChange` on a change dir containing `design-review.md` reports it valid and adds no errors; continue's next-step command is identical with and without `design-review.md`.
- **Key Interfaces**: `DESIGN_SYSTEM_TEMPLATE` (ArtifactTemplate), `ARTIFACT_TEMPLATES['design-system']`, `FILENAMES['design-system'] = 'DESIGN.md'`, `validateChange` known-artifact list.

#### Detailed Design

- `src/templates/artifacts/design-system.ts` (NEW): `export const DESIGN_SYSTEM_TEMPLATE = '# Design System: <name>\n\n...'` — the gstack DESIGN.md shape adapted: `## Design System` root with subsections `### Product Context` (product/users/UI surface), `### Aesthetic Direction`, `### Typography` (scale, families, weights), `### Color` (palette roles, contrast rules), `### Spacing` (scale, density), `### Layout` (grid, breakpoints, component layout), `### Motion` (durations, easings, usage), `### Decisions Log` (date, decision, rationale). ~60-90 lines; each subsection is guidance prose + decision slots, not boilerplate questions. English-only. The name/date tokens are the only substitution points (handled by `templateHandler`).
- `src/templates/artifacts/index.ts`: `export { DESIGN_SYSTEM_TEMPLATE } from './design-system.js';` (or import + re-export) and add `'design-system': DESIGN_SYSTEM_TEMPLATE,` to `ARTIFACT_TEMPLATES` — `TEMPLATE_IDS` auto-widens so `bp template design-system` works and the `--help` type list includes it.
- `src/commands/bp-template.ts`: add `'design-system': 'DESIGN.md',` to `FILENAMES` so non-stdout writes target `DESIGN.md`.
- `src/core/artifact-validator.ts`: in `validateChange`, extend the `files` array with `{ name: 'design-review', type: 'design-review', path: join(dir, 'design-review.md') }`; `validateArtifact` already passes unknown types through `default: { valid: true }` — no new case needed. This makes design-review.md a *known* artifact (validated pass-through when present) instead of silently absent from results.
- `src/core/continue.ts`: NO code change (verified: next-step detection reads only schema artifacts — `checkArtifacts`, `existsSync` on proposal/design/tasks/review; there is no unknown-file scan that could flag design-review.md). Add a regression test asserting continue's output is byte-identical with and without design-review.md present (locks the tolerance contract).
- Tests (T-7 RED): `bp template design-system --stdout` contains `## Design System` and no unsubstituted `{{`; `validateChange` on a fixture change dir with `design-review.md` returns `results['design-review'].valid === true` and zero errors; continue tolerance test as above; absence of design-review.md does not block `bp finish` semantics (review verdict is the only gate).

---

### DS-8: Core-loop advisory hooks

- **Refs**: PR-5
- **Source**: PR-5 (proposal.md)
- **Responsibility**: Surface the design track from the core loop as advisory text in the plan and check step instructions.
- **Requirements**: The `plan` workflow instructions mention `bp plan-design-review <name>` when change scope touches UI; the `check` workflow instructions mention `bp design-review <name>` for UI-scoped changes; both are advisory — no MUST/gate language, no new schema steps, core 8-step semantics unchanged.
- **Constraints**: Text-only edits to `src/templates/workflows/plan.ts` and `check.ts` instruction strings; references use the exact command names; section structure (Input/Steps/Output/Guardrails) and existing content untouched; the templates spec's structure requirements still hold after the edit.
- **Acceptance Criteria**: `getPlanCommandTemplate().content` contains the substring `bp plan-design-review`; `getCheckCommandTemplate().content` contains the substring `bp design-review`; neither string contains a MUST gate tying the design step to the plan/check verdict.
- **Key Interfaces**: `getPlanSkillTemplate`/`getPlanCommandTemplate`, `getCheckSkillTemplate`/`getCheckCommandTemplate` (content unchanged in structure).

#### Detailed Design

- `plan.ts` — insert into the Step 2 "Classify change" block (after the lightweight/full classification bullets), one advisory bullet: `- **UI scope**: if any deliverable touches user-facing screens, components, or styling, suggest running \`bp plan-design-review $1\` after planning (advisory — the design audit informs the plan review but does not gate it).`
- `check.ts` — insert into Step 2 (Pre-check verification), one advisory sentence: `For UI-scoped changes, consider running \`bp design-review $1\` before the review (advisory — the audit report supplements review.md and does not gate the verdict).`
- Tests (T-8 RED): template-body assertions for the two substrings; a guard assertion that the strings contain no `MUST`/`SHALL` referencing the design commands.

## Architecture Decisions

### D-1: Design steps are registry citizens (workflows/, not a parallel design dir)

- **Status**: ACCEPTED
- **Decision**: Five new step template modules live in `src/templates/workflows/` and register in `WORKFLOW_REGISTRY` like ff/loop/refactor; one template authoring step covers every platform generator.
- **Reason**: Platform generators iterate `WORKFLOW_REGISTRY` (directly or via mirrored STEPS lists); a separate `src/templates/design/` would require a parallel registry and break skill generation (proposal's rejected alternative).
- **Alternatives**: Separate `src/templates/design/` dir (rejected — parallel registry, breaks generation); one combined `bp design` mega-step (rejected — user asked for independent skills/commands per capability).

### D-2: plan-design-review is UI-audit-only, advisory

- **Status**: ACCEPTED
- **Decision**: The ported plan-design-review drops platform/branch gates, the plan-mode EXIT gate, and codex design-voice machinery; it ends in verdict routing into the existing plan review cycle with no gate on `bp plan`.
- **Reason**: Explicit user requirement; core 8-step loop stays authoritative; design steps are auxiliary.
- **Alternatives**: Full gstack plan-design-review with gates (rejected by user requirement); no plan-phase audit at all (rejected — loses the design-leverage check gstack proved useful).

### D-3: Designer marker is `Design Consultant`

- **Status**: ACCEPTED
- **Decision**: `DESIGNER_PROMPT`'s role title is "You are a **Design Consultant**"; pi extension marker = `Design Consultant`.
- **Reason**: Markers must be disjoint substrings — `Design Specialist` would collide with the planner's title `Change Design Specialist` (which contains it as a substring), breaking detection.
- **Alternatives**: `Design Specialist` (rejected — substring collision); `UI Design Specialist` (rejected — unnecessary; longer, same risk profile as chosen).

### D-4: No FORMATS / EXECUTOR_ISOLATION changes in bp-dispatch.ts

- **Status**: ACCEPTED
- **Decision**: Only `ROLE_TEMPLATES['designer'] = ['design-system']` is added to bp-dispatch.ts.
- **Reason**: Verified — FORMATS is platform-keyed with `bp-<role>` placeholders, so designer dispatch output flows automatically for omp/claude-code/agent/codex; designer is read-only on source (writes design artifacts only) so it correctly takes the non-executor `Read-only role — no isolation needed` path; pi has no FORMATS entry for ANY role (pi dispatches via the extension's `bp_subagent` tool) — designer is consistent with that.
- **Alternatives**: Add per-platform designer FORMATS entries (rejected — redundant, FORMATS is role-agnostic); mark designer executor-like (rejected — designer must not be told to edit source in isolated worktrees).

### D-5: claude-code/commands.ts IS extended despite the proposal's file-list omission

- **Status**: ACCEPTED
- **Decision**: `.claude/commands/bp:design*.md` generation included (STEPS 11 → 16).
- **Reason**: Verified — `src/integrations/claude-code/commands.ts` holds its own STEPS list including ff/loop/refactor, `bp/config.yaml` configures `claude-code`, the refactor precedent generated `.claude/commands/bp-refactor.md` (platform-gen spec), and PR-4's SHALL says "for every configured platform". The proposal's PR-4 file list is illustrative; omitting claude-code would leave a configured platform without the design commands.
- **Alternatives**: Follow the proposal file list literally (rejected — violates PR-4's own "every configured platform" SHALL).

### D-6: opencode generators are NOT touched

- **Status**: ACCEPTED
- **Decision**: `src/integrations/opencode/commands.ts` and `opencode/agents.ts` remain unchanged; opencode keeps 11 commands / 6 agents.
- **Reason**: opencode is not in this repo's `bp/config.yaml` platform list, so PR-4's "every configured platform" SHALL does not require it; extending it would churn unconfigured-platform snapshots for zero current benefit. The proposal's research note asked to verify whether opencode needs the design steps — verification shows its generator holds its own STEPS list and would need manual extension, which this change deliberately defers.
- **Alternatives**: Extend opencode too (rejected — unconfigured platform, snapshot churn with no current user; deferred to a future change when/if opencode joins the configured set).
- **Residual risk**: if opencode becomes a configured platform, the design steps must be added there (flag for roadmap; noted in tasks.md).

### D-7: design-system template in its own module, re-exported from index.ts

- **Status**: ACCEPTED
- **Decision**: `DESIGN_SYSTEM_TEMPLATE` defined in `src/templates/artifacts/design-system.ts`; `index.ts` re-exports it and registers it in `ARTIFACT_TEMPLATES['design-system']`.
- **Reason**: Matches PR-5's file list exactly; consistent with the artifacts module's constant-per-file style; `TEMPLATE_IDS` auto-widens so `bp template design-system` works with zero template-command changes beyond the `FILENAMES` entry. The templates spec's "constants in src/templates/artifacts/index.ts" is satisfied by the registration + re-export (intent: no .md files, no disk reads).
- **Alternatives**: Inline the constant in index.ts (rejected — contradicts PR-5's file list and bloats an already ~1050-line module).

### D-8: design-review.md tolerance = validator registration + regression test; continue.ts unchanged

- **Status**: ACCEPTED
- **Decision**: `validateChange` gains a `design-review` known-artifact entry (pass-through valid); `continue.ts` gets a regression test but no code change.
- **Reason**: Verified — continue's next-step detection reads only schema-declared artifacts (proposal/design/tasks/review); there is no unknown-file scan, so design-review.md is ALREADY tolerated. The only real gap was the validator's known-artifact list, and the durable fix is a lock-test proving absence/presence changes nothing.
- **Alternatives**: Add design-review to the schema artifact graph (rejected — would alter artifact counting/step completion semantics for zero benefit); skip validator registration (rejected — leaves the artifact unacknowledged and the tolerance untested).

### D-9: omp/skills.ts grows 10 → 15 (refactor gap NOT fixed)

- **Status**: ACCEPTED
- **Decision**: The five design steps are appended to omp's skill STEPS (10 → 15); `refactor` is not added there.
- **Reason**: The proposal assumed 11 omp skills; the file actually has 10 — `refactor` was never added to omp skills (only omp commands). Fixing that pre-existing gap is out of this change's scope; adding the design steps keeps the design track complete on omp skills.
- **Alternatives**: Add refactor to omp skills too (rejected — scope creep; separate concern); skip omp skills entirely (rejected — omp is a configured platform and PR-4 requires its skills).

### D-10: Advisory hooks are text-only

- **Status**: ACCEPTED
- **Decision**: plan/check templates gain advisory sentences; no gate, no schema change, no continue coupling.
- **Reason**: Explicit user requirement ("advisory text only, no gate"); core 8-step semantics unchanged; keeps design steps auxiliary like ff/loop/refactor.
- **Alternatives**: Gate plan/check on design-review presence (rejected by user requirement); omit hooks (rejected — loses the design-track discoverability the proposal wants).

## Technical Approach

### Architecture Diagram

```
                         [NEW] design/design-html/design-review/
                               design-shotgun/plan-design-review.ts
                                      |  get<X>Skill/CommandTemplate
                                      v
 [MODIFIED] WORKFLOW_REGISTRY <-----------------------------------+
   (registry.ts, 11 -> 16 keys)                                   |
        |                                                         |
        | WORKFLOW_REGISTRY[step].skill()/.command()              |
        v                                                         |
 +----------------------------------------------+                |
 | [MODIFIED] platform generators               |                |
 |  pi/skills.ts (11->16)  omp/skills.ts (10->15)|               |
 |  omp/commands.ts (11->16)  claude-code/      |                |
 |  commands.ts (11->16)  codex/skills.ts       |                |
 |  (11->16)  agent/skills.ts (11->16)          |                |
 |  + [MODIFIED] agent role lists (pi/agent/    |                |
 |    claude-code/omp agents.ts: 6 -> 7 roles)  |                |
 +-------------------+--------------------------+                |
                     |  generatePiSkill / agents                |
                     v                                           |
        .pi/skills/bp:design*/SKILL.md  .pi/agents/bp-designer.md|
        .omp/.claude/.agents/.agent equivalents  [NEW outputs]   |
                                                                 |
 [NEW] DESIGNER_PROMPT  --marker 'Design Consultant'-->  [MODIFIED] pi extension
  (templates/agents/index.ts AGENT_PROMPTS['designer'])           detectAgentTypeFromPrompt
        |                                                          (extension-runtime.ts +
        ^                                                          extension.tmpl.ts lockstep)
        |  bp dispatch designer  [MODIFIED]
        +--- bp-dispatch.ts ROLE_TEMPLATES['designer']=['design-system']
             src/types/config.ts PROFILE_MODEL_MAP['designer'] tier
             |
             v
 [NEW] 5 CLI commands  bp design*  (src/commands/bp-design*.ts + [MODIFIED] cli.ts)
             |
             |  getWorkflowInstructions()
             v
        instructions -> orchestrator -> dispatch designer -> artifacts

 [NEW] DESIGN_SYSTEM_TEMPLATE (artifacts/design-system.ts -> index.ts ARTIFACT_TEMPLATES)
             |  bp template design-system  ->  root DESIGN.md
 [MODIFIED] bp-template.ts FILENAMES['design-system'] = 'DESIGN.md'

 [MODIFIED] artifact-validator.ts validateChange  --known optional-->  design-review.md
 [MODIFIED] plan.ts / check.ts  --advisory text-->  bp plan-design-review / bp design-review

 [EXISTING, unchanged] continue.ts state machine, schema artifact graph, bp-update.ts,
                       omp extension, opencode generators, core 8-step semantics
```

Data flow: workflow step templates → registry → platform generators → generated skills/commands → orchestrator invokes CLI commands → instructions → designer sub-agent (dispatch + config tier) → design artifacts (root DESIGN.md, change-dir design-review.md, design/ scratch) → validator/continue tolerance + advisory hooks.

### Interface Design

**CLI: `bp design [change-name]`** (and `design-html`, `design-review`, `design-shotgun`, `plan-design-review`)

- Success: stdout = full step instructions (Input/Steps/Output/Guardrails), exit 0.
- Error: not in a bp project → stderr `Not in a blueprint project. Run "bp init" first.`, exit 1.
- Error: instructions missing (defensive) → stderr `<Step> workflow instructions not found.`, exit 1.

**CLI: `bp dispatch designer [--change <name>]`**

- Success: per-platform `## Dispatch: bp-designer (<platform>)` sections (omp/claude-code/agent/codex), `### Isolation` (`Type: none`, `Read-only role — no isolation needed.`), `### Model Selection` (`Role: designer`, resolved model, possibly `⚠ Degradation disabled`), output-template line `bp template design-system`. Exit 0.
- Error: unknown platform in config → skipped (existing behavior); no bp dir → `findBpDir` fallback to `bp/` (existing behavior).

**CLI: `bp template design-system [--stdout] [--name <name>]`**

- Success: stdout or writes `DESIGN.md` at target dir (FILENAMES mapping), exit 0.
- Error: unknown type → existing `Unknown template type` message listing TEMPLATE_IDS (design-system now included), exit 1.

**Public functions (module contracts):**

- `get<Step>SkillTemplate(): SkillTemplate` — `{ name: 'bp-<step>', description: <no-colon>, instructions }`.
- `get<Step>CommandTemplate(): CommandTemplate` — `{ description, category: 'Workflow', tags: ['bp', '<step>', ...], content: instructions }`.
- `detectAgentTypeFromPrompt(prompt?: string): AgentType` — returns `'designer'` for `Design Consultant` marker, existing roles unchanged, `'default'` fallback.
- `validateChange(bpDir, changeName)` — `results['design-review']` present when the file exists, `valid: true`.

### File Manifest

**Create:**

- `src/templates/workflows/design.ts`
- `src/templates/workflows/design-html.ts`
- `src/templates/workflows/design-review.ts`
- `src/templates/workflows/design-shotgun.ts`
- `src/templates/workflows/plan-design-review.ts`
- `src/commands/bp-design.ts`
- `src/commands/bp-design-html.ts`
- `src/commands/bp-design-review.ts`
- `src/commands/bp-design-shotgun.ts`
- `src/commands/bp-plan-design-review.ts`
- `src/templates/artifacts/design-system.ts`
- Tests: `tests/templates/workflow-design-steps.test.ts`, `tests/templates/agents-designer.test.ts`, `tests/commands/bp-design-commands.test.ts`, `tests/core/design-review-tolerance.test.ts` (exact names at executor discretion, co-located per repo convention in `tests/`)

**Modify:**

- `src/templates/workflows/registry.ts`
- `src/templates/agents/index.ts`
- `src/commands/bp-dispatch.ts`
- `src/types/config.ts`
- `src/cli.ts`
- `src/integrations/pi/skills.ts`
- `src/integrations/omp/skills.ts`
- `src/integrations/omp/commands.ts`
- `src/integrations/claude-code/commands.ts`
- `src/integrations/codex/skills.ts`
- `src/integrations/agent/skills.ts`
- `src/integrations/pi/agents.ts`
- `src/integrations/agent/agents.ts`
- `src/integrations/claude-code/agents.ts`
- `src/integrations/omp/agents.ts`
- `src/integrations/pi/extension-runtime.ts`
- `src/templates/pi/extension.tmpl.ts`
- `src/templates/artifacts/index.ts`
- `src/commands/bp-template.ts`
- `src/core/artifact-validator.ts`
- `src/templates/workflows/plan.ts`
- `src/templates/workflows/check.ts`
- Existing tests with count pins (Test Impacts table): `src/integrations/pi/index.test.ts`, `src/integrations/pi/skills.test.ts`, `src/integrations/pi/agents.test.ts`, `src/integrations/codex/skills.test.ts`, `src/integrations/agent/skills.test.ts`, `src/integrations/agent/agents.test.ts`, `src/integrations/claude-code/commands.test.ts`, `src/integrations/claude-code/agents.test.ts`, `src/integrations/pi/extension-runtime.test.ts`, `tests/commands/bp-dispatch.test.ts`
- Snapshots: `src/generators/__snapshots__/multi-platform.test.ts.snap`, per-platform `__snapshots__/` in `src/integrations/{pi,omp,codex,agent,claude-code}/`
- Repo-root dogfood outputs via `bp update`: `.pi/skills/bp-design*/SKILL.md` (×5), `.pi/agents/bp-designer.md`, `.omp/skills/bp-design*/`, `.omp/commands/bp:design*.md`, `.omp/agents/bp-designer.md`, `.claude/commands/bp:design*.md`, `.claude/agents/bp-designer.md`, `.agents/skills/bp-design*/`, `.codex/...` regenerated sets
- `bp/changes/add-design-workflow/design.md`, `tasks.md`, `specs/design/spec.md`, `specs/platform-gen/spec.md`, `context.jsonl` (this change's own artifacts)

**NOT modified (verified):** `src/integrations/opencode/*`, `src/core/continue.ts`, `src/commands/bp-update.ts`, `src/generators/index.ts`, `src/core/config.ts`, omp extension, state machine / schema, `src/integrations/pi/agents.test.ts` count logic beyond the pin bump.

## TDD Strategy

- T-1..T-8 are `type:behavior` (RED→GREEN→REFACTOR): each RED test expresses the spec scenario as observable behavior (registry keys, template structure, CLI exit codes, detection results, artifact tolerance).
- T-5 GREEN includes updating the existing count-pin tests and regenerating snapshots (`npx vitest run --update`) — snapshot regen is part of the implementation, not a separate task.
- T-9 is `type:scaffolding` (dogfood regeneration — direct implementation, no TDD).
- Commit scopes per coding.md: `templates` (T-1, T-2, T-7, T-8), `commands` (T-4), `cli` (T-4 cli.ts), `config` (T-3 model tier), `integrations` (T-5, T-6), `test` (pin updates), `docs` (T-9 dogfood output).
- One wave: all tasks are template/generator-layer edits with no cross-layer compile ordering beyond `depends_on` edges (T-5→T-1, T-4→T-1, T-6→T-2, T-9→T-5).
