# Design: bp-auto-context-injection

## Design Items

### DS-1: spec-injector CompactContext surface

- **Refs**: PR-1
- **Key Interfaces**:
  - `generateCompactContext(bpDir, opts)` returning `CompactContext`
  - `formatContextCompact(result)` → `<bp-context>...</bp-context>` markdown string
  - `formatContextCompactJson(result)` → `JSON.stringify` of the same object
  - Types `CompactSpecRef`, `CompactConventionRef`, `ActiveChangeRef`, `CompactRuleRef` in `src/types/spec-injector.ts`

### DS-2: bp context CLI surface

- **Refs**: PR-2
- **Key Interfaces**:
  - `bp context <step> [--format=full|compact|json] [--change <name>]`
  - Default format remains `full` for back-compat
  - Exit non-zero on unresolved `--change`, missing config

### Core Data Structures

```typescript
// src/types/spec-injector.ts (NEW)
export interface CompactSpecRef {
  path: string;
  title: string;
  lineCount: number;
}

export interface CompactConventionRef {
  path: string;
  title: string;
  lineCount: number;
}

export interface ActiveChangeRef {
  name: string;
  status: 'proposed' | 'in_progress' | 'reviewed' | 'archived';
  proposalPath: string;
  designPath: string | null;
  tasksPath: string | null;
  specsPath: string | null;
  contextJsonlPath: string | null;
}

export interface CompactRuleRef {
  artifact: string;
  text: string;
}

export interface CompactContext {
  specs: CompactSpecRef[];
  conventions: CompactConventionRef[];
  activeChange: ActiveChangeRef | null;
  rules: CompactRuleRef[];
  generatedAt: string;
}
```

### Architecture Decisions

- D-1: Compact (paths-only) context over full-file injection for session_start
- D-2: context.jsonl stored per change, archived with the change
- D-3: Sub-agent type detection via OMP runtime template-name query
- D-4: OMP Extension API over legacy hook API
- D-5: Bundled runtime payload, dev-only @oh-my-pi/pi-coding-agent dep
- D-6: Inline HOOK_TEMPLATE constant removed; generator is single source of truth
- D-7: Legacy .omp/hooks/pre/bp.ts retained as 5-line shim
- D-8: Post-compaction recovery via reverse-scan of recent messages
- D-9: BP_HOOKS=0 and BP_DISABLE_HOOKS=1 short-circuit all handlers
- D-10: Refresh stale blueprint update SHALs to bp update vocabulary
