/**
 * roadmap-update — update change status in bp/roadmap.md.
 * Called by each change-level step after execution, if the change
 * references a roadmap milestone/phase.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { changeDir } from './file-tree.js';

/** Status markers for roadmap.md change lines */
export type ChangeRoadmapStatus = 'not-started' | 'in-progress' | 'archived';

const STATUS_LABELS: Record<ChangeRoadmapStatus, { marker: string; suffix: string }> = {
  'not-started': { marker: ' ', suffix: '' },
  'in-progress': { marker: '-', suffix: '(in-progress)' },
  archived: { marker: 'x', suffix: '(archived)' },
};

interface ChangeLink {
  milestone: string;
  phase: string;
}

/** Read .bp.yaml from a change directory to check roadmap linkage */
function readChangeLink(bpDir: string, changeName: string): ChangeLink | null {
  const metaPath = join(changeDir(bpDir, changeName), '.bp.yaml');
  if (!existsSync(metaPath)) return null;
  try {
    const content = readFileSync(metaPath, 'utf-8');
    const milestone = content.match(/milestone:\s*(.+)/)?.[1]?.trim();
    const phase = content.match(/phase:\s*(.+)/)?.[1]?.trim();
    if (milestone && phase) return { milestone, phase };
    return null;
  } catch {
    return null;
  }
}

/**
 * Update a change's status in roadmap.md.
 * Only updates if the change is linked to a milestone/phase (via .bp.yaml).
 * If not linked, logs a message and does nothing.
 */
export function updateChangeStatus(bpDir: string, changeName: string, status: ChangeRoadmapStatus): void {
  const link = readChangeLink(bpDir, changeName);
  if (!link) {
    console.error(`change "${changeName}" not linked to roadmap, skipping`);
    return;
  }

  const roadmapPath = join(bpDir, 'roadmap.md');
  if (!existsSync(roadmapPath)) {
    console.error('roadmap.md not found, skipping');
    return;
  }

  const content = readFileSync(roadmapPath, 'utf-8');
  const lines = content.split('\n');
  const { marker, suffix } = STATUS_LABELS[status];
  const date = new Date().toISOString().slice(0, 10);
  let updated = false;

  for (let i = 0; i < lines.length; i++) {
    // Match change line: - [ ] <name> or - [-] <name> or - [x] <name>
    const match = lines[i].match(/^- \[[ x-]\] (.+?)(?:\s+\(.+\))?\s*$/);
    if (match && match[1].trim() === changeName) {
      lines[i] = `- [${marker}] ${changeName} ${suffix}`;
      updated = true;
      break;
    }
  }

  if (!updated) {
    // Fallback: partial match
    for (let i = 0; i < lines.length; i++) {
      if (/^- \[[ x-]\]/.test(lines[i]) && lines[i].includes(changeName)) {
        lines[i] = `- [${marker}] ${changeName} ${suffix}`;
        updated = true;
        break;
      }
    }
  }

  if (!updated) {
    console.error(`change "${changeName}" not found in roadmap.md, skipping`);
    return;
  }

  writeFileSync(roadmapPath, lines.join('\n'), 'utf-8');
  console.log(`✓ roadmap.md updated: ${changeName} -> ${status}`);
}
