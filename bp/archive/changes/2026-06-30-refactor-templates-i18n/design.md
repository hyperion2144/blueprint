# Design: refactor-templates-i18n

## Context

specwf currently has two separate template systems generating the same content twice:
- **Commands** (`.omp/commands/specwf-<step>.md`) — loaded from `src/public/templates/commands/<step>.md`
- **Skills** (`.omp/skills/specwf-<step>/SKILL.md`) — loaded from `src/public/templates/skills/<step>.md`

Both are markdown files with `{{step}}` / `{{description}}` placeholders, rendered by:
- `src/generators/omp-commands.ts` — `loadAndRenderTemplate()` → `readFileSync` + `replace`
- `src/generators/skills.ts` — `loadTemplate()` → `readFileSync` + `replace`

The `specwf template` command also reads markdown files from `src/public/templates/artifacts/`.

## Goals / Non-Goals

**Goals:**
- Single TypeScript source-of-truth per workflow step (one function → two output formats)
- English content throughout
- Continue CLI outputs inline instructions
- Templates in `src/templates/` as TypeScript modules

**Non-Goals:**
- Changing workflow steps
- Changing agent orchestration
- Adding new platforms

## Decisions

### Decision 1: Template architecture follows OpenSpec pattern

Each workflow step gets a TypeScript module exporting two functions:

```typescript
// src/templates/workflows/apply.ts
export function getApplySkillTemplate(): SkillTemplate { ... }
export function getApplyCommandTemplate(): CommandTemplate { ... }
```

Where:
```typescript
interface SkillTemplate {
  name: string;
  description: string;
  instructions: string;      // Full workflow body
}

interface CommandTemplate {
  name: string;
  description: string;
  category: string;
  tags: string[];
  content: string;           // Same as SkillTemplate.instructions
}
```

The generators (`omp-commands.ts`, `skills.ts`) call these functions instead of `readFileSync`.

**Rationale**: Matches OpenSpec's proven pattern. TypeScript provides type-safety, IDE autocompletion, and eliminates runtime file I/O for template loading.

### Decision 2: Instruction format — Input → Steps → Output

Every instruction body follows this structure:

```
## Input
- Required files
- State prerequisites

## Steps
### Step 1: ...
### Step 2: ...

## Output
- Files produced
- State transitions

## Guardrails
- Constraints
- Common pitfalls
```

**Rationale**: Standard format that agents parse reliably. Matches OpenSpec's onboard.ts pattern.

### Decision 3: Continue CLI returns inline instructions

`specwf continue` currently outputs:
```
→ 下一步: plan
   参考: .omp/commands/specwf-plan.md
```

New behavior — reads the template function and outputs the full `instructions` body. The agent receives complete execution instructions in one turn, no extra file read needed.

**Implementation**: `src/core/continue.ts` imports the template functions and includes `instructions` in `ContinueResult`.

### Decision 4: Templates in src/templates/, not src/public/templates/

New structure:
```
src/templates/
├── types.ts                    # SkillTemplate, CommandTemplate interfaces
├── workflows/
│   ├── index.ts               # re-exports all
│   ├── init.ts                # getInitSkillTemplate, getInitCommandTemplate
│   ├── grill.ts
│   ├── research.ts
│   ├── roadmap.ts
│   ├── milestone.ts
│   ├── discuss.ts
│   ├── research-phase.ts
│   ├── split.ts
│   ├── adhoc.ts
│   ├── plan.ts
│   ├── apply.ts
│   ├── review.ts
│   ├── verify.ts
│   ├── archive.ts
│   ├── ship.ts
│   └── continue.ts
├── artifacts/
│   └── index.ts               # Artifact templates as TS constants
└── agents/
    └── index.ts               # Agent system prompts as TS constants
```

Deletion target: `src/public/templates/` (all markdown files).

### Decision 5: Agent definitions also move to TypeScript

Current agent system prompts live in `src/public/templates/agents/<role>.md`. Move to `src/templates/agents/index.ts` as exported string constants. The generator (`omp-agents.ts`) imports these instead of `readFileSync`.

### Decision 6: No runtime template loading

All templates are TypeScript imports — they're baked into the bundle at compile time. `specwf template` command reads from the in-memory template registry, not disk files.

## Data Flow

```
src/templates/workflows/apply.ts  ─┐
src/templates/workflows/plan.ts   ─┤
...                                ─┤
                                    │
                    ┌───────────────┘
                    ▼
         src/templates/workflows/index.ts
                    │
        ┌───────────┼──────────────┐
        ▼           ▼              ▼
  omp-commands.ts  skills.ts   specwf-continue.ts
  (wraps as       (wraps as   (embeds instructions
   CommandTemplate) SkillTemplate) in ContinueResult)
        │           │              │
        ▼           ▼              ▼
  .omp/commands/  .omp/skills/  CLI stdout
  specwf-*.md     specwf-*/SKILL.md
```

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/templates/types.ts` | CREATE | SkillTemplate, CommandTemplate interfaces |
| `src/templates/workflows/*.ts` | CREATE (17 files) | One per workflow step + index |
| `src/templates/artifacts/index.ts` | CREATE | Artifact templates as TS constants |
| `src/templates/agents/index.ts` | CREATE | Agent system prompts as TS constants |
| `src/generators/omp-commands.ts` | MODIFY | Import from templates instead of readFileSync |
| `src/generators/skills.ts` | MODIFY | Import from templates instead of readFileSync |
| `src/generators/omp-agents.ts` | MODIFY | Import agent prompts from templates |
| `src/core/continue.ts` | MODIFY | Include full instructions in ContinueResult |
| `src/commands/specwf-continue.ts` | MODIFY | Output inline instructions |
| `src/commands/specwf-template.ts` | MODIFY | Read from template registry, not disk |
| `src/public/templates/` | DELETE | All markdown template files removed |
| `.omp/commands/*.md` | REGENERATE | `specwf update` regenerates |
| `.omp/skills/*/SKILL.md` | REGENERATE | `specwf update` regenerates |
| `.omp/agents/*.md` | REGENERATE | `specwf update` regenerates |

## Test Strategy

- Unit tests for each template function (verify shape, section presence)
- Generator integration tests: verify old and new generators produce identical output (after language change)
- Continue CLI test: verify output contains inline instructions
- `specwf update` E2E test: regenerate and verify files exist
- Existing integration tests must pass after regeneration

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Translation quality of Chinese → English | Review each template against the original intent; use OpenSpec's onboard.ts wording as reference |
| Regenerated files differ from expected | Run `specwf update` and diff before/after (expect language + format diffs only) |
| Breaking existing workflows | Existing tests catch regressions; manual dogfood after regeneration |
