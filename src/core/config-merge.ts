/**
 * config-merge.ts — item-by-item merge for generated JSON hook configs
 *
 * `.claude/settings.json` and `.codex/hooks.json` are shared, user-editable
 * files: they may carry permissions, env, model overrides, and the user's
 * own hooks alongside bp's entries. Regenerating them wholesale would
 * silently delete that content, so `bp update` / `bp init` merge instead:
 *
 *   - every top-level key the user owns is kept verbatim;
 *   - within `hooks`, groups whose command targets a bp handler script are
 *     replaced by the freshly generated groups; all other groups are kept;
 *   - bp groups on events the generator no longer emits are dropped, so an
 *     event rename (e.g. `SessionStop` -> `SessionEnd`) migrates cleanly.
 *
 * The caller supplies `isBpGroup`, a predicate identifying bp-owned hook
 * groups (e.g. by the handler path embedded in the command).
 */

export interface HookEntry {
  type: string;
  command: string;
  [key: string]: unknown;
}

export interface HookGroup {
  matcher?: string;
  hooks: HookEntry[];
  [key: string]: unknown;
}

export type HookGroupMatcher = (group: Record<string, unknown>) => boolean;

/** Narrowing guard: plain object, not an array, not null. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Build a group matcher from the bp handler marker embedded in commands.
 * A group is bp-owned when any of its entries is a `command` hook whose
 * command string references the marker (e.g. `bp-claude-handler.mjs`).
 */
export function isCommandHookGroup(marker: string): HookGroupMatcher {
  return (group) => {
    if (!Array.isArray(group.hooks)) return false;
    return group.hooks.some((h) => {
      if (!isRecord(h)) return false;
      if (h.type !== 'command') return false;
      if (typeof h.command !== 'string') return false;
      return h.command.includes(marker);
    });
  };
}

/** True when any hook group in `value` is bp-owned (has a bp-marked command). */
export function containsBpHookGroups(value: unknown, isBpGroup: HookGroupMatcher): boolean {
  if (!isRecord(value)) return false;
  const hooks = value.hooks;
  if (!isRecord(hooks)) return false;
  for (const groups of Object.values(hooks)) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      if (isRecord(group) && isBpGroup(group)) return true;
    }
  }
  return false;
}

/**
 * Merge a generated hooks document into an existing one, keeping user-owned
 * content. `generated` supplies the fresh bp groups per event; bp groups
 * found in `existing` are removed first (including on events `generated`
 * no longer emits). User groups and non-`hooks` top-level keys survive.
 */
export function mergeHookConfig(
  existing: unknown,
  generated: unknown,
  isBpGroup: HookGroupMatcher
): Record<string, unknown> {
  const result = isRecord(existing) ? structuredClone(existing) : {};

  const cleaned: Record<string, unknown[]> = {};
  const existingHooks = isRecord(result.hooks) ? result.hooks : undefined;

  if (existingHooks) {
    for (const [event, groups] of Object.entries(existingHooks)) {
      if (!Array.isArray(groups)) {
        // Non-array value (malformed or foreign shape): keep untouched.
        if (groups !== undefined) cleaned[event] = [groups];
        continue;
      }
      const kept = groups.filter((g) => !(isRecord(g) && isBpGroup(g)));
      if (kept.length) cleaned[event] = kept;
    }
  }

  const genHooks = isRecord(generated) ? generated.hooks : undefined;
  if (isRecord(genHooks)) {
    for (const [event, groups] of Object.entries(genHooks)) {
      if (Array.isArray(groups) && groups.length) {
        cleaned[event] = [...(cleaned[event] ?? []), ...groups];
      }
    }
  }

  if (Object.keys(cleaned).length) result.hooks = cleaned;
  else delete result.hooks;
  return result;
}

/** True for a plain object with no keys — used to decide whether a stripped config is fully removable. */
export function isEmptyJsonObject(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0;
}
