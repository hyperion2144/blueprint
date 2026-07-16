/**
 * bp roadmap-update <change-name> — update change status in bp/roadmap.md.
 * Only applies if the change is linked to a roadmap milestone/phase
 * (via its .bp.yaml metadata).
 */

import { findBpDir } from './_utils.js';
import { updateChangeStatus } from '../core/roadmap-update.js';
import type { ChangeRoadmapStatus } from '../core/roadmap-update.js';

export function register(program: any): void {
  program
    .command('roadmap-update <change-name>')
    .description('Update change status in roadmap.md (auto-detects status)')
    .action(roadmapUpdateHandler);
}

function roadmapUpdateHandler(changeName: string) {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  // Auto-detect status from artifact existence
  const { join } = require('node:path');
  const { existsSync } = require('node:fs');
  const changePath = join(bpDir, 'changes', changeName);

  let status: ChangeRoadmapStatus = 'in-progress';
  if (!existsSync(join(changePath, 'review.md'))) {
    // check if all tasks are [x]
    const tasksPath = join(changePath, 'tasks.md');
    if (existsSync(tasksPath)) {
      const content = require('node:fs').readFileSync(tasksPath, 'utf-8');
      const checked = (content.match(/^- \[x\]/gm) || []).length;
      const unchecked = (content.match(/^- \[ \]/gm) || []).length;
      if (checked > 0 && checked < checked + unchecked) {
        status = 'in-progress';
      } else if (checked === 0) {
        status = 'not-started';
      }
    }
  } else {
    const content = require('node:fs').readFileSync(join(changePath, 'review.md'), 'utf-8');
    if (/## Overall Verdict:\s*PASS/i.test(content)) {
      status = 'archived';
    }
  }

  updateChangeStatus(bpDir, changeName, status);
}
