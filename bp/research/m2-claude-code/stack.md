# Tech Stack Research: Multi-Platform Generator Support

> Research output — platform formats, abstraction patterns, and implementation strategy for adding Claude Code + `.agent/` support to blueprint.

---

## Recommendation
**Template-driven platform abstraction with a registry pattern** — the existing `WORKFLOW_REGISTRY` + TypeScript template modules naturally generalize by adding a `tools?` output declaration and platform-specific format renderers. Each platform (`claude-code`, `agent`) gets a `src/integrations/<platform>/` directory following the same interface as `src/integrations/omp/`.

## Platform Format Comparison

### Claude Code Commands (`.claude/commands/<name>.md`)

| Field | Required | Notes |
|-------|----------|-------|
| `name` | No | Defaults to filename without `.md`. Display name in listings. |
| `description` | Recommended | ~60 chars max for clean `/help` display. Starts with verb. |
| `argument-hint` | No | Autocomplete hint: `[arg1] [arg2]` |
| `allowed-tools` | No | Space/comma-separated string or YAML list. Opt-in tool whitelist. |
| `model` | No | `sonnet`, `opus`, `haiku`, or `inherit` (default). |
| `disable-model-invocation` | No | Prevents model from auto-invoking the command. |

**Body**: Markdown prompt content. Supports `$1`/`$N` positional argument substitution (Claude Code native, 0-indexed). Command files have **no directory** — single `.md` file only.

### Claude Code Sub-agents (`.claude/agents/<name>.md`)

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Unique identifier, lowercase + hyphens. |
| `description` | Yes | When Claude should delegate to this subagent. |
| `tools` | No | Tool whitelist. Inherits all if omitted. |
| `disallowedTools` | No | Tools to deny. |
| `model` | No | `sonnet`, `opus`, `haiku`, `fable`, full model ID, or `inherit`. |
| `permissionMode` | No | Permission profile for the subagent. |
| `maxTurns` | No | Maximum agentic turns before stop. |
| `skills` | No | Skills to preload into subagent context. |
| `mcpServers` | No | MCP servers available to this subagent. |
| `hooks` | No | Lifecycle hooks. |
| `memory` | No | `user`, `project`, or `local` for cross-session memory. |
| `isolation` | No | `worktree` for isolated git worktree copy. |
| `color` | No | Display color: `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`. |
| `effort` | No | `low`, `medium`, `high`, `xhigh`, `max`. |
| `background` | No | `true` to always run as background task. |
| `initialPrompt` | No | Auto-submitted as first user turn. |

**Body**: System prompt for the subagent. Each subagent runs in its own context window.

File location determines scope: `~/.claude/agents/` (user-wide), `.claude/agents/` (project), plugin `agents/`, or `--agents` JSON flag.

### Agent Skills Format (`.agent/skills/<name>/SKILL.md`)

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Lowercase letters, numbers, hyphens. 64 chars max. Must match directory name. |
| `description` | Yes | What skill does and when to use it. 1024 chars max. |
| `license` | No | License name or file reference. |
| `compatibility` | No | Environment requirements. 500 chars max. |
| `metadata` | No | Arbitrary key-value map. |
| `allowed-tools` | No | Space-separated pre-approved tools. Experimental. |

**Body**: Markdown instructions for the agent. No directory name restriction on the skill.

**Directory structure**:
```
skill-name/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
```

**Progressive disclosure**: (1) name+description loaded at startup, (2) full body when activated, (3) scripts/references loaded on demand.

**Key difference from Claude Code**: No subagent/agent frontmatter standard — `.agent/skills/` is the only defined format. No `arguments`, `when_to_use`, `disallowed-tools`, or model selection in the spec.

### Claude Code Skills (`.claude/skills/<name>/SKILL.md`)

Built on the Agent Skills open standard, with Claude Code extensions:

| Extra Field | Description |
|-------------|-------------|
| `when_to_use` | Additional context for when Claude invokes. |
| `argument-hint` | Autocomplete hint. |
| `arguments` | Named positional args for `$name` substitution. |
| `disable-model-invocation` | Prevents automatic loading. |
| `user-invocable` | `false` hides from `/` menu. |
| `disallowed-tools` | Tools removed while skill is active. |
| `effort` | Effort level override. |
| `context` | `fork` to run in subagent. |
| `agent` | Subagent type when `context: fork`. |
| `hooks` | Skill lifecycle hooks. |
| `paths` | Glob patterns limiting auto-activation. |
| `shell` | `bash` or `powershell`. |

**String substitutions** available in body: `$ARGUMENTS`, `$N`, `$name`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}`.

Note: As of Claude Code v2.x, `.claude/commands/` files are treated as skills — they create `/name` the same way.

### OMP Format (existing)

| Field | Required | Notes |
|-------|----------|-------|
| `name` | No | Command display name. |
| `description` | Recommended | One-line description. |
| `argument-hint` | No | Autocomplete hint. |

OMP-specific fields (agents): `modelRoles`, `thinkingLevel`. Body is the command/skill prompt. No `allowed-tools`, `model` model selection, or `arguments` support in standard YAML.

### Platform-Specific Agent Format Differences

| Aspect | OMP | Claude Code | .agent/ |
|--------|-----|-------------|---------|
| **Agent files** | `.omp/agents/bp-<role>.md` | `.claude/agents/<name>.md` | No standard agent format |
| **Agent frontmatter** | name, description, model, thinkingLevel, tools | name, description, tools, model, disallowedTools, permissionMode, isolation, etc. | N/A |
| **Model selection** | model role (slow/default/smol) | model ID or alias (sonnet/opus/haiku) | N/A |
| **Command files** | `.omp/commands/bp-<step>.md` | `.claude/commands/<name>.md` (deprecated in favor of skills) | N/A |
| **Skill files** | `.omp/skills/bp-<step>/SKILL.md` | `.claude/skills/<name>/SKILL.md` | `.agent/skills/<name>/SKILL.md` |
| **Skill frontmatter** | name, description, hide | Agent Skills standard + Claude Code extensions | name, description, license, compatibility, metadata |
| **Parameter style** | `$1`/`$ARGUMENTS` | `$N`, `$name`, `$ARGUMENTS` | None defined (use `[BP:xxx]` for blueprint) |
| **Template source** | TypeScript modules (WORKFLOW_REGISTRY) | N/A (written externally) | N/A (written externally) |

## Abstraction Pattern

### Current Architecture

```
src/generators/index.ts         ← dispatch to platforms
  generateAll() → GeneratedFile[]

src/integrations/omp/           ← OMP platform
  index.ts                      ← exports supportsCommands, generators
  commands.ts                   ← STEP_DEFS[][] + generateSlashCommand()
  agents.ts                     ← AGENT_DEFS[] + generateAgent()
  skills.ts                     ← SKILL_DEFS[] + generateSkill()

src/templates/workflows/        ← shared content source
  registry.ts                   ← WORKFLOG_REGISTRY mapping step → {skill, command}
  init.ts, plan.ts, ...         ← TypeScript template modules
```

### Proposed Architecture for Multi-Platform

```typescript
// src/generators/index.ts — dispatch to all selected platforms
export function generateAll(config: ProjectConfig): GeneratedFile[] {
  const platforms = config.platform; // ['omp', 'claude-code', 'agent']
  const files: GeneratedFile[] = [];
  for (const platform of platforms) {
    const generator = PLATFORM_REGISTRY[platform];
    if (generator) {
      files.push(...generator.generateAll(config));
    }
  }
  return files;
}
```

### Pattern: Template Output Type

Each template module should declare which output forms it supports, so platform renderers know what to produce:

```typescript
// Current: single instructions string shared by skill and command
export const TEMPLATE = {
  instructions: `## Input\n...\n## Steps\n...`,
};

// Proposed: declare output types
export const TEMPLATE = {
  instructions: `...`,
  // Platform-specific parameter declarations
  params: {
    // Which [BP:xxx] keys this step uses
    usesChangeName: true,
    usesMilestoneId: true,
    // etc.
  },
};
```

### Pattern: Platform Generator Interface

Each platform's `index.ts` exports:

```typescript
export interface PlatformGenerator {
  name: string;                 // 'omp' | 'claude-code' | 'agent'
  supportsCommands: boolean;    // false for .agent/ (only skills)
  generateCommands?(config: ProjectConfig): GeneratedFile[];
  generateAgents?(config: ProjectConfig): GeneratedFile[];
  generateSkills?(config: ProjectConfig): GeneratedFile[];
  generateAll(config: ProjectConfig): GeneratedFile[]; // default: union of above
}
```

This mirrors the OMP `index.ts` interface while allowing platforms to opt out of certain output types (e.g., `.agent/` has no agent/command files, only skills).

### Pattern: Parameter Substitution Architecture

Current `expandTemplateVars()` already handles both `$1` and `[BP:xxx]`:

```typescript
const vars: Record<string, string> = {
  '[BP:MILESTONE_ID]': milestone,
  '[BP:PHASE_ID]': phase,
  '[BP:CHANGE_NAME]': changeName,
  '$1': primaryId,
  '$ARGUMENTS': primaryId,
  // ...
};
```

For the `.agent/` platform, templates use only `[BP:xxx]` syntax. The substitution table already exists — the only change is that `.agent/` skills reference `[BP:xxx]` in their body while Claude Code commands reference `$1`. Both are resolved by the same `expandTemplateVars()` call at `bp continue` output time.

The template registry could provide a `params` hint declaring which `[BP:xxx]` keys each step consumes, making it explicit in the template metadata:

```typescript
export const BP_PARAM_MAP = {
  plan: { uses: ['[BP:MILESTONE_ID]', '[BP:CHANGE_NAME]'] },
  apply: { uses: ['[BP:CHANGE_NAME]', '[BP:CHANGE_DIR]'] },
  research: { uses: [] }, // no context needed
} as const;
```

This is optional — `expandTemplateVars()` already handles unknown keys as no-ops — but enables future validation.

## Template Parameter Format: `[BP:xxx]` vs `$1/$ARGUMENTS`

### Current State

- **OMP templates**: use `$1` for the primary argument (change/phase/milestone name). `expandTemplateVars()` maps `$1` based on active context type.
- **`expandTemplateVars()`** (in `src/core/continue.ts`): resolves both `$1`/`$ARGUMENTS` and `[BP:xxx]` keys from state.

### For `.agent/` Skills

The `.agent/` format has no standard argument placeholder. `[BP:xxx]` is a custom parameter convention that:
1. Avoids confusion with Claude Code's `$1` (which is 0-indexed) and shell `$1` (1-indexed)
2. Is self-documenting — `[BP:MILESTONE_ID]` is clearer than `$1`
3. Is already supported by `expandTemplateVars()`
4. Works as a simple `replaceAll()` — no regex, no special parsing

### For Claude Code Commands

Claude Code supports `$1`, `$ARGUMENTS`, and `$name` substitutions natively in command bodies. The blueprint generator should use `$1` in Claude Code command templates (matching Claude Code convention) rather than `[BP:xxx]`.

### Implementation Strategy

The template modules provide raw `instructions` text. Each platform renderer applies substitutions:

```typescript
// Template source (shared)
const instructions = `Apply change [BP:CHANGE_NAME] in directory [BP:CHANGE_DIR]`;

// Claude Code renderer: keeps $1 from template, replaces [BP:xxx] with $1
function renderForClaudeCode(template: string): string {
  return template
    .replaceAll('[BP:CHANGE_NAME]', '$1')
    .replaceAll('[BP:CHANGE_DIR]', '$ARGUMENTS')
    .replaceAll('[BP:MILESTONE_ID]', '$2');
}

// .agent/ renderer: keeps [BP:xxx] as-is (handled at continue-time by expandTemplateVars)
function renderForAgent(template: string): string {
  return template; // [BP:xxx] left as-is
}
```

Alternatively, the template source uses `[BP:xxx]` throughout, and each platform renderer maps to its native syntax. This is cleaner because:
- Template source has a single parameter convention (no `$1` confusion)
- Each platform renderer is a thin mapping layer
- Future platforms (Cursor, Codex CLI) just add a new renderer

## Final Selection

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **Platform abstraction** | Provider interface per `src/integrations/<platform>/` | — | Matches existing OMP pattern; each platform exports `generateCommands()`, `generateAgents()`, `generateSkills()` |
| **Template source** | TypeScript modules with `[BP:xxx]` parameters | — | Already used by existing templates; `expandTemplateVars()` handles substitution |
| **Platform registry** | Central `PLATFORM_REGISTRY` map | — | Replaces hardcoded `omp` imports in `src/generators/index.ts`; iterates `config.platform` array |
| **Parameter convention in source** | `[BP:xxx]` for all templates | — | Single convention; each platform render maps to its native format |
| **Claude Code render** | `src/integrations/claude-code/` | — | Commands → `.claude/commands/bp-<step>.md`; agents → `.claude/agents/bp-<role>.md`; no skills (commands sufficient) |
| **`.agent/` render** | `src/integrations/agent/` | — | Skills → `.agent/skills/bp-<step>/SKILL.md`; agents → `.agent/agents/bp-<role>.md`; no commands |
| **`[BP:xxx]` → native mapping** | Render-time string replace | — | `[BP:CHANGE_NAME]` → Claude Code: `$1`; `.agent/`: kept as `[BP:CHANGE_NAME]` |
| **`expandTemplateVars()`** | Keep existing, add more `[BP:xxx]` keys as needed | — | Already resolves `[BP:MILESTONE_ID]`, `[BP:CHANGE_NAME]`, `[BP:CHANGE_DIR]`, `[BP:PHASE_ID]`, `[BP:AUTO_FLAG]` |
| **Platform iteration** | `for...of config.platform` | — | Simple, supports single and multi-platform; guaranteed order for deterministic output |

## Implementation Plan

### Phase 1: Extract Platform Interface
1. Define `PlatformGenerator` interface in `src/integrations/types.ts`
2. Register OMP as first platform: `PLATFORM_REGISTRY.omp = ompGenerator`
3. Update `src/generators/index.ts` to iterate `config.platform` over `PLATFORM_REGISTRY`

### Phase 2: Claude Code Platform
1. Create `src/integrations/claude-code/`
2. `commands.ts`: generate `.claude/commands/bp-<step>.md` with Claude Code frontmatter (`name`, `description`, `argument-hint`, `allowed-tools`, `model`)
3. `agents.ts`: generate `.claude/agents/bp-<role>.md` with generic frontmatter (no `modelRoles`, `thinkingLevel`, `spawns`)
4. Map `[BP:xxx]` → `$1`/`$ARGUMENTS` for Claude Code native substitution
5. No skills: Claude Code treats commands as skills since v2.x

### Phase 3: `.agent/` Platform
1. Create `src/integrations/agent/`
2. `skills.ts`: generate `.agent/skills/bp-<step>/SKILL.md` with Agent Skills standard frontmatter (`name`, `description` only)
3. `agents.ts`: generate `.agent/agents/bp-<role>.md` with generic frontmatter (`name`, `description`, `tools` as simple YAML array)
4. No commands: `.agent/` has no command format
5. Keep `[BP:xxx]` in template bodies; `expandTemplateVars()` resolves at continue-time

### Phase 4: Template Metadata
1. Optionally add `params` metadata to template modules
2. Validate that each platform renderer can satisfy the declared parameter needs

## Risks

- **Claude Code skills merged with commands**: Claude Code v2.x treats `.claude/commands/` files as skills. Generating commands-only (no SKILL.md) is valid but some advanced features (supporting files, `context: fork`, `agent:` field) require a skills directory structure. Mitigation: monitor Claude Code docs for deprecation of `.claude/commands/`; if deprecated, migrate to `.claude/skills/` format.
- **`.agent/agents/` no standard**: There is no open standard for `.agent/agents/` format — only `.agent/skills/` is specified. The proposed `.agent/agents/` format is a blueprint convention, which other products (Cursor, Codex CLI) may not support. Mitigation: keep `.agent/agents/` as a blueprint-specific extension; if no ecosystem adoption, it adds minimal cost since the rendering logic is shared with Claude Code agents.
- **Parameter substitution timing**: `[BP:xxx]` keys in `.agent/` skills need `expandTemplateVars()` at `bp continue` time. If skills are loaded directly by an agent (not through `bp continue`), parameters won't be substituted. Mitigation: ensure the workflow always routes through `bp continue` for parametrized steps, or embed parameter-free instructions in skill bodies and add a brief substitution note.
