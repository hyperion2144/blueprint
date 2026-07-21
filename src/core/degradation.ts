/**
 * v2.1 P2: degradation tracking for model dynamic downgrade.
 * Records downgrade events and prevents repeated downgrades that fail.
 */
import { join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const DEGRADATION_LOG = 'degradation-log.json';

export interface DegradationRecord {
  role: string;
  from_level: string;
  to_level: string;
  failed: boolean;  // discovered BLOCKER after downgrade
  timestamp: string;
}

/** Record a degradation event for a change */
export function recordDegradation(bpDir: string, changeName: string, record: DegradationRecord): void {
  const dir = join(bpDir, 'changes', changeName, '.meta');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const logPath = join(dir, DEGRADATION_LOG);
  let log: DegradationRecord[] = [];
  if (existsSync(logPath)) log = JSON.parse(readFileSync(logPath, 'utf-8'));
  log.push(record);
  writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf-8');
}

/** Check if a role has failed too many times after downgrade to trust degradation again */
export function shouldDisableDegradation(bpDir: string, changeName: string, role: string): boolean {
  const dir = join(bpDir, 'changes', changeName, '.meta');
  const logPath = join(dir, DEGRADATION_LOG);
  if (!existsSync(logPath)) return false;
  const log: DegradationRecord[] = JSON.parse(readFileSync(logPath, 'utf-8'));
  const failures = log.filter((r) => r.role === role && r.failed).length;
  return failures >= 2;
}
