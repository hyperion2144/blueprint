# Phase Research: ph.1-provider-interface

> Implementation path investigation for PlatformProvider interface + PlatformRegistry, refactoring generators/index.ts to dispatch mode.

---

## Research Scope

Define `PlatformProvider` interface and `PlatformRegistry` class. Refactor `src/generators/index.ts` from hardcoded OMP dispatch to a map-based dispatch iterating `config.platform`. OMP becomes the first registered provider. Constraint: `generateAll()` public API unchanged, OMP zero behavior change.

**Files analyzed:**
- `src/generators/index.ts` — current dispatch: hardcoded imports from OMP, `supportsCommands` gate for skills
- `src/integrations/omp/index.ts` — exports `supportsCommands = true` (module-level const), re-exports generators
- `src/integrations/omp/commands.ts` — `STEP_DEFS[]`, `generateAllCommands()` sync
- `src/integrations/omp/agents.ts` — `AGENT_DEFS[]`, `generateAllAgents()` sync (resolves models from config)
- `src/integrations/omp/skills.ts` — `SKILL_DEFS[]`, `generateAllSkills()` sync
- `src/commands/bp-update.ts` — consumer of `generateAll()` + `supportsCommands` (for stale skills cleanup)
- `src/commands/bp-init.ts` — consumer of `generateAll()` only
- `src/core/config.ts` — `ProjectConfig.platform: string[]` (the iteration source)
- `src/types/config.ts` — `ProjectConfig` interface definition

**Upstream context:**
- `bp/specs/platform-gen/spec.md` — spec for multi-platform gen, OMP zero-change MUST
- `bp/research/m2-claude-code/pitfalls.md` — 7 anti-patterns including hardcoded dispatch, platform branching, golden-file drift
- `bp/research/m2-claude-code/architecture.md` — abstract class vs interface debate, registry pattern
- `bp/research/m2-claude-code/stack.md` — generic `supportsCommands` per-platform

---

## Recommended Approach

**Recommendation**: PlatformProvider interface + Map-based PlatformRegistry, with a top-level singleton registry, then refactor generators/index.ts to iterate `config.platform` via registry

**Rationale**:

1. **Interface over abstract class** (contra architecture.md): the D1 `generate()` method is the only required method. `capabilities` is an optional property. An abstract class with "shared helpers" would prematurely couple providers. Each provider (OMP, Claude Code, `.agent/`) generates fundamentally different output formats — the "shared helper" set is small (frontmatter rendering, path construction) and belongs in per-provider utility files, not a base class.

2. **Sync `generate()`**: every current generator (`generateAllCommands`, `generateAllAgents`, `generateAllSkills`) is synchronous — pure file-content generation. No IO, no network, no promises. Making the interface async would add `async/await` overhead at every callsite with zero benefit.

3. **Singleton registry via module-level initialization**: the registry is populated once at module load time by importing and registering each provider. This mirrors the current static import approach but makes dispatch data-driven. No DI container, no lazy loading — just a `Map<string, PlatformProvider>` in a `.ts` file.

4. **Two-phase refactoring** (matching the Change Split Plan):
   - **Change 1 (define-provider-interface)**: New file `src/core/platform-registry.ts`, standalone — no changes to generators or OMP. Testable in isolation.
   - **Change 2 (refactor-generator-dispatch)**: Rewrite `generators/index.ts` to use registry, update `bp-update.ts` to get capabilities from registry instead of direct import. Golden-file snapshot test validates OMP output unchanged.

---

## Alternatives Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|--------|
| **Abstract base class `PlatformGenerator`** | Can share frontmatter helpers; can enforce hook pattern via template method | Premature abstraction across radically different output formats; makes testing harder (need subclassing instead of plain objects); OMP already works fine without shared base | ❌ Reject — interface is lighter and sufficient |
| **Async `generate()`** | Future-proof for providers that might do IO | No current provider does anything async; all current generators are sync pure functions. Adding async infects every callsite for zero current benefit | ❌ Reject — sync only, add async only when a real provider needs it |
| **Three-method interface (generateCommands/generateAgents/generateSkills)** | Explicit per-type generation | `.agent/` platform has no commands — would need optional methods anyway, and the caller would need to check which method exists. `generate()` is simpler: provider decides internally | ❌ Reject — unified `generate()` per D1 |
| **Separate capabilities file per platform** | Clear separation of concerns | Over-engineered for a single boolean. The `capabilities` object on the interface is sufficient and co-located | ❌ Reject — capabilities property per D3 |
| **Inline registry in generators/index.ts** | Fewer files | Tightens coupling; makes the registry untestable in isolation; every new platform import chains through generators/index.ts | ❌ Reject — dedicated file per D2 |

---

## Recommended Implementation Path

### Step 1: `src/core/platform-registry.ts` — Interface + Registry

```typescript
// === PlatformProvider Interface ===
export interface PlatformCapabilities {
  readonly supportsCommands?: boolean;  // default: false
}

export interface PlatformProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities?: PlatformCapabilities;
  generate(config: ProjectConfig): GeneratedFile[];
}

// === PlatformRegistry ===
export class PlatformRegistry {
  private providers = new Map<string, PlatformProvider>();

  register(id: string, provider: PlatformProvider): void {
    if (this.providers.has(id)) {
      throw new Error(`Platform provider '${id}' is already registered`);
    }
    this.providers.set(id, provider);
  }

  resolve(id: string): PlatformProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Unknown platform: '${id}'. Available: ${this.list().map(p => p.id).join(', ')}`);
    }
    return provider;
  }

  list(): PlatformProvider[] {
    return [...this.providers.values()];
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  /** Generate files for all platforms listed in config. */
  generateAll(config: ProjectConfig): GeneratedFile[] {
    return config.platform.flatMap(id => this.resolve(id).generate(config));
  }
}

/** Singleton registry — populated at import time. */
let _registry: PlatformRegistry | null = null;

export function getPlatformRegistry(): PlatformRegistry {
  if (!_registry) {
    _registry = new PlatformRegistry();
    // Registration happens in providers/index.ts which imports and registers each platform
  }
  return _registry;
}

export function setPlatformRegistry(registry: PlatformRegistry): void {
  _registry = registry;
}
```

**Key design decisions:**
- `has()` method allows `bp-update.ts` to check if a platform exists without throwing
- `PlatformCapabilities` interface anticipates future flags (`supportsSkills`, `supportsAgents`, etc.)
- Singleton pattern with `getPlatformRegistry()` avoids DI, matches current module-level static approach
- `setPlatformRegistry()` is internal/test-only — allows injection of mock registry for testing without mocking module-level state

### Step 2: `src/integrations/index.ts` — Provider Registration Hub

```typescript
import { getPlatformRegistry } from '../core/platform-registry.js';
import { ompProvider } from './omp/index.js';

export function registerPlatformProviders(): void {
  const registry = getPlatformRegistry();
  registry.register(ompProvider.id, ompProvider);
}
```

This is the central registration point. New platforms (claude-code, agent) add their import + `registry.register()` call here in future phases. No changes to `generators/index.ts` needed to add platforms.

### Step 3: `src/integrations/omp/index.ts` — Expose as PlatformProvider

Add `ompProvider` to the OMP index. Keep all existing exports unchanged for backward compatibility.

```typescript
/** OMP PlatformProvider */
export const ompProvider: PlatformProvider = {
  id: 'omp',
  name: 'OMP',
  capabilities: { supportsCommands: true },
  generate(config: ProjectConfig): GeneratedFile[] {
    const files: GeneratedFile[] = [
      ...generateAllCommands(config),
      ...generateAllAgents(config),
    ];
    // Skills are NOT generated — commands cover the same content.
    // This mirrors the previous `if (!supportsCommands)` gate.
    return files;
  },
};
```

**Note:** The OMP provider's `generate()` preserves the current behavior exactly: commands + agents only, skills skipped because `supportsCommands: true`.

### Step 4: `src/generators/index.ts` — Refactor to Dispatch Mode

```typescript
import type { ProjectConfig, GeneratedFile } from '../types/index.js';
import { getPlatformRegistry } from '../core/platform-registry.js';

export type { GeneratedFile };

/** Generate files for all configured platforms. */
export function generateAll(config: ProjectConfig): GeneratedFile[] {
  return getPlatformRegistry().generateAll(config);
}
```

**Backward compatibility:**
- `generateAll(config: ProjectConfig): GeneratedFile[]` — unchanged signature
- `GeneratedFile` type — unchanged, re-exported from same location
- When `config.platform` contains `['omp']`, OMP provider runs, produces identical output
- The old `supportsCommands` import is gone from this file — replaced by the OMP provider's internal capability check

### Step 5: `src/commands/bp-update.ts` — Update Cleanup Logic

Replace the direct `supportsCommands` import with a registry capability check:

```typescript
// OLD:
import { supportsCommands } from '../integrations/omp/index.js';

// NEW: inside cleanupStaleFiles, check via registry
const registry = getPlatformRegistry();
if (registry.has('omp')) {
  const omp = registry.resolve('omp');
  const ompSupportsCommands = omp.capabilities?.supportsCommands ?? false;
  if (existsSync(skillsDir) && ompSupportsCommands) {
    rmSync(skillsDir, { recursive: true, force: true });
  }
}
```

Or, even cleaner: `cleanupStaleFiles` iterates registered platforms:

```typescript
function cleanupStaleFiles(baseDir: string, generatedPaths: string[]): void {
  const generatedSet = new Set(generatedPaths.map(p => p.replace(/^\.\//, '')));
  const registry = getPlatformRegistry();

  // For each registered platform, do platform-specific stale cleanup
  for (const provider of registry.list()) {
    if (provider.capabilities?.supportsCommands) {
      // Clean up skills dir for command-capable platforms
      const skillsDir = join(baseDir, `.${provider.id}`, 'skills');
      if (existsSync(skillsDir)) {
        rmSync(skillsDir, { recursive: true, force: true });
        console.log(`  ✓ Removed stale: .${provider.id}/skills/ (platform supports commands)`);
      }
    }
  }

  // Generic stale file cleanup
  // ... rest stays the same
}
```

This approach is future-proof: when Claude Code provider is added with `supportsCommands: true`, its stale skills cleanup is automatic.

---

## Known Pitfalls

### 1. Registry initialization timing
The registry singleton is populated when `registerPlatformProviders()` is called. If `generateAll()` is called before registration, it will throw. **Mitigation:** `registerPlatformProviders()` must be called at the top of `generators/index.ts` at module level, or in each command handler (`bp-init`, `bp-update`) before calling `generateAll()`. The safest approach: call it at module level in `generators/index.ts` (self-initialization on first import).

### 2. bp-update.ts has a second `supportsCommands` import
The file imports `supportsCommands` from `../integrations/omp/index.js` separately from `generateAll()`. This import is used in `cleanupStaleFiles()` line 76. Simply removing the import without updating the cleanup logic will break `.omp/skills/` cleanup. **Mitigation:** change `cleanupStaleFiles` to use the registry as described above — the import is replaced, not dropped.

### 3. Circular dependency risk
If `src/integrations/omp/index.ts` imports from `src/core/platform-registry.ts`, but `platform-registry.ts` or `generators/index.ts` imports back, we get a cycle. Current tree: `generators/index.ts` → `integrations/omp/index.ts`. In the new tree: `generators/index.ts` → `platform-registry.ts` (no OMP import), and `integrations/index.ts` → `platform-registry.ts` + `integrations/omp/index.ts`. The dependency graph is acyclic: `platform-registry.ts` has no imports from integrations, it's purely abstract. **Mitigation:** verify with `tsc --noEmit` after implementation.

### 4. Test isolation of singleton registry
The singleton `_registry` persists across tests. Tests that register mock providers could leak state. **Mitigation:** `setPlatformRegistry()` allows resetting between tests. Use `beforeEach(() => setPlatformRegistry(new PlatformRegistry()))` to isolate.

### 5. Platform provider naming collision
If a provider registers with id `'omp'` and another also tries `'omp'`, the second throws. **Mitigation:** the `register()` method already checks `this.providers.has(id)` and throws. CI tests would catch this immediately.

### 6. The `workspace` platform scenario
If `config.platform` lists a platform not yet registered (e.g., `['omp', 'claude-code']` during this phase), `resolve()` throws with a helpful message listing available providers. This is correct behavior — it forces the project config to match what's actually implemented. **Mitigation:** document that adding a platform to `project.yml` requires its provider to be registered. OMP-only configs (`platform: ['omp']`) continue to work without change.

---

## TDD Implications

### Change 1: define-provider-interface

**File:** `src/core/__tests__/platform-registry.test.ts`

| Test | Description | RED | GREEN | REFACTOR |
|------|-------------|-----|-------|----------|
| `T1.1` | PlatformProvider minimal shape: create a provider with id, name, generate() | Write test that calls `generate()` with `ProjectConfig` | Implement minimal `PlatformProvider` interface | Move to separate file |
| `T1.2` | default capabilities: provider without capabilities still works | Assert `provider.capabilities` is optional | No-op (TypeScript optional) | N/A |
| `T1.3` | capabilities.supportsCommands defaults to false | Assert that a provider without capabilities acts as if supportsCommands=false | Add default interpretation in code that reads capabilities | N/A (consumer-side default) |
| `T1.4` | register and resolve a provider | Register mock, resolve by id, verify identity | Implement `PlatformRegistry` | N/A |
| `T1.5` | register duplicate throws | Call register twice with same id | Add `has()` check + throw | N/A |
| `T1.6` | resolve unknown throws | Call resolve() with unregistered id | Add Map.get() + throw | N/A |
| `T1.7` | list() returns all registered | Register 2 providers, list() → array of 2 | Return [...map.values()] | N/A |
| `T1.8` | generateAll() iterates config.platform | Register mock A and B, call with platform=['A','B'], verify both called | Implement `generateAll` in registry | N/A |
| `T1.9` | generateAll() works with platform=['A'] (single) | Same with single entry | Already covered by flatMap | N/A |
| `T1.10` | has() returns correct boolean | Register 'omp', check has('omp') AND has('unknown') | Simple map.has() | N/A |
| `T1.11` | setPlatformRegistry() resets for test isolation | After setPlatformRegistry(newRegistry), old providers gone | Implement setter | N/A |

**TDD note for T1.8 generates T1.9:** The `flatMap` pattern naturally handles single entries. If implementation uses `for` loop, add explicit single-entry test.

### Change 2: refactor-generator-dispatch

**File:** `src/generators/__tests__/generate-all.test.ts` (+ a golden-file approach)

| Test | Description | RED | GREEN | REFACTOR |
|------|-------------|-----|-------|----------|
| `T2.1` | Golden-file snapshot: freeze current OMP output | Write test that calls `generateAll(ompConfig)`, saves output as `.snap` or `.golden` file | Run BEFORE refactoring code changes, capture current output | N/A |
| `T2.2` | OMP output unchanged after refactoring | Run snapshot comparison test | Implement registry dispatch; compare output to golden file | N/A |
| `T2.3` | GenerateAll signature unchanged | Call `generateAll` with ProjectConfig, expect `GeneratedFile[]` | Interface unchanged at export site | N/A |
| `T2.4` | Empty platform array → empty result | `platform: []` → 0 files | `flatMap` on empty → empty | N/A |
| `T2.5` | Unknown platform throws | `platform: ['nonexistent']` → error | Registry.resolve throws | N/A |
| `T2.6` | bp-update cleanup uses registry capabilities | Register OMP provider, call cleanupStaleFiles, verify skills dir removed | Refactor cleanupStaleFiles to use registry | N/A |
| `T2.7` | Provider generate() receives correct config | Mock provider spies on passed config | OK | N/A |
| `T2.8` | File count matches old OMP output | Count generated files, compare to known count (22 + 7 = 29 files) | N/A | N/A |

**Golden file strategy:**
Since vitest is the test runner and there's no pre-existing snapshot infrastructure, the simplest approach is a **golden-file comparison** using `toMatchSnapshot()` or a manual assert:

```typescript
// T2.1 + T2.2: Golden file snapshot
import { describe, it, expect } from 'vitest';

const OMP_CONFIG: ProjectConfig = {
  platform: ['omp'],
  // ... minimal required ProjectConfig fields
};

describe('generateAll OMP golden file', () => {
  it('produces identical output after dispatch refactoring', () => {
    const files = generateAll(OMP_CONFIG);
    // First run: vitest --update to create snapshot
    // Subsequent runs: compare against frozen snapshot
    expect(files).toMatchSnapshot();
  });
});
```

This leverages vitest's built-in snapshot system. The first run creates the golden file, subsequent runs compare against it.

**Critical TDD order:** T2.1 must be implemented and run BEFORE any refactoring code is written. This captures the baseline. Only after the golden file is committed do we refactor `generators/index.ts` and verify T2.2 passes.

---

## Testing Strategy for OMP Zero-Change Verification

### Tier 1: Golden-file snapshot (primary)
- **What:** Freeze full output of `generateAll(ompConfig)` as a vitest snapshot
- **When:** Run before refactoring (baseline) and after (verification)
- **How:** `GeneratedFile[]` is JSON-serializable — vitest `toMatchSnapshot()` captures the complete set
- **Gate:** CI must pass with `--no-change-detection` mode; if snapshot changes, someone accidentally touched OMP generator behavior

### Tier 2: Registry-level unit tests (structural)
- **What:** Unit tests for `PlatformRegistry` with mock providers
- **When:** Run as part of normal test suite
- **Gate:** Tests cover registration, resolution, iteration, error cases

### Tier 3: Integration test via bp-update
- **What:** End-to-end test that runs `bp update` and verifies `.omp/` directory structure
- **How:** Use a temp dir with a minimal `project.yml`, call `updateHandler`, assert `.omp/commands/`, `.omp/agents/` exist and `.omp/skills/` does NOT exist
- **When:** Manual regression test or CI smoke test

### Tier 4: File count verification
- **What:** Assert exact file count (22 commands + 7 agents = 29 files for OMP)
- **How:** `expect(files.length).toBe(29)`
- **When:** Part of golden-file test
- **Why:** Catches off-by-one errors where a generator silently stops producing a file

### What we do NOT need to test for OMP zero-change:
- Content of individual generated files (the generators themselves aren't changed — only the dispatch layer)
- Full `bp init`/`bp update` command integration (the command handlers delegate to `generateAll()` and `writeGeneratedFiles()` — if `generateAll()` output is identical, the command output is identical)
- Cross-platform dispatch during this phase (no second platform exists yet)

---

## File Manifest

| File | Action | Purpose |
|------|--------|---------|
| `src/core/platform-registry.ts` | **CREATE** | `PlatformProvider` interface, `PlatformCapabilities`, `PlatformRegistry` class, singleton management |
| `src/core/__tests__/platform-registry.test.ts` | **CREATE** | Unit tests for T1.1–T1.11 |
| `src/integrations/index.ts` | **CREATE** | Central registration hub — `registerPlatformProviders()` |
| `src/integrations/omp/index.ts` | **MODIFY** | Add `ompProvider` export alongside existing exports |
| `src/generators/index.ts` | **MODIFY** | Rewrite to use registry dispatch |
| `src/generators/__tests__/generate-all.test.ts` | **CREATE** | Golden-file snapshot test (T2.1–T2.8) |
| `src/commands/bp-update.ts` | **MODIFY** | Replace direct `supportsCommands` import with registry capability check |

**Files explicitly NOT touched (OMP zero-change constraint):**
- `src/integrations/omp/commands.ts`
- `src/integrations/omp/agents.ts`
- `src/integrations/omp/skills.ts`
- Any template files in `src/templates/`
