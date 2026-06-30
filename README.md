# specwf — Spec-Driven Development Workflow

specwf is an independent TypeScript CLI package that provides a spec-driven development workflow for AI coding agents. It combines core capabilities from three projects:

- **OpenSpec** (MIT) — CLI architecture, change structure, delta-spec merge mechanism
- **GSD Core** (MIT) — milestone/phase hierarchy, fresh-context sub-agent parallel execution
- **Trellis** (AGPL-3.0, concept reference only) — spec auto-injection, code cognition backfill

## Why

AI coding agents are powerful but unpredictable — requirements exist only in chat history. specwf aligns on specs before writing code, executes heavy work in fresh-context sub-agents, and persists state across sessions through structured artifacts.

## Core Principles

1. **Dual nested loops** — Phase loop (discuss→research→split→change loop→ship) ⊃ Change loop (plan→apply→review→verify→archive)
2. **CLI as single source of truth** — all interaction through CLI; agents orchestrate, don't implement
3. **Fresh-context sub-agents** — heavy work (research/apply/review/verify/archive) runs in fresh context to prevent context rot
4. **Dual spec backfill** — delta-spec forward merge + code cognition backward extraction
5. **TDD enforced** — type:behavior tasks follow RED→GREEN→REFACTOR
6. **Single source templates** — commands and skills generated from the same TypeScript modules; all content in English

## Entity Hierarchy

```
Project → Milestone (persistent, defaults to v1) → Phase → Change
```

- **Milestone** = release cycle (shippable increment)
- **Phase** = work unit (goes through discuss/research/split/ship)
- **Change** = change unit (goes through plan/apply/review/verify/archive)
- **Adhoc Change** = independent change outside milestone/phase (same change cycle)

## CLI Commands

| Command | Scope | Description |
|---------|-------|-------------|
| `specwf init` | Project | Initialize specwf project structure |
| `specwf update` | Project | Regenerate platform files (commands, agents, skills) |
| `specwf continue` | Project/Phase | Advance project or phase to next step |
| `specwf continue change <name>` | Change | Advance a specific change to next step |
| `specwf change new <name>` | Change | Create an adhoc change |
| `specwf state` | All | View current state and pending work |
| `specwf config` | Project | View/modify configuration |
| `specwf context <step>` | All | Output file manifest for a step |
| `specwf template <type>` | All | Generate artifact template |
| `specwf list` | All | List milestones/phases/changes/archive |
| `specwf archive <change>` | Change | Archive a completed change |

## Workflow

### Project-level flow
```
init → grill → research → roadmap → discuss → research-phase → split → [change cycle] → ship
```

Advance with: `specwf continue`

### Change-level flow
```
plan → apply → review → verify → archive
```

Advance with: `specwf continue change <name>`

### Adhoc change flow
```
specwf change new <name> → plan → apply → review → verify → archive
```

Advance with: `specwf continue change <name>`

## Template Architecture

Commands (`.omp/commands/`) and skills (`.omp/skills/`) are generated from a single TypeScript source per workflow step. Templates live in `src/templates/`:

```
src/templates/
├── types.ts              — SkillTemplate, CommandTemplate, ArtifactTemplate, AgentPromptTemplate
├── workflows/
│   ├── registry.ts       — 16-step registry with direct imports
│   ├── init.ts … continue.ts
├── artifacts/index.ts    — 11 output document templates
└── agents/index.ts       — 9 agent system prompts
```

Run `specwf update` to regenerate all 40 platform files from the TypeScript source.

## Configuration

Key settings in `specwf/project.yml`:

- `profile`: workflow strictness (`lite` / `standard` / `strict`)
- `platform`: target platform (`omp` / `claude-code`)
- `workflow.tdd`: enforce TDD for type:behavior tasks
- `workflow.triple_review`: parallel spec/quality/goal reviews
- `review.gate`: review gate mode (`all-pass` / `severity` / `report-only`)

## Tech Stack

- Language: TypeScript
- Runtime: Node.js ≥ 20
- Test: Vitest
- Target platforms: OMP (primary), Claude Code (planned)

## Version

- **Current**: v0.2.2 — English templates, inline continue instructions, sub-agent dispatch clarity
- **Next**: m2-claude-code — Claude Code platform support

## Bootstrapping

specwf was built using its own workflow. See `specwf/state.md` for the complete build history and all design decisions.

## License

MIT
