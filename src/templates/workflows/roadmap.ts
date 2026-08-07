import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- No parameters: operate on the current project.

## Steps

### Step 1: Lightweight grilling — direction and milestone agreement

Before defining milestones, agree project direction and the milestone/phase skeleton. This is a LIGHTWEIGHT grilling — NOT a full requirements interview. Ask ONE question at a time with a recommended answer.

Resolve:
1. **Direction** — what is this project for? What problem does it solve?
2. **Milestone/phase skeleton** — what structure does the user want?
3. **Future intentions** — which discussed items are future intentions (M2+ placeholders) vs committed scope?

**Hard rules:** ask ONE question at a time, wait for the answer, always provide a recommended answer, and do NOT proceed until direction and the milestone skeleton are agreed without guessing.

> **Detailed feature/edge-case/failure-mode requirements are deferred to each change's propose step (\`bp propose\`) — do NOT grill them here.**

### Step 2: Get context

Read \`bp/config.yaml\` and \`bp/specs/\` to understand project scope, tech stack, and existing behavioral contracts.

### Step 3: Detect roadmap state

Read \`bp/roadmap.md\`. If no milestones are defined (no real \`## Milestone:\` content), continue to Step 4. Otherwise (roadmap exists), append new milestone(s) BELOW existing ones separated by \`---\`, keeping existing milestones' status unchanged.

### Step 4: Choose planning mode (first time only)

Use \`ask\` to choose the planning mode:
- **MVP mode** (product-facing): each phase delivers user-facing value.
- **Technical-layer mode** (infrastructure/CLI): each phase produces a runnable/testable artifact.

### Step 5: Define Milestones

**HARD RULE: run \`bp template roadmap --stdout\` BEFORE writing \`bp/roadmap.md\`** — it defines milestone/phase section structure, status tags, and the progress summary format. Writing from memory produces an unparsable roadmap.

**Milestones = product releases. Default: exactly ONE milestone covering the entire project.** Do NOT create extra milestones to organize work — that's what phases are for.

Only create additional milestones (M2+) for work the user EXPLICITLY mentioned wanting later but NOT committed yet (a vague future intention). Never create a milestone because the project is big, or for work the user never mentioned.

Each milestone is one of two tiers:
- **Discussed** (full structure): concrete Goal/What/Deliverables/Outcomes, phases decomposed (P{N}.1, P{N}.2...) with full fields, planned changes as structured blocks, and Key Decisions captured during discussion.
- **Future-intention** (placeholder only): Goal/What (TBD is OK) + Key Decisions, but NO phase decomposition or change lists — premature decomposition locks in structure later discussion will overturn.

#### Splitting granularity (full-structure milestones only)

- **Milestone** = one shippable product increment; if two milestones share >50% deliverables, merge them.
- **Phase** = one runnable/testable end-to-end slice that can be independently verified; merge phases too coupled to verify separately. The first phase is always the thinnest end-to-end path.
- **Phase contains MULTIPLE changes** — one phase = one change is an over-split signal; merge into a neighbor phase.
- **Change** = one feature — do NOT split by task/wave count; annotate \`Depends on\` between features instead of merging them.

#### Filling each layer (Goal / What / Deliverables / Outcomes)

All layers (Milestone/Phase/Change) use the same four fields: **Goal** (the problem solved — WHY), **What** (the work involved), **Deliverables** (concrete artifacts), **Outcomes** (verifiable result — prefer Given/When/Then or an executable command; a concrete declarative statement is acceptable for docs/config-type changes).

#### Dependencies

Phase and Change fill \`Depends on\` (no dependency → \`none\`). Cross-phase change dependencies name the change and its phase id, e.g. \`telemetry (P3.1)\`.

**Key Decisions** — write decisions into the appropriate milestone/phase's \`### Key Decisions\` section as \`- [P{milestone}.{phase}-KD] {{subject}} — {{decision}} (reason: {{why}}; alt: {{alternatives}})\`. Use milestone-level \`[M{N}-KD]\` for placeholder milestones.

**Planned changes** — for NOT_STARTED phases, list planned changes in \`**Changes**\` as one structured block per change (Goal / What / Deliverables / Outcomes / Depends on), keeping the \`- [ ] name (proposed date)\` line format so \`bp archive\` can mark it \`[x]\`.

**Future Considerations** — record discussed items that fit no milestone in \`## Future Considerations\`; promote them when scope solidifies.

### Step 6: Validate

Check before finishing:
- All Step-1 requirements are covered by a milestone (full-structure phase, placeholder goal, or Future Considerations).
- Full-structure milestones: phase dependencies form a DAG; \`Depends on\` filled for every phase and change.
- Placeholder milestones: NOT decomposed into phases (only Goal/What/Deliverables/Outcomes + Key Decisions).
- Every full-structure phase and change has concrete, verifiable Outcomes.
- Phase status is consistent: all changes \`[x]\` → COMPLETED; any \`[ ]\` → IN_PROGRESS/NOT_STARTED; the \`[STATUS]\` tag matches the \`**Status**\` line.
- Milestone count defaults to 1; only add M2+ for user-expressed future intentions.
- Every full-structure phase contains MULTIPLE changes; the first phase is the thinnest end-to-end path.
- No template placeholders remain.

#### Progress Summary calculation

- Phases column: \`<completed>/<total>\` for full-structure milestones; \`-/-\` for placeholders.
- Changes column: \`<archived>/<total>\` (archived = \`[x]\` count); \`-/-\` for placeholders. Never write "planned" — always numeric or \`-/-\`.
- Status column: the milestone's \`**Status**\` value.

## Output

- \`bp/roadmap.md\` — structured roadmap with milestone and phase info.

## Guardrails

- Milestones = product releases; default exactly ONE. No "foundation"/"setup"/"scaffolding" milestones.
- Only add M2+ for user-expressed future intentions. Never split milestones to organize phases.
- A phase contains MULTIPLE changes — one change per phase is an over-split signal.
- Capture partial knowledge: write decisions for future milestones where they belong; fuzzy is OK.
- Mode (MVP/technical-layer) shapes phases within a milestone, not the milestones themselves.
- First phase = thinnest end-to-end path (never "phase 0").
- Adding a milestone: append below existing ones; don't overwrite.
- Do NOT create milestone directories — v2 uses roadmap.md as the single tracking document.
`;

export function getRoadmapSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-roadmap',
    description: 'Roadmap definition — discuss requirements, then define milestones x phases',
    instructions,
  };
}

export function getRoadmapCommandTemplate(): CommandTemplate {
  return {
    description: 'Roadmap definition — discuss requirements, then define milestones x phases',
    category: 'Planning',
    tags: ['bp', 'roadmap', 'planning', 'milestones', 'requirements'],
    content: instructions,
  };
}
