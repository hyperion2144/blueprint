/**
 * bp ship — ship phase or milestone.
 *
 * Phase ship: validate all changes archived + reviews pass → generate
 *   summary.md with review/verification results → commit → update state.
 * Milestone ship: all phases shipped → bump version → create git tag → commit.
 */

import { join, basename, dirname } from 'node:path';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { loadState, updateState, saveState } from '../core/state-file.js';
import type { StateFile } from '../types/index.js';

export function register(program: any): void {
  program
    .command('ship')
    .description('Ship phase (validate + summary + commit) or milestone (version bump + tag)')
    .option('--dry-run', 'Preview without executing')
    .option('--skip-commit', 'Skip git commit (for testing)')
    .action(shipHandler);
}

// ── Types ────────────────────────────────────────────────────────

interface ArchivedChange {
  name: string;
  path: string;
}

interface ValidationResult {
  change: string;
  hasChangeSummary: boolean;
  hasVerification: boolean;
  verificationPassed: boolean;
  specReviewPassed: boolean;
  qualityReviewPassed: boolean;
  goalReviewPassed: boolean;
  errors: string[];
}

// ── Main handler ─────────────────────────────────────────────────

function shipHandler(options: { dryRun?: boolean; skipCommit?: boolean }) {
  const cwd = process.cwd();
  const bpDir = join(cwd, 'bp');
  const state = loadState(bpDir);

  const milestone = state.project.current_milestone;
  const phase = state.project.current_phase;

  if (!milestone || !phase) {
    console.log(JSON.stringify({ error: 'No active milestone/phase. Nothing to ship.' }));
    return;
  }

  // ── Phase ship ──────────────────────────────────────────────────

  const archiveRoot = join(bpDir, 'archive', milestone, phase);
  const changes = findArchivedChanges(archiveRoot);

  if (changes.length === 0) {
    console.log(JSON.stringify({ error: `No archived changes found in ${archiveRoot}. Archive changes first.` }));
    return;
  }

  // Validate all changes
  const validations = changes.map((c) => validateChange(c, bpDir));
  const failures = validations.filter((v) => v.errors.length > 0);

  if (options.dryRun) {
    console.log(JSON.stringify({
      mode: 'phase',
      milestone,
      phase,
      changeCount: changes.length,
      changes: changes.map((c) => c.name),
      validations: validations.map((v) => ({
        change: v.change,
        checks: {
          changeSummary: v.hasChangeSummary,
          verification: v.hasVerification ? (v.verificationPassed ? 'PASS' : 'FAIL') : 'MISSING',
          specReview: v.specReviewPassed ? 'PASS' : 'FAIL',
          qualityReview: v.qualityReviewPassed ? 'PASS' : 'FAIL',
          goalReview: v.goalReviewPassed ? 'PASS' : 'FAIL',
        },
        errors: v.errors,
      })),
      dryRun: true,
      ready: failures.length === 0,
      hint: failures.length > 0
        ? `${failures.length} changes have issues. Fix before shipping.`
        : 'All validations pass. Run without --dry-run to ship.',
    }, null, 2));
    return;
  }

  if (failures.length > 0) {
    console.log(JSON.stringify({
      error: 'Validation failed',
      failures: failures.map((f) => ({ change: f.change, errors: f.errors })),
      hint: 'Run with --dry-run to see details. Fix issues then retry.',
    }));
    process.exit(1);
  }

  // Generate phase summary
  const summary = generatePhaseSummary(milestone, phase, changes, validations, bpDir);
  const phaseDir = join(bpDir, 'milestones', milestone, 'phases', phase);
  mkdirSync(phaseDir, { recursive: true });
  writeFileSync(join(phaseDir, 'summary.md'), summary, 'utf-8');

  // Update state
  const statePath = join(bpDir, 'state.md');
  updateState(bpDir, (s) => {
    s.project.status = 'phase-shipped';
    s.active_context.step = 'shipped';
  });

  // Git commit
  if (!options.skipCommit) {
    gitCommit(cwd, [
      join(phaseDir, 'summary.md'),
      statePath,
    ], `ship: ${milestone}/${phase} — ${changes.length} changes`);
  }

  // Find next phase
  const nextPhase = findNextPhase(bpDir, milestone, phase);

  console.log(JSON.stringify({
    shipped: { milestone, phase, changes: changes.length },
    summary: join(phaseDir, 'summary.md'),
    next: nextPhase
      ? { phase: nextPhase, milestone }
      : { hint: 'All phases in milestone shipped. Run ship again for milestone release.' },
    committed: !options.skipCommit,
  }, null, 2));
}

// ── Validation ───────────────────────────────────────────────────

function validateChange(ch: ArchivedChange, bpDir: string): ValidationResult {
  const errors: string[] = [];

  const hasChangeSummary = existsSync(join(ch.path, 'change-summary.md'));
  if (!hasChangeSummary) errors.push('missing change-summary.md');

  const verificationPath = join(ch.path, 'verification.md');
  const hasVerification = existsSync(verificationPath);
  let verificationPassed = false;
  if (hasVerification) {
    try {
      const content = readFileSync(verificationPath, 'utf-8');
      verificationPassed = /status:\s*passed/i.test(content);
      if (!verificationPassed) errors.push('verification.md status is not "passed"');
    } catch { errors.push('cannot read verification.md'); }
  } else {
    errors.push('missing verification.md');
  }

  // Read review files
  const specReviewPassed = checkReviewPassed(ch.path, 'spec-review.md');
  if (!specReviewPassed) errors.push('spec-review.md missing or not PASS');

  const qualityReviewPassed = checkReviewPassed(ch.path, 'quality-review.md');
  if (!qualityReviewPassed) errors.push('quality-review.md missing or not PASS');

  const goalReviewPassed = checkReviewPassed(ch.path, 'goal-review.md');
  if (!goalReviewPassed) errors.push('goal-review.md missing or not PASS');

  return {
    change: ch.name,
    hasChangeSummary,
    hasVerification,
    verificationPassed,
    specReviewPassed,
    qualityReviewPassed,
    goalReviewPassed,
    errors,
  };
}

function checkReviewPassed(dir: string, filename: string): boolean {
  const path = join(dir, filename);
  if (!existsSync(path)) return false;
  try {
    const content = readFileSync(path, 'utf-8');
    // Check for PASS verdict (case-insensitive, various formats)
    return /(?:Overall|Verdict).*?:?\s*PASS/i.test(content)
      || /^\s*PASS\b/m.test(content);
  } catch { return false; }
}

// ── Summary generation ───────────────────────────────────────────

function generatePhaseSummary(
  milestone: string,
  phase: string,
  changes: ArchivedChange[],
  validations: ValidationResult[],
  _bpDir: string,
): string {
  const lines: string[] = [
    `# Phase Summary: ${phase}`,
    `> Milestone: ${milestone}`,
    `> Date: ${new Date().toISOString().slice(0, 10)}`,
    `> Changes: ${changes.length}`,
    '',
    '## Verification Matrix',
    '',
    '| Change | Spec Review | Quality Review | Goal Review | Verification |',
    '|--------|------------|----------------|-------------|-------------|',
  ];

  for (const v of validations) {
    lines.push(
      `| ${v.change} | ${icon(v.specReviewPassed)} | ${icon(v.qualityReviewPassed)} | ${icon(v.goalReviewPassed)} | ${icon(v.verificationPassed)} |`
    );
  }

  lines.push('', '## Change Summaries', '');

  for (let i = 0; i < changes.length; i++) {
    const ch = changes[i];
    lines.push(`### ${ch.name}`);
    lines.push('');

    const summaryPath = join(ch.path, 'change-summary.md');
    if (existsSync(summaryPath)) {
      const content = readFileSync(summaryPath, 'utf-8');
      // Include full summary (not just 500 chars)
      const trimmed = content.length > 2000 ? content.slice(0, 2000) + '\n\n_(truncated)_' : content;
      lines.push(trimmed);
    } else {
      lines.push('_(no change summary)_');
    }

    // Append review verdicts
    const specPath = join(ch.path, 'spec-review.md');
    const qualityPath = join(ch.path, 'quality-review.md');
    const goalPath = join(ch.path, 'goal-review.md');

    lines.push('');
    lines.push('**Reviews:**');
    lines.push(`- Spec Review: ${extractVerdict(specPath)}`);
    lines.push(`- Quality Review: ${extractVerdict(qualityPath)}`);
    lines.push(`- Goal Review: ${extractVerdict(goalPath)}`);
    lines.push('');
  }

  return lines.join('\n');
}

function icon(pass: boolean): string {
  return pass ? '✅' : '❌';
}

function extractVerdict(path: string): string {
  if (!existsSync(path)) return 'MISSING';
  try {
    const content = readFileSync(path, 'utf-8');
    const m = content.match(/(?:Overall|Verdict).*?:?\s*(PASS|FAIL|NEEDS_REVISION|PARTIAL)/i);
    return m ? m[1].toUpperCase() : 'UNKNOWN';
  } catch { return 'ERROR'; }
}

// ── File discovery ───────────────────────────────────────────────

function findArchivedChanges(dir: string): ArchivedChange[] {
  if (!existsSync(dir)) return [];
  const results: ArchivedChange[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      results.push({ name: entry.name, path: join(dir, entry.name) });
    }
  }
  return results;
}

// ── Phase navigation ─────────────────────────────────────────────

function findNextPhase(bpDir: string, milestoneId: string, currentPhase: string): string | null {
  const roadmapPath = join(bpDir, 'roadmap.md');
  if (!existsSync(roadmapPath)) return null;

  try {
    const content = readFileSync(roadmapPath, 'utf-8');

    // Find the section for this milestone
    const milestoneSection = new RegExp(
      `##\\s+${escapeRegex(milestoneId)}[\\s\\S]*?(?=##\\s+M\\d|$)`, 'i'
    );
    const msMatch = content.match(milestoneSection);
    if (!msMatch) return null;

    // Extract phases in order from within this milestone section only
    const phases = (msMatch[0].match(/ph\.\d+-\w+/g) ?? []) as string[];
    const idx = phases.indexOf(currentPhase);
    if (idx >= 0 && idx < phases.length - 1) {
      return phases[idx + 1];
    }
  } catch { /* roadmap not parseable */ }

  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Git operations ───────────────────────────────────────────────

function gitCommit(cwd: string, files: string[], message: string): void {
  try {
    // Stage files
    for (const f of files) {
      if (existsSync(join(cwd, f))) {
        execSync(`git add "${f}"`, { cwd, stdio: 'pipe' });
      }
    }
    // Commit
    execSync(`git commit -m "${message}"`, { cwd, stdio: 'pipe' });
  } catch (err: any) {
    // Non-fatal: state is already saved, user can commit manually
    const stderr = err.stderr?.toString() ?? '';
    if (stderr.includes('nothing to commit')) return; // No changes — ok
    console.error(`Warning: git commit failed: ${stderr.slice(0, 200)}`);
  }
}
