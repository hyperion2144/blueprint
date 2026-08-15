/**
 *: degradation tracking for model dynamic downgrade.
 * Records downgrade events and prevents repeated downgrades that fail.
 */
import { join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
// Default-import form of zod — see src/core/config.ts for why.
import z from 'zod';

const DEGRADATION_LOG = 'degradation-log.json';

export interface DegradationRecord {
  role: string;
  from_level: string;
  to_level: string;
  failed: boolean;  // discovered BLOCKER after downgrade
  timestamp: string;
}

/** Zod schema for persisted degradation records — protects against
 *  hand-edited or truncated JSON crashing the command. */
const DegradationRecordSchema = z.object({
  role: z.string(),
  from_level: z.string(),
  to_level: z.string(),
  failed: z.boolean(),
  timestamp: z.string(),
});

const DegradationLogSchema = z.array(DegradationRecordSchema);

/** Parse and validate a degradation log; returns [] on any parse/validation
 *  failure so a corrupted log never blocks the workflow. */
function readDegradationLog(logPath: string): DegradationRecord[] {
  if (!existsSync(logPath)) return [];
  try {
    const raw = JSON.parse(readFileSync(logPath, 'utf-8'));
    const parsed = DegradationLogSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn(`\u26a0 degradation log at ${logPath} is malformed, ignoring: ${parsed.error.message}`);
      return [];
    }
    return parsed.data;
  } catch (e) {
    console.warn(`\u26a0 degradation log at ${logPath} unreadable: ${(e as Error).message}`);
    return [];
  }
}

/** Record a degradation event for a change */
export function recordDegradation(bpDir: string, changeName: string, record: DegradationRecord): void {
  const dir = join(bpDir, 'changes', changeName, '.meta');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const logPath = join(dir, DEGRADATION_LOG);
  const log = readDegradationLog(logPath);
  log.push(record);
  writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf-8');
}

/** Check if a role has failed too many times after downgrade to trust degradation again */
export function shouldDisableDegradation(bpDir: string, changeName: string, role: string): boolean {
  const dir = join(bpDir, 'changes', changeName, '.meta');
  const logPath = join(dir, DEGRADATION_LOG);
  const log = readDegradationLog(logPath);
  const failures = log.filter((r) => r.role === role && r.failed).length;
  return failures >= 2;
}
