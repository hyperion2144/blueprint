# blueprint — Spec-Driven Development Workflow

## What

blueprint is an independent TypeScript CLI package that provides a spec-driven development workflow for AI coding agents. It combines core capabilities from three projects:

- **OpenSpec** (MIT) — CLI architecture, change structure, delta-spec merge mechanism
- **GSD Core** (MIT) — milestone/phase hierarchy, fresh-context sub-agent parallel execution
- **Trellis** (AGPL-3.0, concept reference only) — spec auto-injection, code cognition backfill

## Why

AI coding agents are powerful but unpredictable — requirements exist only in chat history. blueprint aligns on specs before writing code, executes heavy work in fresh-context sub-agents, and persists state across sessions through structured artifacts.

## Core Principles

1. **Dual nested loops** — Phase loop (discuss→research→split→change loop→ship) ⊃ Change loop (plan→apply→review→verify→archive)
2. **CLI as single source of truth** — all interaction through CLI; agents orchestrate sub-agents, never implement directly
3. **Fresh-context sub-agents** — heavy work (research/plan/apply/review/verify/archive) runs in fresh context via sub-agents
4. **Dual spec backfill** — delta-spec forward merge + code cognition backward extraction
5. **TDD enforced** — type:behavior tasks follow RED→GREEN→REFACTOR
6. **Single source templates** — commands and skills generated from the same TypeScript modules; all content in English

## Entity Hierarchy

```
Project → Milestone (persistent, defaults to v1) → Phase → Change
                                                      └── Adhoc Change (independent)
```

- **Milestone** = release cycle (shippable increment, e.g. v0.1.0)
- **Phase** = work unit (3-8 phases per milestone, goes through discuss/research/split/ship)
- **Change** = change unit (goes through plan/apply/review/verify/archive)
- **Adhoc Change** = independent change outside milestone/phase (same change cycle, created via `blueprint change new`)

## State Machine

### Project-level
```
initialized → requirements-defined → researched → roadmap-defined
    → milestone-active → milestone-shipped
```

### Phase-level
```
discuss → research-phase → split → [change cycle] → ship
```

### Change-level
```
proposal → planning → applying → reviewing → verifying → archived
                ↑← replan  ←  ←  ←  ←
                ↑← reapply ←  ←  ←
```

### Advancement

| Scope | Command |
|-------|---------|
| Project/Phase | `blueprint continue` |
| Change | `blueprint continue change <name>` |

The continue command validates exit conditions, advances state, and outputs the next step's full instructions inline — agents execute without reading separate files.

## Template Architecture

Commands and skills share a single TypeScript source per workflow step:

```
src/templates/
├── types.ts                    — SkillTemplate, CommandTemplate, ArtifactTemplate, AgentPromptTemplate
├── workflows/
│   ├── registry.ts             — 16-step WORKFLOW_REGISTRY with direct imports
│   ├── init.ts … continue.ts   — one module per step, exports getXxxSkillTemplate() and getXxxCommandTemplate()
├── artifacts/index.ts          — 11 output document templates (proposal, design, tasks, etc.)
└── agents/index.ts             — 9 agent system prompts (planner, executor, reviewer, etc.)
```

Each workflow module's `instructions` string follows `## Input → ## Steps → ## Output → ## Guardrails` format. Templates with sub-agents include the full sub-agent prompt template and an orchestrator guardrail.

Run `blueprint update` to regenerate all `.omp/` output files from the TypeScript source. `blueprint template <type>` reads from the in-memory `ARTIFACT_TEMPLATES` registry — no disk reads.

## Tech Stack

- Language: TypeScript
- Runtime: Node.js ≥ 20
- Test: Vitest
- Build: tsup (ESM output)
- Target platforms: OMP (primary), Claude Code (planned)

## Version

- **Current**: v0.2.2 (English templates, inline continue, sub-agent dispatch, parameter declarations)
- **Next**: m2-claude-code — Claude Code platform support

## Status

- [x] grill — requirements exploration complete (21 design decisions confirmed)
- [x] research — technical research complete
- [x] roadmap — roadmap defined (m1-core × 6 phases)
- [x] m1-core shipped — v0.1.0 released (CLI core: init, update, state, continue, template, archive, list)
- [x] v0.2.x fixes — 17 adhoc changes resolved (state tracking, templates, generators, sub-agents)
- [x] v0.2.2 — template architecture refactored: English content, TS source, inline continue, sub-agent clarity
- [ ] m2-claude-code — Claude Code platform support

See [state.md](state.md) for detailed history and [roadmap.md](roadmap.md) for future plans.
