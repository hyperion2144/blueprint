/**
 * bp archive [name] — verify & archive a change
 *
 * 1. Verifies review.md exists and verdict is PASS.
 * 2. Merges each delta spec (specs/<domain>/spec.md) into the global spec
 *    (bp/specs/<domain>/spec.md) via mergeDeltaSpec().
 * 3. Archives the change directory to bp/changes/archive/<date>-<name>/.
 * 4. Updates bp/roadmap.md: marks the change [x], increments phase counters,
 *    flags phase/milestone completion.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { findBpDir, gateContextJsonl, resolveChangeName } from './_utils.js';
import { changeDir, archiveChangeDir } from '../core/file-tree.js';
import { generateCodebaseMap, writeCodebaseMap } from '../core/codebase-map.js';
import { mergeDeltaSpec } from '../core/delta-merge.js';
import { loadConfig } from '../core/config.js';
import type { Command } from 'commander';
export function register(program: Command): void {
  program
    .command('archive [name]')
    .description('Archive a change (merge delta specs, archive dir, update roadmap)')
    .option('--dry-run', 'Preview merge without writing -- checks for conflicts')
    .option('--ci', 'CI mode: non-interactive, skip warnings, exit 0 on success')
    .action(archiveHandler);
}


function archiveHandler(name: string, options?: { dryRun?: boolean; ci?: boolean }): void {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  const config = loadConfig(bpDir);

  const changeName = resolveChangeName(bpDir, name);
  if (!changeName) process.exit(1);

  const changePath = changeDir(bpDir, changeName);
  if (!existsSync(changePath)) {
    console.error(`Change "${changeName}" not found.`);
    process.exit(1);
  }
  if (!gateContextJsonl(bpDir, changeName, 'archive')) process.exit(2);

  // ---- Dry-run: preview merge without writing ----
  if (options?.dryRun) {
    const specsDir = join(changePath, 'specs');
    let checkedCount = 0;
    let hasConflict = false;

    if (existsSync(specsDir)) {
      const entries = readdirSync(specsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const domain = entry.name;
        const deltaSpecPath = join(specsDir, domain, 'spec.md');
        if (!existsSync(deltaSpecPath)) continue;

        const globalSpecPath = join(bpDir, 'specs', domain, 'spec.md');
        const baseSpec = existsSync(globalSpecPath)
          ? readFileSync(globalSpecPath, 'utf-8')
          : `# ${domain}\n\n## Requirements\n\n`;

        const deltaSpec = readFileSync(deltaSpecPath, 'utf-8');
        const result = mergeDeltaSpec(baseSpec, deltaSpec);

        if (result.type === 'conflict') {
          console.error(`\nMerge conflict in specs/${domain}/spec.md:`);
          for (const conflict of result.conflicts) {
            console.error(`  - ${conflict.section}: ${conflict.message}`);
          }
          hasConflict = true;
        } else {
          console.log(`  ✓ No conflict in specs/${domain}/spec.md`);
        }
        checkedCount++;
      }
    }

    if (hasConflict) {
      console.error('\nMerge conflicts detected — resolve before archiving.');
      process.exit(1);
    }

    console.log(`\nSafe to archive: ${checkedCount} delta spec(s) can merge without conflict`);
    process.exit(0);
  }
  // F5a: Warn if working tree has uncommitted changes outside bp/
  if (!options?.ci) {
    try {
      const status = execSync('git status --porcelain', { cwd: join(bpDir, '..'), encoding: 'utf-8' });
      const nonBpChanges = status.split('\n').filter((l: string) => l.trim() && !l.includes('bp/'));
      if (nonBpChanges.length > 0) {
        console.warn(`Warning: ${nonBpChanges.length} uncommitted file(s) outside bp/ detected. These may be archived alongside the change.`);
      }
    } catch { /* git not available -- skip */ }
  }
  // ---- Step 2: Verify review status ----
  const reviewPath = join(changePath, 'review.md');
  if (!existsSync(reviewPath)) {
    console.error(`Cannot archive: review.md not found for "${changeName}".`);
    console.error('Run "bp review" first.');
    process.exit(1);
  }

  const reviewContent = readFileSync(reviewPath, 'utf-8');
  const verdictMatch = reviewContent.match(
    /## Overall Verdict:\s*(PASS|FAIL|NEEDS_REVISION)/i,
  );
  const verdict = verdictMatch ? verdictMatch[1].toUpperCase() : 'UNKNOWN';

  if (verdict !== 'PASS') {
    console.error(`Cannot archive: review verdict is ${verdict} (expected PASS).`);
    console.error(`  Fix issues first: bp apply --fix ${changeName}`);
    process.exit(1);
  }

  const unresolved = (reviewContent.match(/^- \[ \] [RQGD]\d+/gm) || []).length;
  if (unresolved > 0) {
    console.error(`Cannot archive: ${unresolved} unresolved issue(s) in review.md.`);
    console.error(`  Fix issues first: bp apply --fix ${changeName}`);
    process.exit(1);
  }

  // v2.1 7.2.5: Critical change requires approver verification
  const proposalPath = join(changePath, 'proposal.md');
  const proposalContent = existsSync(proposalPath) ? readFileSync(proposalPath, 'utf-8') : '';
  const levelMatch = proposalContent.match(/\*\*Level\*\*:\s*(\w+)/);
  const changeLevel = levelMatch ? levelMatch[1].toLowerCase() : 'standard';
  if (changeLevel === 'critical') {
    const approvers = config.approvers ?? [];
    if (approvers.length > 0) {
      // Check if review.md has an approval signature
      const approvalMatch = reviewContent.match(/## Approval[\s\S]*?Approved by:\s*(\S+)/i);
      if (!approvalMatch) {
        console.error('Cannot archive: Critical change requires explicit approval in review.md ## Approval section.');
        console.error(`Configured approvers: ${approvers.join(', ')}`);
        process.exit(1);
      }
      const approver = approvalMatch[1];
      if (!approvers.includes(approver)) {
        console.error(`Cannot archive: approver '${approver}' not in configured approvers list.`);
        process.exit(1);
      }
    }
  }

  // ---- Step 3: Merge delta specs into global specs ----
  const specsDir = join(changePath, 'specs');
  let mergedCount = 0;

  if (existsSync(specsDir)) {
    const entries = readdirSync(specsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const domain = entry.name;
      const deltaSpecPath = join(specsDir, domain, 'spec.md');
      if (!existsSync(deltaSpecPath)) continue;

      const globalSpecDir = join(bpDir, 'specs', domain);
      const globalSpecPath = join(globalSpecDir, 'spec.md');

      // Read or bootstrap the global spec
      let baseSpec: string;
      if (existsSync(globalSpecPath)) {
        baseSpec = readFileSync(globalSpecPath, 'utf-8');
      } else {
        baseSpec = `# ${domain}\n\n## Requirements\n\n`;
      }

      const deltaSpec = readFileSync(deltaSpecPath, 'utf-8');
      const result = mergeDeltaSpec(baseSpec, deltaSpec);

      if (result.type === 'conflict') {
        console.error(`\nMerge conflict in specs/${domain}/spec.md:`);
        for (const conflict of result.conflicts) {
          console.error(`  - ${conflict.section}: ${conflict.message}`);
        }
        console.error('\nResolve conflicts before archiving.');
        process.exit(1);
      }

      mkdirSync(globalSpecDir, { recursive: true });
      writeFileSync(globalSpecPath, result.merged, 'utf-8');
      mergedCount++;
      console.log(`  ✓ Merged specs/${domain}/spec.md`);
    }
  }

  // ---- Step 4 / 5: Update roadmap (only if proposal has a phase reference) ----
  // proposalPath already declared above in critical approvers check
  let hasPhaseReference = false;

  if (existsSync(proposalPath)) {
    const proposalContent = readFileSync(proposalPath, 'utf-8');
    if (proposalContent.includes('## Roadmap Reference')) {
      hasPhaseReference = true;
    }
  }

  let phaseCompleted = false;
  let milestoneCompleted = false;

  if (hasPhaseReference) {
    const roadmapPath = join(bpDir, 'roadmap.md');
    if (existsSync(roadmapPath)) {
      const roadmap = readFileSync(roadmapPath, 'utf-8');
      const date = new Date().toISOString().slice(0, 10);
      const result = updateRoadmap(roadmap, changeName, date);

      if (result.updated !== roadmap) {
        writeFileSync(roadmapPath, result.updated, 'utf-8');
        console.log('  ✓ Roadmap updated');
        phaseCompleted = result.phaseCompleted;
        milestoneCompleted = result.milestoneCompleted;
      } else {
        console.log('  ~ Change not found in roadmap, skipping update');
      }
    }
  } else {
    console.log('  ~ No roadmap reference, skipping roadmap update');
  }

  // ---- Step 4: Archive the change directory ----
  archiveChangeDir(bpDir, changeName);
  console.log('  ✓ Change moved to archive');

  // ---- Step 6: Output summary ----
  const date = new Date().toISOString().slice(0, 10);
  console.log(`\n✓ Archived ${changeName}`);
  console.log(`  - ${mergedCount} delta spec(s) merged into bp/specs/`);
  console.log(`  - Change moved to bp/changes/archive/${date}-${changeName}/`);
  if (phaseCompleted) {
    console.log('  - Phase COMPLETED');
  }
  if (milestoneCompleted) {
    console.log('  - Milestone SHIPPED');
  }
  if (options?.ci) {
    process.exit(0);
  }
  console.log('\n  Next: bp propose <new-change> (or: bp continue)');
  // v2.1 P4: Refresh codebase map after archive (code changed)
  try {
    const rootDir = join(bpDir, '..');
    const map = generateCodebaseMap(rootDir);
    writeCodebaseMap(bpDir, map);
    console.log('  ✓ Codebase map refreshed');
  } catch { /* non-fatal */ }
}

// ---- Roadmap helpers ----

interface RoadmapUpdate {
  updated: string;
  phaseCompleted: boolean;
  milestoneCompleted: boolean;
}

/**
 * Update bp/roadmap.md after archiving a change:
 *
 * 1. Mark the change line `- [ ] <name>` → `- [x] <name> (archived <date>)`.
 * 2. Walk backward to find the containing phase header.
 * 3. Increment the phase `- **Changes**: X/Y` counter.
 * 4. If all changes in the phase are now [x], set phase status to COMPLETED.
 * 5. If all phases in the milestone are COMPLETED, set milestone to SHIPPED.
 */
function updateRoadmap(roadmap: string, changeName: string, date: string): RoadmapUpdate {
  const lines = roadmap.split('\n');
  const dateStr = `(archived ${date})`;
  let changeIdx = -1;

  // Find and update the change line (exact match on trimmed change name)
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^- \[ \] (.+)$/);
    if (match && match[1].trim() === changeName) {
      lines[i] = `- [x] ${changeName} ${dateStr}`;
      changeIdx = i;
      break;
    }
  }

  // Fallback: try partial/includes match
  if (changeIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (/^- \[ \]/.test(lines[i]) && lines[i].includes(changeName)) {
        lines[i] = `- [x] ${changeName} ${dateStr}`;
        changeIdx = i;
        break;
      }
    }
  }

  if (changeIdx === -1) {
    return { updated: roadmap, phaseCompleted: false, milestoneCompleted: false };
  }

  // Walk backward to find containing phase and milestone headers
  let phaseIdx = -1;
  let milestoneIdx = -1;

  for (let i = changeIdx - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('## Milestone:')) {
      if (milestoneIdx === -1) milestoneIdx = i;
    }
    if (trimmed.startsWith('### Phase:')) {
      phaseIdx = i;
      break;
    }
  }

  if (phaseIdx === -1) {
    return { updated: lines.join('\n'), phaseCompleted: false, milestoneCompleted: false };
  }

  // Find phase section end boundary
  let phaseEnd = lines.length;
  for (let i = phaseIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('### Phase:') || lines[i].startsWith('## Milestone:')) {
      phaseEnd = i;
      break;
    }
  }

  // Count [x] and [ ] change lines within this phase to compute the new "done" count
  let doneCount = 0;
  let totalCount = 0;
  for (let i = phaseIdx; i < phaseEnd; i++) {
    if (/^- \[[x ]\]/.test(lines[i])) totalCount++;
    if (/^- \[x\]/.test(lines[i])) doneCount++;
  }

  // Update the `- **Changes**: X/Y completed` line
  let phaseCompleted = false;
  for (let i = phaseIdx; i < phaseEnd; i++) {
    const changesMatch = lines[i].match(/^- \*\*Changes\*\*:\s*(\d+)\/(\d+)/);
    if (changesMatch) {
      const total = parseInt(changesMatch[2], 10);
      lines[i] = `- **Changes**: ${doneCount}/${total} completed`;
      phaseCompleted = doneCount >= total;
      break;
    }
  }

  // Mark phase COMPLETED if all changes are done
  if (phaseCompleted) {
    for (let i = phaseIdx; i < phaseEnd; i++) {
      const statusMatch = lines[i].match(/^- \*\*Status\*\*:/);
      if (statusMatch) {
        lines[i] = '- **Status**: COMPLETED';
        break;
      }
    }

    // Also update the bracket status in the phase header
    lines[phaseIdx] = lines[phaseIdx].replace(
      /\[(NOT_STARTED|IN_PROGRESS|ACTIVE)\]/,
      '[COMPLETED]',
    );
  }

  // Check milestone completion if phase was just completed
  let milestoneCompleted = false;
  if (phaseCompleted && milestoneIdx >= 0) {
    // Find milestone section end
    let milestoneEnd = lines.length;
    for (let i = milestoneIdx + 1; i < lines.length; i++) {
      if (lines[i].startsWith('## Milestone:')) {
        milestoneEnd = i;
        break;
      }
    }

    let allPhasesCompleted = true;
    for (let i = milestoneIdx + 1; i < milestoneEnd; i++) {
      const pm = lines[i].match(/^### Phase: .+ \[(.+)\]/);
      if (pm && pm[1] !== 'COMPLETED') {
        allPhasesCompleted = false;
        break;
      }
    }

    if (allPhasesCompleted) {
      lines[milestoneIdx] = lines[milestoneIdx].replace(/\[ACTIVE\]/, '[SHIPPED]');
      milestoneCompleted = true;
    }
  }

  return {
    updated: lines.join('\n'),
    phaseCompleted,
    milestoneCompleted,
  };
}
