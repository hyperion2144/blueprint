# Change Summary: refactor-templates-i18n

## Intent
Refactor specwf template architecture: unify command/skill generation from TypeScript source, switch all content to English, make `specwf continue` output inline instructions, and follow OpenSpec's template format.

## Output Files

| File | Action |
|------|--------|
| `src/templates/types.ts` | Create — SkillTemplate, CommandTemplate, ArtifactTemplate, AgentPromptTemplate |
| `src/templates/workflows/registry.ts` | Create — 16-step registry with direct imports |
| `src/templates/workflows/init.ts` | Create — English, Input/Steps/Output/Guardrails |
| `src/templates/workflows/grill.ts` | Create |
| `src/templates/workflows/research.ts` | Create |
| `src/templates/workflows/roadmap.ts` | Create |
| `src/templates/workflows/milestone.ts` | Create |
| `src/templates/workflows/discuss.ts` | Create |
| `src/templates/workflows/research-phase.ts` | Create |
| `src/templates/workflows/split.ts` | Create |
| `src/templates/workflows/adhoc.ts` | Create |
| `src/templates/workflows/plan.ts` | Create |
| `src/templates/workflows/apply.ts` | Create |
| `src/templates/workflows/review.ts` | Create |
| `src/templates/workflows/verify.ts` | Create |
| `src/templates/workflows/archive.ts` | Create |
| `src/templates/workflows/ship.ts` | Create |
| `src/templates/workflows/continue.ts` | Create |
| `src/templates/agents/index.ts` | Create — 9 agent prompts in English |
| `src/templates/artifacts/index.ts` | Create — 11 artifact templates in English |
| `src/generators/omp-commands.ts` | Modify — import from TS templates instead of readFileSync |
| `src/generators/skills.ts` | Modify — same pattern |
| `src/generators/omp-agents.ts` | Modify — import from AGENT_PROMPTS registry |
| `src/commands/specwf-template.ts` | Modify — read from ARTIFACT_TEMPLATES registry |
| `src/commands/specwf-change.ts` | Modify — read templates from TS, not disk |
| `src/commands/specwf-continue.ts` | Modify — inline instructions output + continueChangeHandler state fix |
| `src/core/continue.ts` | Modify — add instructions field, populate from WORKFLOW_REGISTRY |
| `src/core/state-validator.ts` | Modify — remove invalid `type` field from ExitCheck |
| `.omp/commands/*.md` | Regenerate — 16 files, English content |
| `.omp/skills/*/SKILL.md` | Regenerate — 16 files, English content |
| `.omp/agents/*.md` | Regenerate — 8 files, English prompts |
| `src/public/templates/` | Delete — all markdown templates removed |
|| `tests/integration/e2e.test.ts` | Modify — update Chinese assertions → English |
|| `tests/integration/specwf.test.ts` | Modify — same |
|| `src/commands/specwf-archive.ts` | Modify — fix summary.md → change-summary.md filename |
|| `README.md` | Modify — updated to reflect current architecture, commands, version |
|| `specwf/project.md` | Modify — updated to reflect template architecture, state machine, v0.2.2 |

### Post-apply refinements

|| File | Action | Description |
||------|--------|-------------|
|| `src/templates/workflows/apply.ts` | Modify — add pre-advance checklist (Step 8), summary mandatory guardrail |
|| `src/templates/workflows/research.ts` | Modify — sub-agent dispatch clarity: prompt template + orchestrator guardrail |
|| `src/templates/workflows/research-phase.ts` | Modify — same pattern |
|| `src/templates/workflows/plan.ts` | Modify — restructured from main-agent actions to sub-agent dispatch; parameter declaration |
|| `src/templates/workflows/review.ts` | Modify — sub-agent prompt template per review type + orchestrator guardrail |
|| `src/templates/workflows/verify.ts` | Modify — sub-agent prompt template + orchestrator guardrail |
|| `src/templates/workflows/archive.ts` | Modify — sub-agent prompt template + orchestrator guardrail |
|| `src/templates/workflows/continue.ts` | Modify — two-command distinction (project vs change), parameter declaration, scenario A/B/C |
|| `src/templates/workflows/adhoc.ts` | Modify — parameter declaration, no-name handling |

## Key Decisions

- **Single source**: Each workflow step's instructions live in one TypeScript module; `omp-commands.ts` and `skills.ts` read the same `instructions` string
- **No barrel re-exports**: Used direct-import `registry.ts` instead of `export-from` barrels to avoid TS module resolution issues
- **Template format**: Adopted OpenSpec's `## Input → ## Steps → ## Output → ## Guardrails` structure
- **Inline instructions**: `specwf continue` outputs full step instructions — agents execute without reading a second file
- **Orchestrator pattern**: Every sub-agent template explicitly states "you are the orchestrator — dispatch, do not X yourself"
- **Parameter declarations**: Every template declares expected parameters in `## Input > ### Parameters`; handles both "with" and "without" cases
- **Two continue commands**: `specwf continue` (project/phase) vs `specwf continue change <name>` (change) clearly separated

## Bugs Fixed

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| `specwf continue change <name>` never advances state | `continueChangeHandler` had no `updateState` call | Added state update with short-status derivation |
| `state-validator.ts` TS2353 errors | `ExitCheck` objects had undeclared `type` field | Removed the extra `type` field |
| `omp-agents.ts` TS2339 error | `resolveModels()` returns `ModelMap` which has no `agent` key | Changed to direct role lookup |

## Verification

- TypeScript: 0 errors (`tsc --noEmit`)
- Tests: 79/79 passing (13 test files)
- CLI: `specwf update` regenerates 40 files correctly
- Continue: outputs inline `─── Instructions ───` block with full step content
