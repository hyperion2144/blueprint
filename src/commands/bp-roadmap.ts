/**
 * bp roadmap — view/modify roadmap.md
 */

import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { findBpDir } from './_utils.js';
import { ARTIFACT_TEMPLATES } from '../templates/artifacts/index.js';
import type { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('roadmap')
    .description('View or modify roadmap.md')
    .option('--edit', 'output template for editing')
    .option('--add-milestone <name>', 'append milestone section')
    .option('--add-phase <milestone>', 'append phase section under milestone')
    .option('--goal <text>', 'goal text for milestone or phase')
    .option('--domain <domain>', 'spec domain for phase')
    .option('--mark <milestone>', 'mark milestone (or milestone/phase)')
    .option('--shipped', 'mark phase/milestone as completed')
    .option('--validate', 'Validate roadmap.md structure')
    .action(roadmapHandler);
}

function roadmapHandler(options: {
  edit?: boolean;
  addMilestone?: string;
  addPhase?: string;
  goal?: string;
  domain?: string;
  mark?: string;
  shipped?: boolean;
  validate?: boolean;
}) {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  const roadmapPath = join(bpDir, 'roadmap.md');

  // --validate: check roadmap structure
  if (options.validate) {
    if (!existsSync(roadmapPath)) {
      console.error('FAIL: roadmap.md not found');
      process.exit(1);
    }
    const content = readFileSync(roadmapPath, 'utf-8');
    let pass = true;

    // Check each ## Milestone: has id, name, [status]
    const milestoneMatches = content.matchAll(/^## Milestone:\s*(.*?)$/gm);
    let milestoneCount = 0;
    for (const m of milestoneMatches) {
      milestoneCount++;
      const line = m[1].trim();
      if (!/\bM\d+\b/.test(line)) {
        console.error(`FAIL: Milestone "${line}" missing id (M{N})`);
        pass = false;
      }
      if (!line.includes('[')) {
        console.error(`FAIL: Milestone "${line}" missing [status]`);
        pass = false;
      }
    }
    if (milestoneCount === 0) {
      console.error('FAIL: No ## Milestone: headings found');
      pass = false;
    }

    // Check each ### Phase: has id, name, [status]
    const phaseMatches = content.matchAll(/^### Phase:\s*(.*?)$/gm);
    let phaseCount = 0;
    for (const p of phaseMatches) {
      phaseCount++;
      const line = p[1].trim();
      if (!/\bP\S+\b/.test(line)) {
        console.error(`FAIL: Phase "${line}" missing id (P{N})`);
        pass = false;
      }
      if (!line.includes('[')) {
        console.error(`FAIL: Phase "${line}" missing [status]`);
        pass = false;
      }
    }
    if (phaseCount === 0) {
      console.error('FAIL: No ### Phase: headings found');
      pass = false;
    }

    // Check change lines have a change name
    const changeMatches = content.matchAll(/^-\s+\[([ x])\]\s+(.*?)$/gm);
    let changeCount = 0;
    for (const c of changeMatches) {
      changeCount++;
      if (!c[2].trim()) {
        console.error(`FAIL: Change line "${c[0].trim()}" has no change name`);
        pass = false;
      }
    }

    console.log(pass ? 'PASS' : 'FAIL');
    if (!pass) process.exit(1);
    return;
  }

  // Display current roadmap
  if (!options.edit && !options.addMilestone && !options.addPhase && !options.mark && !options.validate) {
    if (!existsSync(roadmapPath)) {
      console.log('No roadmap.md found. Use `bp roadmap --edit` to create one.');
      return;
    }
    const content = readFileSync(roadmapPath, 'utf-8');
    console.log(content);
    return;
  }

  // --edit: output template
  if (options.edit) {
    const date = new Date().toISOString().slice(0, 10);
    let template = ARTIFACT_TEMPLATES.roadmap;
    template = template.replace(/\{\{project-name\}\}/g, 'project');
    template = template.replace(/\{\{date\}\}/g, date);
    console.log(template);
    return;
  }

  // Ensure roadmap exists for mutations
  let roadmap = '';
  if (existsSync(roadmapPath)) {
    roadmap = readFileSync(roadmapPath, 'utf-8');
  } else {
    const date = new Date().toISOString().slice(0, 10);
    roadmap = ARTIFACT_TEMPLATES.roadmap.replace(/\{\{project-name\}\}/g, 'project').replace(/\{\{date\}\}/g, date);
  }

  // --add-milestone
  if (options.addMilestone) {
    const goal = options.goal || 'TBD';
    const id = getNextMilestoneId(roadmap);
    const section = `

## Milestone: M${id} - ${options.addMilestone} [PLANNED]

**Goal**: ${goal}
**Status**: PLANNED

### Phase: P${id}.1 - Initial Phase [NOT_STARTED]

- **Goal**: TBD
- **Spec domain**: core
- **Changes**: 0/0
- **Status**: NOT_STARTED

**Planned changes**:
- (none yet)

`;

    roadmap += section;
    writeFileSync(roadmapPath, roadmap, 'utf-8');
    console.log(`✓ Added milestone M${id} - ${options.addMilestone}`);
    return;
  }

  // --add-phase
  if (options.addPhase) {
    const milestoneName = options.addPhase;
    const milestoneMatch = roadmap.match(new RegExp(`## Milestone:\\s*([^-]*-\\s*)?${escapeRegex(milestoneName)}`));
    if (!milestoneMatch) {
      console.error(`Milestone not found: ${milestoneName}`);
      console.log('Available milestones:');
      const msMatch = roadmap.matchAll(/^## Milestone:\s*(M\d+\s*-\s*.+)$/gm);
      for (const m of msMatch) {
        console.log(`  ${m[1]}`);
      }
      process.exit(1);
    }

    const goal = options.goal || 'TBD';
    const domain = options.domain || 'core';
    const phaseId = getNextPhaseId(roadmap, milestoneName);
    const phaseSection = `
### Phase: P${phaseId} - ${goal} [NOT_STARTED]

- **Goal**: ${goal}
- **Spec domain**: ${domain}
- **Changes**: 0/0
- **Status**: NOT_STARTED

**Planned changes**:
- (none yet)

`;

    // Insert at end of milestone section (before next milestone or end)
    const milestoneEnd = findMilestoneEnd(roadmap, milestoneMatch.index!);
    roadmap = roadmap.slice(0, milestoneEnd) + phaseSection + roadmap.slice(milestoneEnd);
    writeFileSync(roadmapPath, roadmap, 'utf-8');
    console.log(`✓ Added phase P${phaseId} under ${milestoneName}`);
    return;
  }

  // --mark --shipped
  if (options.mark && options.shipped) {
    const ref = options.mark; // e.g. "M1" or "M1/P1.1"
    const parts = ref.split('/');

    if (parts.length === 2) {
      // Mark phase as completed: M1/P1.1
      const msId = parts[0];
      const phId = parts[1];
      const phasePattern = new RegExp(`(### Phase:\\s*${escapeRegex(phId)}[^\n]*?)\\[([A-Z_]+)\\]`);
      if (phasePattern.test(roadmap)) {
        roadmap = roadmap.replace(phasePattern, `$1[COMPLETED]`);
        console.log(`✓ ${phId} marked COMPLETED`);
      } else {
        console.error(`Phase not found: ${phId}`);
        process.exit(1);
      }
    } else if (parts.length === 1) {
      // Mark milestone as shipped
      const msId = parts[0];
      const msPattern = new RegExp(`(## Milestone:\\s*${escapeRegex(msId)}[^\n]*?)\\[([A-Z_]+)\\]`);
      if (msPattern.test(roadmap)) {
        roadmap = roadmap.replace(msPattern, `$1[SHIPPED]`);
        console.log(`✓ ${msId} marked SHIPPED`);
      } else {
        console.error(`Milestone not found: ${msId}`);
        process.exit(1);
      }
    } else {
      console.error('Invalid --mark format. Use "M1" or "M1/P1.1"');
      process.exit(1);
    }

    writeFileSync(roadmapPath, roadmap, 'utf-8');
    return;
  }
}

/** Get the next milestone numeric id */
function getNextMilestoneId(roadmap: string): number {
  const matches = roadmap.matchAll(/M(\d+)/g);
  let max = 0;
  for (const m of matches) {
    const n = parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return max + 1;
}

/** Get the next phase id (P{milestone}.{n}) for a milestone */
function getNextPhaseId(roadmap: string, _milestoneName: string): string {
  const matches = roadmap.matchAll(/P(\d+)\.(\d+)/g);
  let maxMs = 0;
  let maxPh = 0;
  for (const m of matches) {
    const ms = parseInt(m[1], 10);
    const ph = parseInt(m[2], 10);
    if (ms > maxMs) { maxMs = ms; maxPh = ph; }
    else if (ms === maxMs && ph > maxPh) { maxPh = ph; }
  }
  return `${maxMs || 1}.${maxPh + 1}`;
}

/** Find the end index of a milestone section */
function findMilestoneEnd(roadmap: string, startIndex: number): number {
  const afterStart = roadmap.slice(startIndex + 1);
  const nextMs = afterStart.search(/^## Milestone:/m);
  if (nextMs >= 0) {
    return startIndex + 1 + nextMs;
  }
  return roadmap.length;
}

/** Escape regex special characters */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
