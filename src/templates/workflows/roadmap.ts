import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- No parameters: operate on the current project.

## Steps

### Step 1: Grill the project's feature scope (complete)

Before defining milestones, reach full shared understanding of what this project must DO. This is a COMPLETE feature-scope discussion — but it stays at the feature level: do NOT dive into implementation detail (edge cases, failure modes, exact requirements), which is captured per-change in each \`bp propose\` step.

Follow the **grilling skill**: map the feature scope as a **design tree** and work it in **rounds**:

1. **Compute the frontier** — every feature-scope decision whose prerequisites are settled: the questions you can ask now without guessing at answers you haven't heard.
2. **Ask the whole frontier in one round** — number each question and give your recommended answer, formatted:
   \`\`\`
   ❓ **Q1** - **<question title>**: <question body, including the choices>

   ➡️ <your recommended answer>
   \`\`\`
3. **Wait for the user's answers** before the next round; recompute the frontier and ask the next round. A question whose answer depends on another still open this round belongs to a LATER round.
4. **Facts are your job** — when a question needs a fact from the environment (codebase, config, specs), dispatch a sub-agent to find it; do NOT ask the user for anything you can look up.
5. **Done when the frontier is empty** — every branch visited, nothing left silently assumed.

Resolve (walk every branch of the feature scope):
1. **Main capabilities** — what are the primary features/capabilities this project must deliver? Enumerate them; each becomes candidate work.
2. **Scope boundaries** — what is explicitly NOT in scope? where does this project stop?
3. **Target users** — who is this for? what do they need?
4. **Constraints** — technical, timeline, or resource constraints? existing tech stack?
5. **Priorities** — what matters most? what is committed vs a future intention?

**Hard rules:** ask the WHOLE frontier each round (do NOT trickle questions one-by-one), always provide a recommended answer, and do NOT proceed until you can enumerate the full feature scope without guessing. Do NOT use assumptions — if you are about to assume, STOP and ask instead.

> Implementation detail (edge cases, failure modes, exact requirements) is deferred to each change's propose step (\`bp propose\`) — do NOT grill those here.

### Step 2: User confirmation — scope discussion complete

After the feature-scope grilling, present a concise summary of the agreed scope (capabilities, boundaries, priorities) and ASK the user explicitly to confirm the discussion is complete:

- Present the summary.
- Ask: "Is the feature scope discussion complete? Anything missing or to adjust?"
- Do NOT proceed to milestone planning until the user confirms. If the user adds or changes items, return to Step 1 and resolve them before continuing.

### Step 3: Agree the milestone/phase structure with the user

Only after the user confirms the scope is complete, discuss HOW to plan the roadmap — use the same grilling method (design tree + frontier + rounds): ask the whole frontier in one round with numbered questions and recommended answers, then refine in later rounds until the skeleton is agreed.

Resolve:
1. **Planning mode** — MVP mode (each phase delivers user-facing value) vs technical-layer mode (infrastructure/CLI; each phase produces a runnable/testable artifact). Ask the user; use \`ask\`.
2. **Milestone/phase skeleton** — how should the confirmed scope be cut into milestones (product releases) and phases (runnable end-to-end slices)? Which features go in which phase? What is the build order? Propose a skeleton and refine it with the user.
3. **Future intentions** — which discussed items are future intentions (M2+ placeholders) vs committed scope?

Agree the skeleton with the user before writing the roadmap.

### Step 4: Get context

Read \`bp/config.yaml\` and \`bp/specs/\` to understand project scope, tech stack, and existing behavioral contracts.

### Step 5: Detect roadmap state

Read \`bp/roadmap.md\`. If no milestones are defined (no real \`## Milestone:\` content), continue to Step 6. Otherwise (roadmap exists), append new milestone(s) BELOW existing ones separated by \`---\`, keeping existing milestones' status unchanged.

### Step 6: Define Milestones

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

### Step 7: Validate

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
