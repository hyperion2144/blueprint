import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **\`<phase-id>\`** (optional) — the phase to discuss (e.g. \`ph.1-core\`). If not provided, read from \`bp state\` to determine the active phase.

### Prerequisites
- Active milestone and phase must be set
- \`bp/roadmap.md\` — contains phase definitions with goals and scope

## Philosophy

You are a **thinking partner**, not an interviewer. The user is the visionary — you capture decisions that downstream agents need. Your job is to identify and resolve gray areas, not to rehash what's already clear.

**Express path: if there are no gray areas to discuss, skip the discussion and write a minimal context.md with only the phase identity and locked decisions.** Do not force conversation for the sake of conversation.

## Steps

### Step 0: Resolve the active phase
If a phase ID was provided, use it directly. If not:

1. Run \`bp state\` — read \`milestone\` and \`phase\` fields.
2. If both are non-null, use them.
3. If \`phase\` is null: run \`bp context discuss\` to get the roadmap path. Read roadmap.md, identify the current phase. Run \`bp state set-phase <phase-id>\` to activate it.
4. If \`milestone\` is null: run \`bp state set-milestone <milestone-id>\` first.

Print the resolved phase identity:
\`\`\`
Phase: <phase-id>  |  Milestone: <milestone-id>  |  Mode: <mvp || technical-layer>
Goal: <phase-goal from roadmap>
Deliverable: <executable artifact>
\`\`\`

### Step 1: Get context
Run \`bp context discuss\` — outputs state and roadmap path. Read roadmap.md and extract ONLY the section for this phase. Check if \`context.md\` already exists and load prior phase decisions to avoid re-asking.

### Step 2: Identify gray areas
Gray areas are **implementation decisions the user cares about** — things that could go multiple ways and would change the result. They are PHASE-SPECIFIC, not generic categories.

Read the phase goal and scope from roadmap. Identify 2-6 concrete gray areas for THIS phase. Examples:
- Phase "User authentication" → Session handling, Error responses, Multi-device policy, Recovery flow
- Phase "CLI scaffolding" → Output format, Flag design, Progress reporting, Config file location
- Phase "API documentation" → Structure/navigation, Code examples depth, Versioning approach

**Do NOT generate generic categories** (UI, UX, Behavior). Each gray area must be specific to this phase.

**Do NOT ask about**: technical implementation details (researcher figures those out), architecture patterns (planner handles those), scope (roadmap defines this). Focus on user-facing and design-time decisions.

### Step 3: Present gray areas and let user select
\`\`\`
Here's what I identified as gray areas for <phase-id>:

1. <Area 1> — <one-line description>
2. <Area 2> — <one-line description>
...

Are there any I missed? Which ones should we discuss? (Or \"Skip discussion\" if everything is clear)
\`\`\`

Use the \`ask\` tool. If user says everything is clear → skip to Step 5 (write minimal context.md).

### Step 4: Discuss selected areas — one at a time
For each selected area:

1. **Announce**: \`Let's talk about [Area].\`

2. **Ask 2-4 single questions using the \`ask\` tool**:
   - Each question provides 2-3 concrete options with a **recommended answer** and brief rationale
   - Options must be concrete: \"Session cookies + httpOnly\" not \"Option A\"
   - Include \"You decide\" as an option when reasonable
   - Each answer should reveal the next question
   - After 2-4 questions, ask: \"More questions about [area], or move to next?\"

3. **Record decisions** in the D1/D2 format immediately after each area resolves

4. **Scope creep guard**: If user mentions something outside this phase:
   \`\`\`
   [Feature] sounds like a new capability — that belongs in its own phase.
   I'll note it as a deferred idea. Back to [current area]...
   \`\`\`

### Step 5: Write context.md
Get the context template: \`bp template context\`. Write to \`bp/milestones/<milestone-id>/phases/<phase-id>/context.md\`.

Ensure the full path exists:
\`\`\`bash
mkdir -p bp/milestones/<milestone-id>/phases/<phase-id>
\`\`\`

\`\`\`markdown
# Context: <phase-id>

> Phase: <phase-id>  |  Milestone: <milestone-id>  |  Mode: <mvp || technical-layer>
> Goal: <one-line from roadmap>
> Deliverable: <executable artifact>

## Locked Decisions

## D1: <decision title>
- **Decision**: <what we chose>
- **Rationale**: <why>
- **Alternatives considered**: <what else>
- **Impact**: <files, interfaces, constraints affected>

## Gray Areas (Unresolved)

<!-- Mark with [TODO: discuss] if any remain -->

## Deferred Ideas

<!-- Features that belong in their own phase -->

## Non-Goals

<!-- Explicitly excluded from this phase -->
\`\`\`

If no gray areas were discussed (express path): write a minimal context.md with only the phase identity and "No gray areas — all decisions clear from roadmap and prior phases."

### Step 6: Commit
\`\`\`bash
bp commit "docs(phase): write context.md for <phase-id>" --files "bp/milestones/<mid>/phases/<pid>/context.md" --scope docs --record
\`\`\`

### Step 7: Advance
Run \`bp continue\` to proceed to research-phase.

## Output
- \`bp/milestones/<mid>/phases/<pid>/context.md\` — phase-level implementation decisions with D1/D2 format

## Guardrails
- **Output goes in the phase directory** — NOT in bp/ root
- Ensure \`mkdir -p bp/milestones/<mid>/phases/<pid>\` before writing
- **Scope to this phase ONLY** — other phases are discussed separately
- **Express path**: skip discussion if everything is clear — don't force questions
- Identify 2-6 phase-specific gray areas before presenting to user
- Every question uses the \`ask\` tool with recommended answers
- Concrete options only — no \"Option A\" / \"Option B\"
- Defer out-of-scope ideas, don't lose them
- context.md is the single source of truth for this phase's implementation`;

export function getDiscussSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-discuss',
    description: 'Phase discussion — capture implementation decisions with D1/D2 format',
    instructions,
  };
}

export function getDiscussCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Discuss',
    description: 'Phase discussion — capture implementation decisions with D1/D2 format',
    category: 'Planning',
    tags: ['bp', 'discuss', 'context', 'decisions'],
    content: instructions,
  };
}
