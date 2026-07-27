import { join, dirname } from 'node:path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { z } from 'zod';

export interface RunMeta {
  role: string;          // planner | executor | reviewer
  round: number;         // 第几轮
  start_time: string;    // ISO
  end_time?: string;
  model?: string;        // 使用的模型档位
  token_estimate?: number;
  issues_found?: number;  // reviewer 专用
  blockers?: number;
  verdict?: string;
}

/** Zod schema for persisted run-meta JSON — protects against truncated or
 *  hand-edited files crashing `bp stats` / `bp state`. */
const RunMetaSchema = z.object({
  role: z.string(),
  round: z.number(),
  start_time: z.string(),
  end_time: z.string().optional(),
  model: z.string().optional(),
  token_estimate: z.number().optional(),
  issues_found: z.number().optional(),
  blockers: z.number().optional(),
  verdict: z.string().optional(),
});

export function metaDir(bpDir: string, changeName: string): string {
  return join(bpDir, 'changes', changeName, '.meta');
}

export function appendRunMeta(bpDir: string, changeName: string, meta: RunMeta): void {
  const dir = metaDir(bpDir, changeName);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const filename = `${meta.role}-run-${meta.round}.json`;
  writeFileSync(join(dir, filename), JSON.stringify(meta, null, 2), 'utf-8');
}

export function readAllMeta(bpDir: string, changeName: string): RunMeta[] {
  const dir = metaDir(bpDir, changeName);
  if (!existsSync(dir)) return [];
  const out: RunMeta[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const raw = JSON.parse(readFileSync(join(dir, f), 'utf-8'));
      const parsed = RunMetaSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn(`\u26a0 meta file ${f} is malformed, skipping: ${parsed.error.message}`);
        continue;
      }
      out.push(parsed.data as RunMeta);
    } catch (e) {
      console.warn(`\u26a0 meta file ${f} unreadable: ${(e as Error).message}`);
    }
  }
  return out.sort((a, b) => a.round - b.round);
}

export function summarizeMeta(bpDir: string, changeName: string): object {
  const runs = readAllMeta(bpDir, changeName);
  const reviews = runs.filter((r) => r.role === 'reviewer');
  const executors = runs.filter((r) => r.role === 'executor');
  return {
    change: changeName,
    total_runs: runs.length,
    review_rounds: reviews.length,
    executor_waves: executors.length,
    total_issues: reviews.reduce((sum, r) => sum + (r.issues_found ?? 0), 0),
    final_verdict: reviews[reviews.length - 1]?.verdict ?? 'unknown',
  };
}
