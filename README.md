# Blueprint — Spec-Driven Development Workflow

Blueprint is a spec-driven development CLI for AI coding agents. Write behavioral specs once, let agents implement against them across the full project lifecycle.

## Why

AI coding agents are powerful but unpredictable — requirements exist only in chat history. Blueprint aligns on specs before writing code, executes heavy work in fresh-context sub-agents, and persists state across sessions through structured artifacts.

## Core Principles

1. **Dual nested loops** — Phase loop (discuss→research-phase→split→change loop→ship) ⊃ Change loop (plan→apply→review→archive)
2. **CLI as single source of truth** — all interaction through `bp` commands; agents orchestrate, don't implement
3. **Fresh-context sub-agents** — heavy work (research/plan/apply/review) runs in fresh context to prevent context rot
4. **Delta-spec mechanism** — change-level behavioral contracts merged into global specs on archive
5. **TDD enforced** — type:behavior tasks follow RED→GREEN→REFACTOR
6. **Tech stack templates** — init with domain-organized specs and conventions per stack

## Entity Hierarchy

```
Project → Milestone → Phase → Change
```

- **Milestone** = release cycle ("M1-core", "M2-expansion")
- **Phase** = work unit within a milestone ("ph.1-board-engine")
- **Change** = implementation unit (goes through plan→apply→review→archive)
- **Adhoc Change** = independent change outside milestone/phase

## CLI Commands

| Command | Description |
|---------|-------------|
| `bp init` | Initialize project structure with tech stack specs |
| `bp update` | Regenerate platform files (commands, agents, hook) |
| `bp continue` | Auto-advance project to next step |
| `bp continue change <name>` | Advance a specific change |
| `bp change new <name>` | Create a new change |
| `bp state` | View current state and pending work |
| `bp config [list\|set]` | View/modify configuration |
| `bp context <step>` | Output file manifest for a step |
| `bp template <type>` | Generate artifact template |
| `bp list` | List milestones/phases/changes/archive |
| `bp archive <change>` | Archive a completed change |
| `bp commit <msg>` | Commit with conventional format, auto-mark tasks |
| `bp dispatch <role>` | Output sub-agent dispatch instructions |
| `bp ship` | Create PR or Release from unpublished changes |
| `bp audit` | Human UAT verification |

## Workflow

### Project-level flow
```
init → grill → research → roadmap → discuss → research-phase → split → [change cycle] → ship
```

Advance with: `bp continue`

### Change-level flow
```
proposal → plan → apply → review → archive
```

Advance with: `bp continue change <name>`

### Adhoc change
```
bp change new <name> → proposal → plan → apply → review → archive
```

### Autonomous loop
```
bp:loop — auto-advance through all steps without user input
```

## Template Architecture

Commands (`.omp/commands/`) and agents (`.omp/agents/`) are generated from TypeScript source. Templates live in `src/templates/`:

```
src/templates/
├── types.ts                  — Template interfaces
├── workflows/                — 19 step workflow definitions
├── artifacts/index.ts        — Output document templates
├── agents/index.ts           — 7 agent system prompts
└── spec-stacks/              — Tech stack spec templates
```

Run `bp update` to regenerate all 27 platform files from source.

## Configuration

Key settings in `bp/project.yml`:

| Key | Description | Default |
|-----|-------------|---------|
| `profile` | Workflow strictness | `standard` |
| `platform` | Target platform | `omp` |
| `spec.stack` | Tech stack spec template | `generic` |
| `workflow.tdd` | Enforce TDD for behavioral tasks | `true` |
| `workflow.commitDocs` | Auto-commit doc files with code | `false` |
| `release.template` | PR body template | `standard` |
| `review.gate` | Review gate mode | `all-pass` |

## Tech Stack

- Language: TypeScript
- Runtime: Node.js ≥ 20
- Test: Vitest
- Target platform: OMP

## Install

```bash
npm install -g @hyperion2144/blueprint
```

## Usage

Start a new project:
```bash
mkdir my-project && cd my-project
bp init          # interactive wizard: profile, tech stack, conventions
```

Browse existing codebase:
```bash
cd existing-project
bp init --brownfield   # auto-detects tech stack, bootstraps specs
```

## Recommended Loop

After init, follow this cycle until project ships:

```bash
# 1. Start: let BP auto-advance to current step
bp continue          # → routes to grill, discuss, plan, etc.

# 2. Fill artifacts: follow the step instructions
#    (grill fills requirements, plan fills design+tasks, etc.)

# 3. Commit completed work
bp commit "feat(scope): description" --files "..." --scope <scope> --record

# 4. Go to step 1
```

For autonomous execution:
```bash
/bp:loop    # slash command — auto-advance through all steps, AI decides everything
```

Typical change flow (after roadmap + split):

```bash
bp continue                    # → auto-routes to first change
bp continue change my-feature  # → proposal → plan → apply → review → archive
```

## License

MIT
