/**
 * bp audit <scope> <id> — human UAT verification skeleton.
 *
 * Generates a uat.md skeleton with frontmatter + artifact reference list.
 * The /bp-audit agent reads the actual artifacts and writes real test cases.
 *
 * After uat.md is populated with issues, run:
 *   bp change new <fix-name> --adhoc   to create adhoc fix changes
 */

import { join, basename } from 'node:path';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { loadState } from '../core/state-file.js';

export function register(program: any): void {
  const cmd = program
    .command('audit')
    .description('Human UAT verification — generate uat.md from change deliverables');

  cmd
    .command('change <name>')
    .description('Generate uat.md for an archived change')
    .action((name: string, _opts: any) => auditHandler('change', name, {}));

  cmd
    .command('phase <id>')
    .description('Generate uat.md for all changes in a phase (searches archive + active)')
    .option('--milestone <id>', 'Milestone containing the phase (defaults to active)')
    .action((id: string, options: any) => auditHandler('phase', id, options));

  cmd
    .command('milestone <id>')
    .description('Generate uat.md for all phases in a milestone (archive only)')
    .action((id: string, options: any) => auditHandler('milestone', id, options));
}

// ── Types ────────────────────────────────────────────────────────

interface ArtifactRef {
  name: string;
  path: string;
  exists: boolean;
  size: number;
}

// ── Main handler ─────────────────────────────────────────────────

function auditHandler(scope: string, id: string, options: any = {}) {
  const cwd = process.cwd();
  const bpDir = join(cwd, 'bp');
  const state = loadState(bpDir);

  // Phase scope: use --milestone flag or active milestone
  const ms = options.milestone || state.project.current_milestone;

  switch (scope) {
    case 'change': return auditChange(bpDir, id);
    case 'phase':  return auditPhase(bpDir, id, ms);
    case 'milestone': return auditMilestone(bpDir, id);
    default:
      console.log(JSON.stringify({ error: `Unknown scope: ${scope}` }));
  }
}

// ── Change audit ─────────────────────────────────────────────────

function auditChange(bpDir: string, changeName: string) {
  const changeDir = findChangeInArchive(bpDir, changeName);
  if (!changeDir) {
    console.log(JSON.stringify({
      error: `Change '${changeName}' not found in archive.`,
      hint: 'Use bp list to see archived changes.',
    }));
    return;
  }

  const artifacts = listArtifacts(changeDir);
  const uatPath = join(changeDir, 'uat.md');

  const content = buildUatSkeleton({
    scope: 'change',
    name: changeName,
    source: basename(changeDir),
    artifacts,
  });

  writeFileSync(uatPath, content, 'utf-8');

  console.log(JSON.stringify({
    generated: uatPath,
    scope: 'change',
    name: changeName,
    artifactCount: artifacts.filter((a) => a.exists).length,
    artifacts: artifacts.filter((a) => a.exists).map((a) => a.name),
    hint: 'Agent reads artifacts and writes real UAT tests. Then: bp change new <name> --adhoc for fixes.',
  }, null, 2));
}

// ── Phase audit ──────────────────────────────────────────────────

function auditPhase(bpDir: string, phaseId: string, milestone: string | null) {
  if (!milestone) {
    console.log(JSON.stringify({ error: 'No milestone. Use --milestone <id> or activate one with bp state set-milestone.' }));
    return;
  }

  const archiveRoot = join(bpDir, 'archive', milestone, phaseId);
  let changes = findArchivedChanges(archiveRoot);

  const activeDir = join(bpDir, 'milestones', milestone, 'phases', phaseId, 'changes');
  if (existsSync(activeDir)) {
    const activeChanges = findActiveChanges(activeDir);
    for (const ac of activeChanges) {
      if (!changes.find((c) => c.name.includes(ac.name))) {
        changes.push(ac);
      }
    }
  }

  if (changes.length === 0) {
    console.log(JSON.stringify({
      error: `No changes found in ${milestone}/${phaseId}.`,
    }));
    return;
  }

  // Collect artifact references from all changes
  const allArtifacts: { change: string; artifacts: ArtifactRef[] }[] = [];
  for (const ch of changes) {
    allArtifacts.push({
      change: ch.name,
      artifacts: listArtifacts(ch.path),
    });
  }

  const phaseDir = join(bpDir, 'milestones', milestone, 'phases', phaseId);
  mkdirSync(phaseDir, { recursive: true });
  const uatPath = join(phaseDir, 'uat.md');

  const content = buildPhaseUatSkeleton({
    scope: 'phase',
    name: phaseId,
    source: changes.map((c) => c.name).join(', '),
    changeArtifacts: allArtifacts,
  });

  writeFileSync(uatPath, content, 'utf-8');

  const totalArtifacts = allArtifacts.reduce((sum, ca) => sum + ca.artifacts.filter((a) => a.exists).length, 0);
  console.log(JSON.stringify({
    generated: uatPath,
    scope: 'phase',
    name: phaseId,
    milestone,
    changeCount: changes.length,
    artifactCount: totalArtifacts,
    changes: allArtifacts.map((ca) => ({
      name: ca.change,
      artifacts: ca.artifacts.filter((a) => a.exists).map((a) => a.name),
    })),
    hint: 'Agent reads artifacts per change and writes UAT tests. Then: bp change new <name> --adhoc for fixes.',
  }, null, 2));
}

// ── Milestone audit ──────────────────────────────────────────────

function auditMilestone(bpDir: string, milestoneId: string) {
  const archiveRoot = join(bpDir, 'archive', milestoneId);
  if (!existsSync(archiveRoot)) {
    console.log(JSON.stringify({ error: `No archive found for milestone '${milestoneId}'.` }));
    return;
  }

  const phases = readdirSync(archiveRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  if (phases.length === 0) {
    console.log(JSON.stringify({ error: `No phases archived in milestone '${milestoneId}'.` }));
    return;
  }

  const phaseChanges: { phase: string; changes: { name: string; artifactCount: number }[] }[] = [];
  for (const ph of phases) {
    const changes = findArchivedChanges(join(archiveRoot, ph));
    phaseChanges.push({
      phase: ph,
      changes: changes.map((c) => {
        const arts = listArtifacts(c.path);
        return { name: c.name, artifactCount: arts.filter((a) => a.exists).length };
      }),
    });
  }

  const msDir = join(bpDir, 'milestones', milestoneId);
  mkdirSync(msDir, { recursive: true });
  const uatPath = join(msDir, 'uat.md');

  const content = buildMilestoneUatSkeleton({
    scope: 'milestone',
    name: milestoneId,
    source: phases.join(', '),
    phaseChanges,
  });

  writeFileSync(uatPath, content, 'utf-8');

  const totalChanges = phaseChanges.reduce((s, pc) => s + pc.changes.length, 0);
  console.log(JSON.stringify({
    generated: uatPath,
    scope: 'milestone',
    name: milestoneId,
    phaseCount: phases.length,
    changeCount: totalChanges,
    phases: phaseChanges.map((pc) => ({ phase: pc.phase, changes: pc.changes.map((c) => c.name) })),
    hint: 'Agent reads phase-level uat.md files and consolidates. Then: bp change new <name> --adhoc for fixes.',
  }, null, 2));
}

// ── Artifact listing ──────────────────────────────────────────────

function listArtifacts(changeDir: string): ArtifactRef[] {
  const names = [
    'proposal.md', 'design.md', 'tasks.md', 'change-summary.md',
    'spec-review.md', 'quality-review.md', 'goal-review.md', 'verification.md',
  ];
  return names.map((name) => ({
    name,
    path: join(changeDir, name),
    exists: existsSync(join(changeDir, name)),
    size: existsSync(join(changeDir, name))
      ? readFileSync(join(changeDir, name), 'utf-8').length : 0,
  }));
}

// ── Skeleton builders ────────────────────────────────────────────

function buildUatSkeleton(opts: {
  scope: string;
  name: string;
  source: string;
  artifacts: ArtifactRef[];
}): string {
  const now = new Date().toISOString();
  const existing = opts.artifacts.filter((a) => a.exists);
  const missing = opts.artifacts.filter((a) => !a.exists);

  const lines = [
    '---',
    `status: testing`,
    `scope: ${opts.scope}`,
    `name: ${opts.name}`,
    `source: ${opts.source}`,
    `started: ${now}`,
    `updated: ${now}`,
    '---',
    '',
    '## Artifacts Available',
    '',
  ];

  for (const a of existing) {
    lines.push(`- [x] ${a.name} (${a.size}B)`);
  }
  for (const a of missing) {
    lines.push(`- [ ] ${a.name} (MISSING)`);
  }

  lines.push(
    '',
    '## Current Test',
    '',
    '[Agent: read artifacts above, write meaningful UAT tests below. Each test = one user-observable behavior.]',
    '',
    '## Tests',
    '',
    '[Agent: replace this section with real tests. Format:',
    '### 1. [Test Name]',
    'expected: [what user should observe]',
    'result: pending]',
    '',
    '## Summary',
    '',
    'total: [N]',
    'passed: 0',
    'issues: 0',
    'pending: [N]',
    'skipped: 0',
    'blocked: 0',
    '',
    '## Gaps',
    '',
    '[none yet]',
    '',
  );

  return lines.join('\n');
}

function buildPhaseUatSkeleton(opts: {
  scope: string;
  name: string;
  source: string;
  changeArtifacts: { change: string; artifacts: ArtifactRef[] }[];
}): string {
  const now = new Date().toISOString();
  const lines = [
    '---',
    `status: testing`,
    `scope: ${opts.scope}`,
    `name: ${opts.name}`,
    `source: ${opts.source}`,
    `started: ${now}`,
    `updated: ${now}`,
    '---',
    '',
    `## Changes (${opts.changeArtifacts.length})`,
    '',
  ];

  for (const ca of opts.changeArtifacts) {
    lines.push(`### ${ca.change}`);
    const existing = ca.artifacts.filter((a) => a.exists);
    const missing = ca.artifacts.filter((a) => !a.exists);
    lines.push(`Available: ${existing.map((a) => a.name).join(', ') || 'none'}`);
    if (missing.length > 0) {
      lines.push(`Missing: ${missing.map((a) => a.name).join(', ')}`);
    }
    lines.push('');
  }

  lines.push(
    '## Current Test',
    '',
    '[Agent: read each change\'s artifacts, then write UAT tests grouped by change. Focus on user-observable behavior.]',
    '',
    '## Tests',
    '',
    '[Agent: write tests here. Group by change. Each test = one observable behavior.]',
    '',
    '## Summary',
    '',
    'total: [N]',
    'passed: 0',
    'issues: 0',
    'pending: [N]',
    'skipped: 0',
    'blocked: 0',
    '',
    '## Gaps',
    '',
    '[none yet]',
    '',
  );

  return lines.join('\n');
}

function buildMilestoneUatSkeleton(opts: {
  scope: string;
  name: string;
  source: string;
  phaseChanges: { phase: string; changes: { name: string; artifactCount: number }[] }[];
}): string {
  const now = new Date().toISOString();
  const lines = [
    '---',
    `status: testing`,
    `scope: ${opts.scope}`,
    `name: ${opts.name}`,
    `source: ${opts.source}`,
    `started: ${now}`,
    `updated: ${now}`,
    '---',
    '',
    `## Phases (${opts.phaseChanges.length})`,
    '',
  ];

  for (const pc of opts.phaseChanges) {
    const totalArtifacts = pc.changes.reduce((s, c) => s + c.artifactCount, 0);
    lines.push(`- **${pc.phase}**: ${pc.changes.length} changes, ${totalArtifacts} artifacts`);
    for (const ch of pc.changes) {
      lines.push(`  - ${ch.name} (${ch.artifactCount} artifacts)`);
    }
  }

  lines.push(
    '',
    '## Current Test',
    '',
    '[Agent: read phase-level uat.md files, then consolidate into milestone-level UAT. Focus on cross-phase behaviors.]',
    '',
    '## Tests',
    '',
    '[Agent: write cross-phase integration tests here.]',
    '',
    '## Summary',
    '',
    'total: [N]',
    'passed: 0',
    'issues: 0',
    'pending: [N]',
    'skipped: 0',
    'blocked: 0',
    '',
    '## Gaps',
    '',
    '[none yet]',
    '',
  );

  return lines.join('\n');
}

// ── Helpers ──────────────────────────────────────────────────────

function findChangeInArchive(bpDir: string, changeName: string): string | null {
  const archiveDir = join(bpDir, 'archive');
  if (!existsSync(archiveDir)) return null;

  // Walk archive/<milestone>/<phase>/<change-dir>
  for (const ms of readdirSync(archiveDir, { withFileTypes: true })) {
    if (!ms.isDirectory()) continue;
    const msDir = join(archiveDir, ms.name);
    for (const ph of readdirSync(msDir, { withFileTypes: true })) {
      if (!ph.isDirectory()) continue;
      const phDir = join(msDir, ph.name);
      for (const ch of readdirSync(phDir, { withFileTypes: true })) {
        if (!ch.isDirectory()) continue;
        // Change dirs are named like "2026-07-01-toolchain-and-types"
        if (ch.name.endsWith(changeName) || ch.name === changeName) {
          return join(phDir, ch.name);
        }
      }
    }
  }
  return null;
}

function findActiveChanges(dir: string): { name: string; path: string }[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, path: join(dir, e.name) }));
}

function findArchivedChanges(dir: string): { name: string; path: string }[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, path: join(dir, e.name) }));
}
