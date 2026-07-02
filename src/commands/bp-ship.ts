/**
 * bp ship — create PR or release from unpublished archived changes.
 *
 * Reads state.md archive history for unpublished changes.
 * Generates PR body from configured template (standard|detailed|minimal).
 * Asks PR vs Release; release suggests version bump.
 * Marks shipped changes as [published] in archive history.
 */

import { join } from 'node:path';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { loadState, saveState } from '../core/state-file.js';
import { loadConfig } from '../core/config.js';

/* ── Types ─────────────────────────────────────────────────── */

interface PublishedEntry {
  date: string;
  change: string;
  hash: string;
}

/** PR body template options */
const RELEASE_TEMPLATES: Record<string, { label: string; sections: string[] }> = {
  standard: {
    label: 'Standard',
    sections: ['summary', 'changes', 'verification'],
  },
  detailed: {
    label: 'Detailed',
    sections: ['summary', 'changes', 'verification', 'user_stories', 'decisions', 'risks'],
  },
  minimal: {
    label: 'Minimal',
    sections: ['summary', 'changes'],
  },
};

/* ── Register ──────────────────────────────────────────────── */

export function register(program: any): void {
  program
    .command('ship')
    .description('Ship unpublished changes — PR or Release with configurable template')
    .option('--dry-run', 'Preview without executing')
    .option('--skip-commit', 'Skip git commit (for testing)')
    .action(shipHandler);
}

/* ── Main handler ──────────────────────────────────────────── */

function shipHandler(options?: { dryRun?: boolean; skipCommit?: boolean }): void {
  const cwd = process.cwd();
  const bpDir = join(cwd, 'bp');
  const state = loadState(bpDir);
  const config = loadConfig(bpDir);
  const template = config.release?.template ?? 'standard';
  const tpl = RELEASE_TEMPLATES[template] ?? RELEASE_TEMPLATES.standard;

  // Parse archive history for unpublished entries
  const history = parseArchiveHistory(bpDir);
  const unpublished = history.filter((e) => !e.published);

  if (unpublished.length === 0) {
    console.log(JSON.stringify({ hint: 'No unpublished changes found in archive history.' }));
    return;
  }

  // Build PR body from template
  const body = buildPrBody(unpublished, tpl.sections, bpDir);

  console.log(JSON.stringify({
    template: tpl.label,
    unpublished: unpublished.length,
    changes: unpublished.map((e) => e.change),
    body: body.slice(0, 500),
    hint: 'Use the ask tool: (1) Create PR → gh pr create, (2) Release → suggest version, create tag + GitHub Release. After publishing, mark as [published] in state.md archive history.',
  }, null, 2));
}

/* ── Archive history parsing ───────────────────────────────── */

function parseArchiveHistory(bpDir: string): Array<{
  change: string;
  milestone: string;
  phase: string;
  date: string;
  published: boolean;
}> {
  const statePath = join(bpDir, 'state.md');
  if (!existsSync(statePath)) return [];

  try {
    const content = readFileSync(statePath, 'utf-8');
    const historySection = content.match(/## History\n([\s\S]*?)(?=\n##|$)/);
    if (!historySection) return [];

    const entries: Array<{ change: string; milestone: string; phase: string; date: string; published: boolean }> = [];
    const lines = historySection[1].split('\n');

    for (const line of lines) {
      // Format: - [2026-07-01] Archived ch-name (milestone / phase) [published]
      const match = line.match(/-\s*\[([^\]]+)\]\s*Archived\s+([^\s(]+)\s*\(([^)]+)\)\s*(?:\[published\])?/);
      if (match) {
        const changeName = match[2].replace(/`/g, '');
        entries.push({
          date: match[1],
          change: changeName,
          milestone: match[3].split('/')[0]?.trim() ?? '',
          phase: match[3].split('/')[1]?.trim() ?? '',
          published: line.includes('[published]'),
        });
      }
    }
    return entries;
  } catch {
    return [];
  }
}

/* ── PR body generation ────────────────────────────────────── */

function buildPrBody(
  entries: Array<{ change: string; milestone: string; phase: string }>,
  sections: string[],
  bpDir: string,
): string {
  const lines: string[] = [];

  for (const section of sections) {
    switch (section) {
      case 'summary':
        lines.push('## Summary', '');
        for (const e of entries) {
          const summary = readChangeSummary(bpDir, e.milestone, e.phase, e.change);
          lines.push(`- **${e.change}** (${e.milestone}/${e.phase}): ${summary}`);
        }
        lines.push('');
        break;

      case 'changes':
        lines.push('## Changes', '');
        for (const e of entries) {
          const files = readChangeFiles(bpDir, e.milestone, e.phase, e.change);
          lines.push(`### ${e.change}`, '');
          if (files.length > 0) {
            for (const f of files) lines.push(`- \`${f}\``);
          } else {
            lines.push('_(no file list available)_');
          }
          lines.push('');
        }
        break;

      case 'verification':
        lines.push('## Verification', '');
        for (const e of entries) {
          const status = readVerificationStatus(bpDir, e.milestone, e.phase, e.change);
          lines.push(`- **${e.change}**: ${status}`);
        }
        lines.push('');
        break;

      case 'user_stories':
        lines.push('## User Stories & Acceptance Criteria', '');
        lines.push('_(Review each change for user-facing behavior)_', '');
        for (const e of entries) {
          lines.push(`### ${e.change}`, '');
          lines.push('- [ ] Verify user-facing behavior matches proposal.md intent');
          lines.push('');
        }
        break;

      case 'decisions':
        lines.push('## Key Decisions', '');
        lines.push('_(Extracted from design.md and change-summary.md)_', '');
        for (const e of entries) {
          const decisions = readKeyDecisions(bpDir, e.milestone, e.phase, e.change);
          if (decisions.length > 0) {
            lines.push(`### ${e.change}`, '');
            for (const d of decisions) lines.push(`- ${d}`);
            lines.push('');
          }
        }
        break;

      case 'risks':
        lines.push('## Risks & Dependencies', '');
        lines.push('- No known high-risk rollout dependencies.', '');
        break;
    }
  }

  return lines.join('\n');
}

/* ── Artifact readers ──────────────────────────────────────── */

function findChangeDir(bpDir: string, milestone: string, phase: string, change: string): string | null {
  const base = join(bpDir, 'archive', milestone, phase);
  if (!existsSync(base)) return null;
  try {
    const entries = readdirSync(base, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && e.name.endsWith(change)) {
        return join(base, e.name);
      }
    }
  } catch { /* not found */ }
  return null;
}

function readChangeSummary(bpDir: string, milestone: string, phase: string, change: string): string {
  const dir = findChangeDir(bpDir, milestone, phase, change);
  const path = dir ? join(dir, 'change-summary.md') : '';
  if (!path || !existsSync(path)) return '(summary unavailable)';
  try {
    const content = readFileSync(path, 'utf-8');
    const intent = content.match(/## Intent\n+([^\n#]+)/);
    return intent ? intent[1].trim().slice(0, 120) : 'see change-summary.md';
  } catch {
    return '(summary unavailable)';
  }
}

function readChangeFiles(bpDir: string, milestone: string, phase: string, change: string): string[] {
  const dir = findChangeDir(bpDir, milestone, phase, change);
  const path = dir ? join(dir, 'change-summary.md') : '';
  if (!path || !existsSync(path)) return [];
  try {
    const content = readFileSync(path, 'utf-8');
    const files: string[] = [];
    const fileMatches = content.matchAll(/^\|\s*`([^`]+)`\s*\|/gm);
    for (const m of fileMatches) files.push(m[1]);
    return files;
  } catch {
    return [];
  }
}

function readVerificationStatus(bpDir: string, milestone: string, phase: string, change: string): string {
  const dir = findChangeDir(bpDir, milestone, phase, change);
  const path = dir ? join(dir, 'verification.md') : '';
  if (!path || !existsSync(path)) return '❓ No verification.md';
  try {
    const content = readFileSync(path, 'utf-8');
    return /status:\s*passed/i.test(content) ? '✅ Passed' : '⚠️ See verification.md';
  } catch {
    return '❓ No verification.md';
  }
}

function readKeyDecisions(bpDir: string, milestone: string, phase: string, change: string): string[] {
  const dir = findChangeDir(bpDir, milestone, phase, change);
  if (!dir) return [];
  const paths = [
    join(dir, 'design.md'),
    join(dir, 'change-summary.md'),
  ];
  for (const p of paths) {
    try {
      const content = readFileSync(p, 'utf-8');
      const section = content.match(/## Key Decisions\n+([\s\S]*?)(?=\n##|$)/i);
      if (section) {
        return (section[1].match(/^-\s+(.+)/gm) ?? []).map((s) => s.replace(/^-\s+/, ''));
      }
    } catch { continue; }
  }
  return [];
}
