import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- No parameters: operate on the current project

## Steps

### Step 1: Grill the user on project requirements (RELENTLESS - do NOT skip)

Before defining milestones, you must reach FULL shared understanding with the user.
This is NOT a checklist. It is a relentless interview that walks every branch of the decision tree,
resolving dependencies between decisions one by one.

Process:
1. Start with what the user described. Map the decision tree in your mind:
   every feature, priority, dependency, constraint, and unknown.
2. Pick the first unresolved branch. Ask ONE focused question about it.
   **Provide your recommended answer** so the user can just confirm or correct.
3. If the question can be answered by exploring the codebase, explore it yourself - do NOT ask the user.
4. After the user answers, check if their answer opened new branches. If so, ask about those next.
5. Repeat until every branch is resolved and you have shared understanding.

What to grill on (walk every branch):
- **Project goal**: What is this project trying to achieve? What problem does it solve?
- **Target users**: Who will use this? What are their needs? What are their pain points?
- **Key features**: What are the main capabilities? What must be in v1 vs later?
- **Dependencies**: Which features depend on others? What is the build order?
- **Constraints**: Technical, timeline, or resource constraints? Existing tech stack?
- **Existing codebase**: If brownfield, what exists? What needs to change? Extend or rewrite?
- **Edge cases**: What happens at scale? What are the failure modes?
- **Scope boundaries**: What is explicitly NOT being built?

**Hard rules:**
- Ask ONE question at a time. Wait for the answer. Do not batch.
- Always provide a recommended answer when one exists.
- Do NOT proceed to Step 2 until you can describe every phase's deliverables without guessing.
- Do NOT use assumptions. If you are about to assume, STOP and ask instead.
- If the user says "use your best judgment" on a specific point, you may proceed without asking.

### Step 2: Get context

Read \`bp/config.yaml\` and \`bp/specs/\` to understand the project scope, tech stack, and existing behavioral contracts.

### Step 3: Detect roadmap state

Read \`bp/roadmap.md\`. Check if it already has defined milestones (look for \`## Milestone:\` headers that have real content, not template placeholders).

**First time (no milestones defined):**
Continue to Step 4.

**Adding a new milestone (roadmap already exists):**
- Append new milestone(s) BELOW existing milestones, separated by \`---\`
- Keep existing milestones with their status unchanged

### Step 4: Choose planning mode (first time only)

Use \`ask\` to determine the planning mode:

- **MVP mode** (product-facing): each phase delivers user-facing value
- **Technical-layer mode** (infrastructure/CLI): each phase produces a runnable/testable artifact

### Step 5: Define Milestones

**HARD RULE: You MUST fetch the roadmap template by running \`bp template roadmap --stdout\` BEFORE writing \`bp/roadmap.md\`.** The template defines milestone and phase section structure, status tags, and progress summary format. Writing from memory will produce an unparsable roadmap.

Fill the template with milestones based on project requirements.

**Milestones = product releases.** A project may have 1 milestone (ship everything at once) or multiple (v1, v2, v3...).

**Create ALL known milestones right now**, not just M1. Each milestone is one of two tiers:

- **Discussed milestones** (full structure) — discussion is complete and the milestone is being planned or worked on:
  - Goal / What / Deliverables / Outcomes (concrete)
  - Phases decomposed (P{N}.1, P{N}.2...) with full fields
  - Each phase lists planned changes as structured blocks
  - Key Decisions captured during discussion

- **Future milestones** (placeholder only) — direction known but NOT fully discussed yet:
  - Goal / What / Deliverables / Outcomes (TBD is OK; fill what's known)
  - Key Decisions discussed for this milestone (if any)
  - **DO NOT decompose into phases or list changes** — that happens after the milestone is discussed and promoted to full structure
  - Rationale: premature decomposition locks in structure that later discussion will overturn.

The template's M1 section illustrates the full-structure form; the template's M2 section illustrates the placeholder form. A real project may have multiple full-structure milestones (e.g. M1 active, M3 discussed) and multiple placeholder milestones (e.g. M2 future) — assign each milestone the tier that matches its actual discussion state.

#### Splitting granularity (applies to full-structure milestones only)

- **Milestone** = one shippable product increment (user-perceptible, independently releasable).
  If two milestones share >50% deliverables, merge them.
- **Phase** = one runnable/testable end-to-end slice. After a phase completes, the system still runs
  and can be independently verified. If two phases are so coupled they can't be verified separately,
  merge them. First phase is always the thinnest end-to-end path.
- **Change** = one feature. One feature corresponds to one change — do NOT split by task count or
  wave count. If two features have a dependency, annotate \`Depends on\`; do NOT merge them into one
  change just because of the dependency. Inside a change, split by layer dependencies into waves
  and by behavioral paths into tasks (default 1 wave).

#### Filling each layer (Goal / What / Deliverables / Outcomes)

All three layers (Milestone / Phase / Change) use the same four fields:

- **Goal**: the problem this layer solves or the value it delivers — WHY.
- **What**: the work involved — key areas, approach, constraints. Milestone-level What is a brief
  summary of phase coverage; phase/change-level What should be concrete.
- **Deliverables**: concrete artifacts produced — files, commands, features, tests, docs.
- **Outcomes**: verifiable result — what becomes true after this layer lands.
  Prefer Given/When/Then or an executable command.
  Bad: "improve telemetry"
  Good: "Given any bp command completes, then \`.meta/<timestamp>.json\` exists with fields
  {command, exitCode, durationMs, failureMode?}, and \`bp telemetry export\` outputs it."
  For docs/config-type changes where Given/When/Then is too heavy, a concrete declarative
  statement is acceptable (e.g., "bp/roadmap.md follows the structured-change template").

#### Dependencies

- Phase and Change both fill \`Depends on\`. No dependency → fill \`none\`.
- Parallel phases can share the same \`Depends on\` value.
- Cross-phase change dependencies: fill the change name and its phase id,
  e.g., \`telemetry (P3.1)\`.

**Key Decisions** — As the user discusses technical details (field design, API format, conventions, tech stack choices), write the decisions into the appropriate milestone/phase's \`### Key Decisions\` section. If a decision belongs to a future-milestone, put it there — don't leave it in the current milestone. Format: \`- [P{milestone}.{phase}-KD] {{subject}} — {{decision}} (reason: {{why}}; alt: {{alternatives}})\`. For placeholder milestones without phase decomposition, use milestone-level id: \`[M{N}-KD]\`.

**Planned changes** — For NOT_STARTED phases, list planned changes in \`**Changes**\` as a structured block per change. Each block has four fields: **Goal** (what this change achieves), **What** (work involved — key areas, approach, constraints), **Deliverables** (concrete artifacts produced: files, commands, features, tests), **Outcomes** (verifiable result — what becomes true after this change lands), and **Depends on** (prior change name, or \`none\`). The change name line keeps the \`- [ ] name (proposed date)\` format so \`bp archive\` can mark it \`[x]\`; the five fields are indented sub-items below it. This helps planners understand the scope and verifiable outcomes without re-reading the full discussion.

**Changes** — Already existing or proposed changes get \`**Changes**\` with checkbox + status + structured block (Goal/What/Deliverables/Outcomes/Depends on).

**Future Considerations** — During discussion, items may come up that don't fit any defined milestone. Record these in the \`## Future Considerations\` section so they aren't lost. Promote to a new milestone when scope solidifies.

### Step 6: Validate

Check before finishing:
- All project requirements from Step 1 discussion are covered by some milestone (full-structure phase, placeholder goal, or Future Considerations)
- Full-structure milestones: phase dependencies form a DAG (no cycles); \`Depends on\` is filled for every phase and change
- Placeholder milestones: NOT decomposed into phases (only Goal/What/Deliverables/Outcomes + Key Decisions)
- Each full-structure phase and change has concrete, verifiable Outcomes (not vague descriptions)
- Phase status is consistent: all changes \`[x]\` → phase COMPLETED; any \`[ ]\` → IN_PROGRESS/NOT_STARTED
- The \`[STATUS]\` tag in the phase heading line matches the \`**Status**\` attribute line
- Milestone count driven by product releases, not a template limit
- First phase of each full-structure milestone is always the thinnest possible end-to-end path
- No template placeholders remaining
- All known milestones are present (full-structure or placeholder)

#### Progress Summary calculation

- Phases column:
  - Full-structure milestone: \`<completed>/<total>\` (total = count of \`### Phase:\` lines under this milestone; completed = COMPLETED count)
  - Placeholder milestone: \`-/-\` (not decomposed)
- Changes column:
  - Full-structure milestone: \`<archived>/<total>\` (archived = \`[x]\` count; total = \`[x]\` + \`[ ]\`)
  - Placeholder milestone: \`-/-\` (not decomposed)
  - Never write "planned" — always numeric form or \`-/-\`
- Status column: the milestone's \`**Status**\` value.

## Output

- \`bp/roadmap.md\` — structured roadmap with milestone and phase info

## Guardrails

- **Milestones = product releases.** No "foundation", "setup", "scaffolding" — M1 = first shippable increment.
- **Create ALL known milestones now.** Future milestones with partial info are better than omitted milestones.
- **Capture partial knowledge.** If decisions were discussed for a future milestone, write them there. Fuzzy is OK.
- **Future Considerations** for items discussed but not milestone-assigned yet.
- Mode (MVP/technical-layer) shapes phases within a milestone, not the milestones themselves.
- First phase = thinnest end-to-end path (always first phase, never "phase 0").
- **Adding new milestone**: append new ones below existing, don't overwrite.
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
