# Architecture Research: Generator Platform Abstraction

> Research output — recommended architecture with rationale and alternatives.

---

## Recommendation
**Platform Strategy Pattern** — one `PlatformGenerator` interface per platform, a **Strategy Registry** for lookup, and a central dispatcher in `src/generators/index.ts` that iterates `project.yml.platform[]` and delegates.

## Architecture Overview
```text
src/generators/index.ts           ← entry: iterate config.platform, dispatch
  │
  ├─ GeneratorContext             ← shared data passed to each strategy
  │    { config, workflowRegistry, agentPrompts, stepDefs, agentDefs }
  │
  ├─ PlatformGenerator interface  ← { generateAll(): GeneratedFile[] }
  │
  ├─ Platform Registry            ← { omp, claude-code, agent } → PlatformGenerator
  │
  ├─ integrations/omp/index.ts    ← OMP strategy
  │    ├─ commands.ts             ← .omp/commands/bp-*.md
  │    ├─ agents.ts               ← .omp/agents/bp-*.md
  │    ├─ skills.ts               ← .omp/skills/bp-*/SKILL.md
  │    └─ frontmatter.ts          ← OMP-specific frontmatter helpers
  │
  ├─ integrations/claude-code/index.ts ← Claude Code strategy
  │    ├─ commands.ts             ← .claude/commands/bp-*.md
  │    ├─ agents.ts               ← .claude/agents/bp-*.md
  │    └─ frontmatter.ts          ← CC-specific frontmatter
  │
  └─ integrations/agent/index.ts  ← Generic agent strategy
       ├─ skills.ts               ← .agent/skills/bp-*/SKILL.md
       ├─ agents.ts               ← .agent/agents/bp-*.md
       └─ frontmatter.ts          ← Generic frontmatter (no OMP fields)

Shared across all:
  src/templates/workflows/*.ts    ← unchanged — WORKFLOW_REGISTRY
  src/templates/agents/*.ts       ← shared agent prompt bodies
  src/core/continue.ts            ← expandTemplateVars (already handles [BP:xxx])
```

## Alternatives Evaluated
| Approach | Strengths | Weaknesses | Verdict |
|----------|-----------|-----------|---------|
| **Strategy Pattern** (recommended) | Clean interface per platform; each owns its output path & frontmatter; easy to add new platform; OMP code untouched | Requires small refactor of generator entry | ✅ Best fit — platforms share data but diverge in structure |
| **Template Method** | Enforces a fixed generation sequence across all platforms | Forces every platform into the same `generateCommands → generateAgents → generateSkills` shape, but `.agent/` uses skills instead of commands — wrong abstraction | ❌ Rigid — `.agent/` fundamentally different structure |
| **Registry-based dispatch only** | Simple map: platform → handler fn | No contract enforcement; drifts easily as platform count grows | ❌ Fine for 2 platforms, but fails at 3+ with diverging output shapes |
| **Single mega-generator with `if/switch`** | Zero refactoring of existing code | Couples everything; each new platform touches shared switch; OMP changes become risky | ❌ Violates "OMP unchanged" requirement |

## Key Decisions

1. **PlatformGenerator interface as an abstract class, not a TypeScript `interface`**. Strategy methods share common helpers (frontmatter rendering, path construction). Abstract class with `protected` helpers avoids duplication across strategies. Concrete implementations override `generateAll()` and optionally `generateCommands()`/`generateAgents()`/`generateSkills()`.

2. **Command & Skill generation both use `WORKFLOW_REGISTRY` as-is**. The registry is already shared across all platforms — each strategy selects `entry.command()` or `entry.skill()` depending on the target output. The template body is the same; only the frontmatter envelope changes.

3. **Agent definitions extracted to shared location**. Currently `AGENT_DEFS` and `STEP_DEFS` live inside the OMP integration. Move them to `src/core/shared-defs.ts` so all platforms reference the same definitions. Each platform wraps them with platform-specific frontmatter (OMP-specific fields like `modelRoles`/`thinkingLevel` vs generic YAML array for `.agent/`).

4. **Path root as a strategy property**. Each strategy declares `outputRoot: string` (`.omp/`, `.claude/`, `.agent/`). The abstract base class provides `filePath(relative: string): string` that prepends `outputRoot`.

5. **`.agent/skills/` uses `[BP:xxx]` parameter format**. The skill body from `WORKFLOW_REGISTRY[step].skill()` uses `$1`/`$ARGUMENTS` (OMP convention). The `.agent/` strategy must post-process the body, replacing `$1` → `[BP:CHANGE_NAME]`, `$ARGUMENTS` → `[BP:CHANGE_NAME]` etc., before writing. This is a **single replaceAll pass** — the `.agent` frontmatter (frontmatter.ts) does the substitution before output.

6. **Claude Code platform reuses OMP's structure most closely**. Both are command-capable platforms. Claude Code's `.claude/commands/` follows the same frontmatter pattern as OMP (name, description, argument-hint) plus Claude Code-specific fields (e.g., model config). The claude-code strategy can inherit from a shared "command-based platform" base class if useful, or just replicate the pattern.

7. **OMP integration MUST remain untouched**. The OMP strategy is the baseline — its code does not change. It simply gets wrapped in a `PlatformGenerator` adapter that delegates to the existing `generateAllCommands`/`generateAllAgents`/`generateAllSkills`. No imports in the existing OMP files change.

8. **Dispatcher signature**:
   ```
   function generateAll(config: ProjectConfig): GeneratedFile[] {
     const context = buildGeneratorContext(config);
     return config.platform.flatMap(p => {
       const strategy = PLATFORM_REGISTRY[p];
       if (!strategy) throw new Error(`Unknown platform: ${p}`);
       return strategy.generateAll(context);
     });
   }
   ```

## Risks & Mitigations

1. **Risk: Existing OMP imports in `src/generators/index.ts` break during refactor.** Mitigation: Introduce the new architecture behind the existing `generateAll()` export. The old imports become the OMP strategy adapter code. The entry `generateAll()` signature stays the same — callers don't change.

2. **Risk: `WORKFLOW_REGISTRY` template body contains `$1`/`$ARGUMENTS` that must be `[BP:xxx]` for `.agent/` format.** Mitigation: The `.agent/` skills generator does a `replaceAll` pass before writing. This is bounded and testable — `expandTemplateVars` already does the reverse mapping at runtime. A unit test verifies every `[BP:xxx]` parameter has a corresponding replacement in `expandTemplateVars()` and vice versa.

3. **Risk: Frontmatter divergence creates maintenance burden.** Mitigation: Each platform's `frontmatter.ts` is self-contained. Shared fields (name, description) are rendered by the abstract base class. Platform-specific fields are added in each platform's file. When adding a new platform, you write exactly one frontmatter file.

4. **Risk: Multi-platform generation doubles/triples output files, slowing `bp update`.** Mitigation: Not a real concern for <10 platforms. If it becomes one, parallelize via `Promise.all` — each strategy generation is independent.

5. **Risk: `expandTemplateVars()` currently maps `[BP:xxx]` → variables. For `.agent/` skills, the body already contains `[BP:xxx]` — no further expansion needed at generation time.** Mitigation: Correct — `[BP:xxx]` in skill files is expanded at runtime when the agent reads the skill and calls `bp continue`. The `.agent/` generator writes `[BP:CHANGE_NAME]` literally into the skill file; no template expansion needed at generation time.
