/**
 * spec-injector — context command core.
 * Given a bpDir, step, and optional changeName, collects relevant
 * specs, conventions, and change artifacts. No state.md dependency.
 */

import { join } from 'node:path';
import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { loadConfig } from './config.js';

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

  // Conventions always injected
  result.conventions = getAllConventions(bpDir).map(withContent(bpDir));

  // Global specs from bp/specs/
  result.globalSpecs = getAllSpecs(bpDir).map(withContent(bpDir));

  // If a change name is given, collect change artifacts
  if (changeName) {
    // Delta-specs from change directory (proposed changes to global specs)
    result.specs = getChangeArtifacts(bpDir, changeName)
      .filter((a) => a.path.startsWith('specs/'))
      .map(withContent(bpDir));
    result.changeArtifacts = getChangeArtifacts(bpDir, changeName)
      .filter((a) => !a.path.startsWith('specs/'))
      .map(withContent(bpDir));
  } else {
    // Without change scope, return global specs directly
    result.specs = result.globalSpecs;
  }

  // Inject rules from config
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

/** Read file content, capped at 8KB to avoid context bloat */
function readContent(absPath: string): string | undefined {
  try {
    const content = readFileSync(absPath, 'utf-8');
    return content.length > 8192 ? content.slice(0, 8192) + '\n... [truncated]' : content;
  } catch {
    return undefined;
  }
}

/** Create a withContent mapper bound to bpDir */
function withContent(bpDir: string): (ref: FileRef) => FileRef {
  return (ref: FileRef) => ({
    ...ref,
    content: readContent(join(bpDir, ref.path)),
  });
}

/** Get all specs */
function getAllSpecs(bpDir: string): FileRef[] {
  const specsDir = join(bpDir, 'specs');
  return listSpecFiles(specsDir, 'specs');
}

/** Get all conventions */
function getAllConventions(bpDir: string): FileRef[] {
  const convDir = join(bpDir, 'conventions');
  if (!existsSync(convDir)) return [];
  return readdirSync(convDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ path: `conventions/${f}`, description: 'Project Conventions' }));
}

/** Get change artifact files for a named change */
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

  // delta-specs
  const specsDir = join(changeDir, 'specs');
  if (existsSync(specsDir)) {
    const deltaSpecs = listSpecFiles(specsDir, `changes/${changeName}/specs`);
    artifacts.push(...deltaSpecs);
  }

  return artifacts;
}

/** Recursively list spec files */
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
    '─'.repeat(60),
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

  lines.push('─'.repeat(60));
  lines.push('Usage: use `read <path>` to load each file.');
  lines.push('Selectors: `read <path>:50-100` for ranges.');

  return lines.join('\n');
}
