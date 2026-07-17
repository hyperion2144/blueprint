import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- No parameters: operate on the current project

## Steps

### Step 1: Clarify project requirements with the user (ITERATIVE - do NOT skip)

Before defining milestones, you must reach FULL agreement with the user on what to build.
This is NOT a single Q&A round. It is an iterative loop: ask -> research -> find gaps -> ask again.

Use \`ask\` to discuss:
- **Project goal**: What is this project trying to achieve? What problem does it solve?
- **Target users**: Who will use this? What are their needs?
- **Key features**: What are the main capabilities required?
- **Constraints**: Any technical, timeline, or resource constraints?
- **Existing codebase**: If brownfield, what exists already? What needs to change?

Take notes. These will inform the roadmap structure.

### Step 1b: Research (do this yourself, do NOT ask the user)

Research the project context:
- If brownfield: read existing source code, understand current architecture, identify what exists vs what needs to change
- Read the project's dependency and config files to understand the tech stack
- Read \`bp/specs/\` if specs exist (brownfield after codebase-scanner)
- Check for linting and formatting configuration to understand conventions

### Step 1c: Gap analysis and follow-up questions (MANDATORY - not optional)

After research, you MUST assess whether you have enough to define milestones.
For EACH feature the user mentioned, answer these 4 questions. If you cannot answer any, you MUST ask:

1. **What exactly does it do?** (concrete behavior, not "user management" but "create/read/update/delete user accounts")
2. **What is the priority?** (must-have vs nice-to-have, which features belong in the first milestone)
3. **What are the dependencies between features?** (which feature requires another to be built first)
4. **Does existing code already partially implement this?** (if brownfield, extend or rewrite?)

If ANY answer is unclear, use \`ask\` to clarify. Common patterns:
- User described a feature but didn't specify the approach -> ask which approach they prefer
- User's stated tech stack contradicts what the codebase actually uses -> clarify the contradiction
- User's scope is too large (>5 phases in one milestone) -> suggest splitting
- User mentioned a feature but you don't know if existing code already partially implements it -> ask

**Loop back**: After the user answers, go back to Step 1b (research again if the answer revealed new context),
then re-assess. Repeat until ALL features pass the 4-question check.

### Step 1d: Hard exit gate - do NOT proceed to Step 2 until ALL pass

Before defining milestones, verify:
- **Every feature has concrete behavior**: Can you describe what it does without vague words?
- **Priorities are clear**: Can you separate must-haves from nice-to-haves?
- **Dependencies are mapped**: Can you draw a dependency graph between features?
- **No ambiguity remaining**: If you have to guess, you have NOT reached agreement.

Do NOT proceed to Step 2 until you can answer: "What are the concrete, unambiguous deliverables for each phase?"

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

Get the roadmap template: \`bp template roadmap\`. Fill with milestones and phases.

**Default: 1 milestone = the entire project.** Milestones are product releases, NOT development phases.

### Step 6: Validate

Check before finishing:
- All project requirements from Step 1 discussion are covered by some phase
- Phase dependencies form a DAG (no cycles)
- Each phase has a concrete, verifiable deliverable
- Phase count per milestone: small 1-2, medium 2-3, large 3-4
- First phase is always the thinnest possible end-to-end path
- No template placeholders remaining

## Output

- \`bp/roadmap.md\` — structured roadmap with milestone and phase info

## Guardrails

- **Default: 1 milestone.** No "foundation", "setup", "scaffolding" — M1 = shippable product.
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
