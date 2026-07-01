# Tasks: refactor-templates-i18n

## Wave 1: Infrastructure — template types + index

- [ ] 1.1 Create `src/templates/types.ts` — `SkillTemplate` and `CommandTemplate` interfaces
- [ ] 1.2 Create `src/templates/workflows/index.ts` — re-export barrel
- [ ] 1.3 Create `src/templates/artifacts/index.ts` — artifact templates barrel
- [ ] 1.4 Create `src/templates/agents/index.ts` — agent prompts barrel

## Wave 2: Workflow templates — one module per step

- [ ] 2.1 Create `src/templates/workflows/init.ts` — init workflow (English, Input/Steps/Output format)
- [ ] 2.2 Create `src/templates/workflows/grill.ts` — grill workflow
- [ ] 2.3 Create `src/templates/workflows/research.ts` — research workflow
- [ ] 2.4 Create `src/templates/workflows/roadmap.ts` — roadmap workflow
- [ ] 2.5 Create `src/templates/workflows/milestone.ts` — milestone workflow
- [ ] 2.6 Create `src/templates/workflows/discuss.ts` — discuss workflow
- [ ] 2.7 Create `src/templates/workflows/research-phase.ts` — research-phase workflow
- [ ] 2.8 Create `src/templates/workflows/split.ts` — split workflow
- [ ] 2.9 Create `src/templates/workflows/adhoc.ts` — adhoc workflow
- [ ] 2.10 Create `src/templates/workflows/plan.ts` — plan workflow
- [ ] 2.11 Create `src/templates/workflows/apply.ts` — apply workflow
- [ ] 2.12 Create `src/templates/workflows/review.ts` — review workflow
- [ ] 2.13 Create `src/templates/workflows/verify.ts` — verify workflow
- [ ] 2.14 Create `src/templates/workflows/archive.ts` — archive workflow
- [ ] 2.15 Create `src/templates/workflows/ship.ts` — ship workflow
- [ ] 2.16 Create `src/templates/workflows/continue.ts` — continue workflow

## Wave 3: Agent prompt templates — English version

- [ ] 3.1 Write `src/templates/agents/index.ts` — all 8 agent prompts in English

## Wave 4: Artifact templates — English version

- [ ] 4.1 Write `src/templates/artifacts/index.ts` — all output artifact templates in English

## Wave 5: Generator refactoring — import from TS, not markdown

- [ ] 5.1 Refactor `src/generators/omp-commands.ts` — import templates instead of readFileSync
- [ ] 5.2 Refactor `src/generators/skills.ts` — import templates instead of readFileSync
- [ ] 5.3 Refactor `src/generators/omp-agents.ts` — import agent prompts from templates

## Wave 6: Continue CLI — inline instructions

- [ ] 6.1 Modify `src/core/continue.ts` — add `instructions` field to `StepInfo` and `ContinueResult`
- [ ] 6.2 Modify `src/commands/specwf-continue.ts` — output inline instructions in `formatContinueResult`

## Wave 7: Template command — read from TS registry

- [ ] 7.1 Refactor `src/commands/specwf-template.ts` — read from in-memory template registry, not disk

## Wave 8: Cleanup — delete old markdown templates

- [ ] 8.1 Delete `src/public/templates/` directory
- [ ] 8.2 Delete `src/generators/templates/` directory (if it exists)

## Wave 9: Regenerate + verify

- [ ] 9.1 Run `specwf update` to regenerate all `.omp/` output files
- [ ] 9.2 Run existing integration tests
- [ ] 9.3 Manual verification: read a generated command and skill, confirm same content
