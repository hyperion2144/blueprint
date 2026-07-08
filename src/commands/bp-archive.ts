/**
 * bp archive <change> — 归档 change（delta 合并 + 代码认知回灌 + 目录移动）
 */

import { join, basename } from 'node:path';
import { existsSync, readdirSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { loadState, updateState } from '../core/state-file.js';
import { mergeAndWrite } from '../core/delta-merge.js';
import { extractFromGitDiff, writeExtractionToSpec } from '../core/code-extract.js';
import { archiveChangeDir } from '../core/file-tree.js';

export function register(program: any): void {
  program
    .command('archive <change>')
    .description('Archive change (delta merge + code backfill)')
    .action(archiveHandler);
}

function archiveHandler(changePath: string) {
  const bpDir = join(process.cwd(), 'bp');

  // 解析 change 路径
  const fullChangePath = join(process.cwd(), changePath);
  if (!existsSync(fullChangePath)) {
    console.error(`Error: change directory not found: ${changePath}`);
    process.exit(1);
  }

  // 1. delta-spec merge
  const specsDir = join(fullChangePath, 'specs');
  if (existsSync(specsDir)) {
    mergeDeltaSpecs(specsDir, bpDir);
    console.log('✓ delta-specs merged');
  }

  // 2. Check change-summary.md
  const summaryPath = join(fullChangePath, 'change-summary.md');
  if (!existsSync(summaryPath)) {
    console.warn('⚠ change-summary.md not found. Run `bp template change-summary` to generate it.');
  }

  // 3. Code cognition extraction
  const repoDir = process.cwd();
  const extractResult = extractFromGitDiff(repoDir, fullChangePath);
  if (extractResult.available && extractResult.extractions.length > 0) {
    for (const extraction of extractResult.extractions) {
      writeExtractionToSpec(join(bpDir, 'specs'), extraction);
    }
    if (extractResult.extractions.length > 0) {
      console.log(`✓ Code extraction complete (${extractResult.extractions.length} domains)`);
    }
  }
  // 4. Update state.md BEFORE moving directory (avoids inconsistent state if move fails)
  const changeName = basename(changePath);
  try {
    updateState(bpDir, (state) => {
      const change = state.changes.find((c) => c.name === changeName);
      const adhoc = state.adhoc.find((c) => c.name === changeName);

      if (change) state.changes = state.changes.filter((c) => c.name !== changeName);
      if (adhoc) state.adhoc = state.adhoc.filter((c) => c.name !== changeName);

      // Write to completed list
      const date = new Date().toISOString().slice(0, 10);
      const normalizedPath = changePath.replace(/\\/g, '/');
      const isPhaseChange = normalizedPath.includes('/milestones/') && normalizedPath.includes('/phases/');
      const parts = normalizedPath.split('/');
      const msIdx = parts.indexOf('milestones');
      const chIdx = parts.indexOf('changes');
      const msId = msIdx >= 0 ? parts[msIdx + 1] : null;
      const phId = chIdx > 0 ? parts[chIdx - 1] : null;
      const archiveDir = join('bp', 'archive', msId ?? 'changes', phId ?? '', `${date}-${changeName}`);
      if (!state.completed) state.completed = [];
      state.completed.push({
        name: changeName,
        type: isPhaseChange ? 'change' : 'adhoc',
        milestone: msId,
        phase: phId,
        archived_at: date,
      });

      // Clean up contexts if in parallel mode
      if (state.active_context.type === 'changes' && state.active_context.contexts) {
        delete state.active_context.contexts[changeName];
        const remaining = Object.keys(state.active_context.contexts);
        if (remaining.length === 0) {
          state.active_context = { type: 'project', ref: null, step: state.project.status };
        } else if (remaining.length === 1) {
          const last = state.active_context.contexts[remaining[0]];
          state.active_context = { type: last.type, ref: last.ref, step: last.step };
        }
      } else {
        // Single change mode: reset active_context
        const nextChange = state.changes[0];
        const nextAdhoc = state.adhoc[0];
        if (nextAdhoc) {
          state.active_context = { type: 'adhoc', ref: 'changes/' + nextAdhoc.name, step: nextAdhoc.status };
        } else if (nextChange) {
          state.active_context = { type: 'change', ref: 'changes/' + nextChange.name, step: nextChange.status };
        } else {
          state.active_context = { type: 'project', ref: null, step: 'archived' };
          state.project.status = 'change-archived';
        }
      }
    });
    console.log('✓ state.md updated');

    // Append history for non-adhoc (phase-scoped) changes
    const normalizedPath = changePath.replace(/\\/g, '/');
    const isPhaseChange = normalizedPath.includes('/milestones/') && normalizedPath.includes('/phases/');
    if (isPhaseChange) {
      const parts = normalizedPath.split('/');
      const msIdx = parts.indexOf('milestones');
      const chIdx = parts.indexOf('changes');
      const msId = msIdx >= 0 ? parts[msIdx + 1] : '?';
      const phId = chIdx > 0 ? parts[chIdx - 1] : '?';
      const date = new Date().toISOString().slice(0, 10);
      const entry = `[${date}] Archived \`${changeName}\` (${msId} / ${phId})`;

      const statePath = join(bpDir, 'state.md');
      let body = readFileSync(statePath, 'utf-8');
      if (body.includes('## History')) {
        body = body.replace('## History', `## History\n- ${entry}`);
      } else {
        body += `\n## History\n- ${entry}\n`;
      }
      writeFileSync(statePath, body, 'utf-8');
    }
  } catch (e: unknown) {
    console.error(`✗ Failed to update state.md: ${e instanceof Error ? e.message : String(e)}`);
    console.error('  state.md unchanged — archive aborted.');
    process.exit(1);
  }

  // 5. Move to archive/
  const archiveDir = archiveChangeDir(bpDir, fullChangePath);
  console.log(`✓ Archived to: ${archiveDir}`);

  // 6. Remove old path from git tracking (best-effort)
  try {
    const gitPath = changePath.replace(/\\/g, '/');
    execSync(`git rm -r "${gitPath}" || true`, { cwd: process.cwd() });
  } catch { /* non-critical */ }
}

/** 合并 delta-specs 到全局 specs/ */
function mergeDeltaSpecs(deltaDir: string, bpDir: string): void {
  const entries = readdirSync(deltaDir, { withFileTypes: true });
  const globalSpecsDir = join(bpDir, 'specs');
  const existingDomains = existsSync(globalSpecsDir)
    ? readdirSync(globalSpecsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const domain = entry.name;
    const deltaSpecPath = join(deltaDir, domain, 'spec.md');
    const liveSpecPath = join(globalSpecsDir, domain, 'spec.md');

    if (!existsSync(deltaSpecPath)) continue;

    // If domain doesn't exist in bp/specs/, create it (no longer skip)
    if (!existsSync(liveSpecPath)) {
      mkdirSync(join(globalSpecsDir, domain), { recursive: true });
      copyFileSync(deltaSpecPath, liveSpecPath);
      console.log(`  ✓ Created bp/specs/${domain}/spec.md from delta`);
      continue;
    }

    const result = mergeAndWrite(liveSpecPath, deltaSpecPath);

    if (result.type === 'conflict') {
      console.warn('Merge conflict: ' + domain + '/spec.md');
      for (const c of result.conflicts) {
        console.warn('   Section: ' + c.section);
      }
    }
  }
}
