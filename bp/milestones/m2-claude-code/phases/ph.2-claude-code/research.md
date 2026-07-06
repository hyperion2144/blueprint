# Phase Research: ph.2-claude-code

> Implementation path investigation for Claude Code platform provider.

---

## Research Scope

Design and recommend implementation for two Claude Code generators:

1. **Skills generator** (`src/integrations/claude-code/commands.ts`) — produces `.claude/skills/bp-<step>.md` flat files
2. **Agents generator** (`src/integrations/claude-code/agents.ts`) — produces `.claude/agents/bp-<role>.md` files

Both reuse existing template content (WORKFLOW_REGISTRY for skills, AGENT_PROMPTS for agents) and
register as a `'claude-code'` PlatformProvider with `capabilities.supportsCommands: false`.

---

## Recommended Approach

### Skills Generator (`commands.ts`)

**Recommendation**: Mirrors OMP `commands.ts` pattern — static `SKILL_DEFS` array maps step names to Claude Code frontmatter fields; body fetched from `WORKFLOW_REGISTRY[step].command().content`.

**Frontmatter fields to emit**:

| Field | Source | Always? |
|-------|--------|---------|
| `name` | `bp-<step>` | Yes |
| `description` | From SKILL_DEFS | Yes |
| `argument-hint` | Only for steps that take args (plan, apply, audit, etc.) | Conditional |
| `allowed-tools` | Not emitted (no tool restriction needed in skills) | No |

Body = `WORKFLOW_REGISTRY[step].command().content` (same content as OMP commands — uses `$1`/`$ARGUMENTS` natively).

**Interface**:
```typescript
export interface ClaudeSkillDef {
  step: string;
  name: string;            // "bp-<step>"
  description: string;     // one-line description
  argumentHint?: string;   // optional, for steps needing args
}
```

**Why `.command()` not `.skill()`**: OMP skills use `.skill().instructions` (the `SkillTemplate` envelope). Claude Code skills need the same raw content — but OMP's `SkillTemplate` has slightly different formatting (the `name` field in `instructions` differs). Using `.command().content` gives us the same body text OMP commands use, which is the most authoritative content source. The remaining template modules all return the same underlying `instructions` string via both getters — the difference is only the envelope type (`SkillTemplate` vs `CommandTemplate`).

**Generated file shape** (flat, `.claude/skills/bp-<step>.md`):
```markdown
---
name: bp-<step>
description: <one-line description>
---

## Input
...
```

### Agents Generator (`agents.ts`)

**Recommendation**: Mirrors OMP `agents.ts` pattern — static `AGENT_DEFS` array maps roles to Claude Code agent frontmatter; body fetched from `AGENT_PROMPTS[role]`.

**Frontmatter fields to emit** (per D6 — simplified Claude Code standard):

| Field | Source | Value |
|-------|--------|-------|
| `name` | Static | `bp-<role>` |
| `description` | From AGENT_DEFS | One-line role description |
| `tools` | From AGENT_DEFS | Tool whitelist (YAML list) |
| `model` | Resolved from config | `sonnet`/`opus`/`haiku`/`inherit` — mapped from bp's model profile |

**Fields NOT emitted** (Phase 3 scope or not applicable): `disallowedTools`, `permissionMode`, `maxTurns`, `skills`, `mcpServers`, `hooks`, `memory`, `isolation`, `color`, `effort`, `background`, `initialPrompt`, `blocking`, `autoloadSkills`, `readSummarize`, `spawns`, `thinkingLevel`.

**Interface**:
```typescript
export interface ClaudeAgentDef {
  role: string;           // matches AGENT_PROMPTS key
  description: string;    // one-line description
  tools: string[];        // tool whitelist
}
```

**Generated file shape** (`.claude/agents/bp-<role>.md`):
```markdown
---
name: bp-<role>
description: <one-line description>
tools:
  - read
  - grep
  - write
model: sonnet
---
## Role
...
```

### Registration — `index.ts`

```typescript
const claudeCodeProvider: PlatformProvider = {
  id: 'claude-code',
  name: 'Claude Code',
  capabilities: { supportsCommands: false },
  generate(config) {
    return [
      ...generateClaudeSkills(config),
      ...generateClaudeAgents(config),
    ];
  },
};
```

The `supportsCommands: false` flag follows the same pattern as OMP's `index.ts` — when `false`, skills are generated instead of commands. Since Claude Code treats `.claude/skills/` files similarly to commands (they appear in `/` listings), skills are the right output type.

---

## Alternatives Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|--------|
| **Flat `.claude/skills/bp-<step>.md`** (D4) | Simpler path logic; matches `.claude/commands/` single-file convention; no subdirectory nesting | Skips `.agent/skills/` open standard compatibility | ✅ **Chosen** |
| **Subdirectory `.claude/skills/<step>/SKILL.md`** | Compatible with `.agent/` open standard; allows bundled `scripts/`/`references/` | Extra path component; subdirectory not needed for Phase 2; more IO operations | ❌ Rejected |
| **Emit full Claude Code agent frontmatter** (all 17 fields) | Most complete Claude Code spec compliance | Bloated files; most fields not applicable (no mcpServers, no hooks in bp); Phase 3 adds `.agent/` format separately | ❌ Rejected |
| **Reuse OMP's SKILL_DEFS directly** | Avoids duplication | OMP and Claude Code have different frontmatter fields (OMP has `hide`, Claude Code has `allowed-tools`/`effort`); sharing would couple them | ❌ Rejected |

---

## File Path Convention Analysis

### D4 reaffirmed: `.claude/skills/bp-<step>.md` (flat)

**Rationale**:
- Claude Code natively supports `.claude/commands/<name>.md` as flat single files
- Since v2.x, `.claude/commands/` files are treated as skills — they appear in `/` listings
- The roadmap explicitly names `skills` as the target directory, not `commands`
- A flat path avoids the `.agent/skills/<step>/SKILL.md` subdirectory overhead
- The `bp-` prefix avoids naming collisions with user-defined skills

**`skills` vs `commands` directory**: Using `.claude/skills/` (instead of `.claude/commands/`) is intentional — the roadmap calls them skills, and Claude Code v2.x treats `.claude/commands/*.md` as skills anyway. Either path works for Claude Code. `skills` is more future-proof as the `.agent/` open standard moves toward `.agent/skills/`.

**Agent paths**: `.claude/agents/bp-<role>.md` — matches Claude Code's convention for project-level agent definitions. No directory nesting.

### Edge case: Empty WORKFLOW_REGISTRY entry

If a step is in `SKILL_DEFS` but not in `WORKFLOW_REGISTRY` (possible for future steps), fall back to a generated body:
```typescript
const body = entry ? entry.command().content : `# ${def.description}\n\nWorkflow guide for the \`${def.step}\` step.`;
```

---

## Parameter Format: `$1`/`$ARGUMENTS` Preservation

### Decision (D5) confirmed

WORKFLOW_REGISTRY templates already use `$1`/`$ARGUMENTS` for positional parameters. Claude Code natively supports `$1`/`$N` and `$ARGUMENTS` substitutions in command/skill bodies. No transformation needed.

**No `[BP:xxx]` → `$1` mapping required** because:
- Templates already use `$1` directly (they don't use `[BP:xxx]` in instruction bodies)
- The OMP commands generator emits the same templates unchanged
- `expandTemplateVars()` in `src/core/continue.ts` handles runtime substitution of `$1` → actual value

**What stays the same across platforms**:

| Template content | OMP command | Claude Code skill |
|------------------|-------------|-------------------|
| `Apply change $1` | `Apply change $1` | `Apply change $1` |
| `$ARGUMENTS` | `$ARGUMENTS` | `$ARGUMENTS` |

Claude Code resolves `$1` at invocation time. No bp-side substitution needed during generation.

---

## TDD Implications

### Skills Generator (`commands.ts`)

| Aspect | Approach |
|--------|----------|
| **Test type** | Unit tests for `generateClaudeSkill()` + `generateAllClaudeSkills()` |
| **Golden file** | ✅ **Golden-file snapshot** — generate all Claude Code skill files and compare against checked-in snapshots |
| **What to snapshot** | One `.claude/skills/` file per step, at minimum: `bp-init.md`, `bp-plan.md`, `bp-apply.md` (representative of different frontmatter shapes — no args, has args) |
| **Edge cases** | Step not in WORKFLOW_REGISTRY (should use fallback); step with `argumentHint` (frontmatter should include `argument-hint`); step with special chars in description |
| **Non-capturing tests** | Frontmatter parsing — generated YAML frontmatter is valid and parseable; `name` field starts with `bp-`; body is non-empty |

### Agents Generator (`agents.ts`)

| Aspect | Approach |
|--------|----------|
| **Test type** | Unit tests for `generateClaudeAgent()` + `generateAllClaudeAgents()` |
| **Golden file** | ✅ **Golden-file snapshot** — generate all Claude Code agent files and compare against checked-in snapshots |
| **What to snapshot** | One `.claude/agents/` file per role: `bp-researcher.md`, `bp-planner.md`, `bp-executor.md` |
| **Edge cases** | Agent not in AGENT_PROMPTS (fallback body); model resolution fallback path; tools array empty vs non-empty |
| **Model resolution** | Test priority chain: `config.agentModels[role]` > `resolveModels(config)[role]` > `'sonnet'` default |

### Integration Tests

| Aspect | Approach |
|--------|----------|
| **Platform registration** | Verify `registerClaudeCodeProvider()` is idempotent; verify provider.id is `'claude-code'`; verify `capabilities.supportsCommands` is `false` |
| **Generation dispatch** | Via `src/generators/index.ts` — verify adding `'claude-code'` to `config.platform` includes Claude Code files in output |
| **Combined output** | Generate with both `omp` and `claude-code` platforms — verify no duplicate paths or unexpected file overlap |

### Snapshot File Layout

Suggested snapshot directory: `tests/__snapshots__/claude-code/` (vitest's default `__snapshots__` dir, or use `toMatchFileSnapshot()`).

```
tests/
  __snapshots__/
    claude-code/
      skills/
        bp-init.md         # no args
        bp-plan.md          # with argument-hint
        bp-audit.md         # with argument-hint (different shape)
      agents/
        bp-researcher.md
        bp-planner.md
        bp-executor.md
```

### Test Execution

```bash
npx vitest run src/integrations/claude-code/
```

Snapshots update with `--update`. Each code change that affects output will require a snapshot update — this is intentional and documents the output change.

---

## Known Pitfalls

1. **Body content divergence**: OMP skills use `entry.skill().instructions` while Claude Code skills will use `entry.command().content`. If a template module ever returns different strings from `skill()` vs `command()`, the Claude Code skill will show the command text. Currently they share the same `instructions` string, but this is a maintenance coupling to track.

2. **Model mapping gap**: bp's model resolution (`pi/default`, `pi/smol`, etc.) doesn't map directly to Claude Code model aliases (`sonnet`, `opus`, `haiku`, `inherit`). Phase 2 should map: `default`→`sonnet`, `slow`→`opus`, `smol`→`haiku`. Phase 3 may refine this when `.agent/` format is added.

3. **Agent `tools` field whitelisting**: Claude Code agents with explicit `tools` lists restrict what the subagent can use. The OMP AGENT_DEFS lists common tools (`read`, `grep`, `glob`, etc.) but Claude Code supports more tools. Too narrow a whitelist could block legitimate subagent capabilities. Recommendation: start with the same tool lists as OMP AGENT_DEFS and expand based on usage.

4. **`bp-` prefix collisions**: If a user already has `.claude/skills/bp-init.md`, generate will overwrite it without warning. This is the same risk as OMP's `.omp/commands/` path. Out of scope for Phase 2 but worth documenting.

5. **No `argument-hint` on skills**: Claude Code's skill format supports `argument-hint` (unlike OMP skills which only have `name`/`description`/`hide`). Steps that take arguments (plan, apply, audit) should include `argument-hint` in their frontmatter. If omitted, the skill won't show argument hints in autocomplete.

6. **`allowed-tools` deliberately skipped**: Claude Code supports `allowed-tools` in skills to whitelist tools. Not emitting it means the skill inherits all tools from the parent agent — which is the correct default for bp skills that need tool access (bash, read, write, etc.).

7. **CLAUDE.md not modified**: The `claude-code` provider generates files but does not update `.claude/CLAUDE.md` or project configuration. Users may need to ensure their CLAUDE.md or `.claude/settings.json` enables the skills directory. Out of scope for Phase 2.
