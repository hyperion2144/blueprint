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

**HARD RULE: You MUST fetch the roadmap template by running \`bp template roadmap --stdout\` BEFORE writing \`bp/roadmap.md\`.** The template defines milestone and phase section structure, status tags, and progress summary format. Writing from memory will produce an unparesable roadmap.

Fill the template with milestones and phases based on project requirements.

**Milestones = product releases.** A project may have 1 milestone (ship everything at once) or multiple (v1, v2, v3...).

**Create ALL known milestones right now**, not just M1. For each:
- **M1** (current/upcoming): full detail — phases, key decisions, planned changes
- **M2, M3...** (future): fill what's known now. Goal, rough scope, and any decisions discussed.
  Incomplete is OK — "TBD phase details deferred" is better than omitting the milestone entirely.
  Key decisions made during discussion that belong to later milestones go into their ## Key Decisions.

**What if details aren't clear yet for later milestones?**
- Document what IS known (e.g., "Goal: add payment") and mark scope as TBD
- Put discussed-but-unassigned items in ## Future Considerations
- The template supports this — M2 section has the right structure
- Don't skip creating the milestone. Partial documentation preserves decisions.

When defining each phase, fill these areas:

**Key Decisions** — As the user discusses technical details (field design, API format, conventions, tech stack choices), write the decisions into the appropriate milestone/phase's \`### Key Decisions\` section. If a decision belongs to a future milestone, put it there — don't leave it in the current milestone. Each decision includes: subject area, decision content, reason, and alternatives considered.

**Planned changes** — For NOT_STARTED phases, list planned changes in \`**Changes**\` as a structured block per change. Each block has four fields: **Goal** (what this change achieves), **What** (work involved — key areas, approach, constraints), **Deliverables** (concrete artifacts produced: files, commands, features, tests), **Outcomes** (verifiable result — what becomes true after this change lands). The change name line keeps the \`- [ ] name (proposed date)\` format so \`bp archive\` can mark it \`[x]\`; the four fields are indented sub-items below it. This helps planners understand the scope and verifiable outcomes without re-reading the full discussion.

**Changes** — Already existing or proposed changes get \`**Changes**\` with checkbox + status + structured block (Goal/What/Deliverables/Outcomes).

**Future Considerations** — During discussion, items may come up that don't fit any defined milestone. Record these in the \`## Future Considerations\` section so they aren't lost. Promote to a new milestone when scope solidifies.

### Step 6: Validate

Check before finishing:
- All project requirements from Step 1 discussion are covered by some phase or Future Considerations
- Phase dependencies form a DAG (no cycles)
- Each phase has a concrete, verifiable deliverable
- Phase count driven by scope, not a template limit
- First phase is always the thinnest possible end-to-end path
- No template placeholders remaining
- Future milestones documented even if details are high-level

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
