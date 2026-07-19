/**
 * spec-injector — context command core.
 * Given a bpDir, step, and optional changeName, collects relevant
 * specs, conventions, and change artifacts. No state.md dependency.
 */

import { join } from 'node:path';
import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { loadConfig } from './config.js';
import type { CompactSpecRef, CompactConventionRef, ActiveChangeRef, CompactContext } from '../types/spec-injector.js';

export interface FileRef {
  path: string;
  description?: string;
  /** File content — included for specs and conventions to save agent read calls */
  content?: string;
  ranges?: { start: number; end: number; description?: string }[];
}

export interface ContextResult {
  step: string;
  scope: { type: string; ref: string | null };
  specs: FileRef[];
  globalSpecs: FileRef[];
  conventions: FileRef[];
  changeArtifacts: FileRef[];
  rules: FileRef[];
}

/** Generate context output */
export function generateContext(bpDir: string, step: string, changeName?: string): ContextResult {
  const result: ContextResult = {
    step,
    scope: { type: 'bp', ref: changeName ?? null },
    specs: [],
    globalSpecs: [],
    conventions: [],
    changeArtifacts: [],
    rules: [],
  };

  result.conventions = getAllConventions(bpDir).map(withContent(bpDir));
  result.globalSpecs = getAllSpecs(bpDir).map(withContent(bpDir));

  if (changeName) {
    result.specs = getChangeArtifacts(bpDir, changeName)
      .filter((a) => a.path.startsWith('specs/'))
      .map(withContent(bpDir));
    result.changeArtifacts = getChangeArtifacts(bpDir, changeName)
      .filter((a) => !a.path.startsWith('specs/'))
      .map(withContent(bpDir));
  } else {
    result.specs = result.globalSpecs;
  }

  try {
    const config = loadConfig(bpDir);
    if (config.rules && Object.keys(config.rules).length > 0) {
      result.rules = Object.entries(config.rules).map(([artifact, ruleList]) => ({
        path: `rules:${artifact}`,
        description: `Rules for ${artifact} artifact`,
        content: ruleList.join('\n'),
      }));
    }
  } catch {
    // config not available - skip rules silently
  }

  return result;
}

function readContent(absPath: string): string | undefined {
  try {
    const content = readFileSync(absPath, 'utf-8');
    return content.length > 8192 ? content.slice(0, 8192) + '\n... [truncated]' : content;
  } catch {
    return undefined;
  }
}

function withContent(bpDir: string): (ref: FileRef) => FileRef {
  return (ref: FileRef) => ({
    ...ref,
    content: readContent(join(bpDir, ref.path)),
  });
}

function getAllSpecs(bpDir: string): FileRef[] {
  const specsDir = join(bpDir, 'specs');
  return listSpecFiles(specsDir, 'specs');
}

function getAllConventions(bpDir: string): FileRef[] {
  const convDir = join(bpDir, 'conventions');
  if (!existsSync(convDir)) return [];
  return readdirSync(convDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ path: `conventions/${f}`, description: 'Project Conventions' }));
}

function getChangeArtifacts(bpDir: string, changeName: string): FileRef[] {
  const changeDir = join(bpDir, 'changes', changeName);
  if (!existsSync(changeDir)) return [];

  const artifacts: FileRef[] = [];
  for (const file of ['proposal.md', 'design.md', 'tasks.md', '.bp.yaml']) {
    const fullPath = join(changeDir, file);
    if (existsSync(fullPath)) {
      artifacts.push({ path: `changes/${changeName}/${file}`, description: 'change artifact' });
    }
  }

  const specsDir = join(changeDir, 'specs');
  if (existsSync(specsDir)) {
    const deltaSpecs = listSpecFiles(specsDir, `changes/${changeName}/specs`);
    artifacts.push(...deltaSpecs);
  }

  return artifacts;
}

function listSpecFiles(dir: string, prefix: string): FileRef[] {
  if (!existsSync(dir)) return [];
  const results: FileRef[] = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...listSpecFiles(fullPath, `${prefix}/${entry}`));
    } else if (entry.endsWith('.md')) {
      results.push({ path: `${prefix}/${entry}`, description: 'Behavioral Contract' });
    }
  }

  return results;
}

/** Format as terminal output */
export function formatContextTerminal(result: ContextResult): string {
  const lines: string[] = [
    `=== bp context for step: ${result.step} ===`,
    `Scope: ${result.scope.type}${result.scope.ref ? ` (${result.scope.ref})` : ''}`,
    '\u2500'.repeat(60),
  ];

  if (result.specs.length > 0) {
    lines.push('Related specs:');
    for (const spec of result.specs) {
      lines.push(`  ${spec.path.padEnd(40)} # ${spec.description ?? ''}`);
    }
    lines.push('');
  }

  if (result.rules.length > 0) {
    lines.push('Config rules:');
    for (const rule of result.rules) {
      lines.push(`  ${rule.path.padEnd(40)} # ${rule.description ?? ''}`);
    }
    lines.push('');
  }

  if (result.conventions.length > 0) {
    lines.push('Related conventions:');
    for (const conv of result.conventions) {
      lines.push(`  ${conv.path.padEnd(40)} # ${conv.description ?? ''}`);
    }
    lines.push('');
  }

  if (result.changeArtifacts.length > 0) {
    lines.push('Current change artifacts:');
    for (const art of result.changeArtifacts) {
      lines.push(`  ${art.path}`);
    }
    lines.push('');
  }

  lines.push('\u2500'.repeat(60));
  lines.push('Usage: use `read <path>` to load each file.');
  lines.push('Selectors: `read <path>:50-100` for ranges.');

  return lines.join('\n');
}

// ── Compact Context (DS-1) ──────────────────────────────────────

function extractTitle(absPath: string): string {
  try {
    const content = readFileSync(absPath, 'utf-8');
    const firstLine = content.split('\n')[0]?.trim();
    if (firstLine) {
      const h1 = firstLine.match(/^# (.+)/);
      if (h1) return h1[1].trim();
      const h2 = firstLine.match(/^## (.+)/);
      if (h2) return h2[1].trim();
    }
  } catch {
    // fall through to file stem
  }
  return absPath.replace(/\.md$/, '').split('/').pop() ?? 'unknown';
}

function readChangeStatus(changeDir: string): string {
  for (const file of ['tasks.md', 'proposal.md']) {
    const fp = join(changeDir, file);
    if (!existsSync(fp)) continue;
    try {
      const content = readFileSync(fp, 'utf-8');
      const m = content.match(/^status:\s*(.+)/m);
      if (m) return m[1].trim();
    } catch {
      // try next file
    }
  }
  return 'in_progress';
}

/** Read change status from tasks.md or proposal.md content */
function readChangeStatus(changeDir: string): string {
  for (const file of ['tasks.md', 'proposal.md']) {
    const fp = join(changeDir, file);
    if (!existsSync(fp)) continue;
    try {
      const content = readFileSync(fp, 'utf-8');
      const m = content.match(/^status:\s*(.+)/m);
      if (m) return m[1].trim();
    } catch {
      // try next file
    }
  }
  return 'in_progress';
}

/** Determine active change: most-recently-modified non-archived change, or null */
function resolveActiveChange(bpDir: string): ActiveChangeRef | null {
  const changesDir = join(bpDir, 'changes');
  if (!existsSync(changesDir)) return null;

  const entries = readdirSync(changesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'archive');

  if (entries.length === 0) return null;

  let best: { name: string; dir: string; mtime: Date } | null = null;

  for (const entry of entries) {
    const changeDir = join(changesDir, entry.name);
    const status = readChangeStatus(changeDir);
    if (status === 'archived') continue;

    let mtime: Date | null = null;
    for (const f of ['tasks.md', 'proposal.md', 'design.md']) {
      const fp = join(changeDir, f);
      if (existsSync(fp)) {
        mtime = statSync(fp).mtime;
        break;
      }
    }
    if (!mtime) {
      try { mtime = statSync(changeDir).mtime; } catch { continue; }
    }
    if (!best || mtime > best.mtime) {
      best = { name: entry.name, dir: changeDir, mtime };
    }
  }

  if (!best) return null;

  const changeDir = best.dir;
  const name = best.name;
  const status = readChangeStatus(changeDir);

  return {
    name,
    status: status as ActiveChangeRef['status'],
    proposalPath: existsSync(join(changeDir, 'proposal.md')) ? `changes/${name}/proposal.md` : undefined,
    designPath: existsSync(join(changeDir, 'design.md')) ? `changes/${name}/design.md` : null,
    tasksPath: existsSync(join(changeDir, 'tasks.md')) ? `changes/${name}/tasks.md` : null,
    specsPath: existsSync(join(changeDir, 'specs')) ? `changes/${name}/specs` : null,
    contextJsonlPath: existsSync(join(changeDir, 'context.jsonl')) ? `changes/${name}/context.jsonl` : null,
  };
}

function lineCountOf(absPath: string): number {
  try {
    const content = readFileSync(absPath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

/** Generate compact paths-only context map for OMP session injection */
export function generateCompactContext(
  bpDir: string,
  _opts?: { step?: string },
): CompactContext {
  const specs: CompactSpecRef[] = getAllSpecs(bpDir).map((ref) => {
    const absPath = join(bpDir, ref.path);
    return { path: ref.path, title: extractTitle(absPath), lineCount: lineCountOf(absPath) };
  });

  const conventions: CompactConventionRef[] = getAllConventions(bpDir).map((ref) => {
    const absPath = join(bpDir, ref.path);
    return { path: ref.path, title: extractTitle(absPath), lineCount: lineCountOf(absPath) };
  });

  const activeChange = resolveActiveChange(bpDir);

  const rules: CompactContext['rules'] = [];
  try {
    const config = loadConfig(bpDir);
    for (const [artifact, ruleList] of Object.entries(config.rules ?? {})) {
      for (const text of ruleList) {
        rules.push({ artifact, text });
      }
    }
  } catch {
    // config not available — skip rules silently
  }

  return { specs, conventions, activeChange, rules, generatedAt: new Date().toISOString() };
}

/** Serialise CompactContext as JSON string */
export function formatContextCompactJson(result: CompactContext): string {
  return JSON.stringify(result, null, 2);
}

/** Format CompactContext as <bp-context> markdown block */
export function formatContextCompact(result: CompactContext): string {
  const lines: string[] = ['<bp-context>'];

  if (result.specs.length > 0) {
    lines.push('## Specs');
    for (const spec of result.specs) {
      lines.push(`- ${spec.path}`);
    }
  }

  if (result.conventions.length > 0) {
    lines.push('## Conventions');
    for (const conv of result.conventions) {
      lines.push(`- ${conv.path}`);
    }
  }

  if (result.activeChange) {
    lines.push('## Active Change');
    lines.push(`- ${result.activeChange.name} (${result.activeChange.status})`);
  }

  if (result.rules.length > 0) {
    lines.push('## Rules');
    for (const rule of result.rules) {
      lines.push(`- artifact: ${rule.text}`);
    }
  }

  lines.push('</bp-context>');
  const output = lines.join('\n');
  const byteLen = Buffer.byteLength(output);
  if (byteLen > 4096) {
    throw new Error(`payload size exceeded: ${byteLen} bytes > 4096`);
  }
  return output;
}
