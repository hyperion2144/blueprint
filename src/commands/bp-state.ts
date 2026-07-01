/**
 * bp state — view/modify current state (compact JSON output)
 */

import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { loadState, updateState } from '../core/state-file.js';
import { archiveMilestoneDir } from '../core/file-tree.js';

export function register(program: any): void {
  const cmd = program
    .command('state')
    .description('View/modify current state');

  cmd
    .command('show')
    .description('Show current state as JSON')
    .action(showState);

  cmd
    .command('set-milestone <id>')
    .description('Switch to specified milestone')
    .action(setMilestone);

  cmd
    .command('set-phase <id>')
    .description('Switch to specified phase')
    .action(setPhase);

  cmd
    .command('set-step <step>')
    .description('Set current step')
    .action(setStep);

  cmd.action(showState);
}

function findBlueprintDir(): string {
  return join(process.cwd(), 'bp');
}

function showState() {
  const bpDir = findBlueprintDir();
  const state = loadState(bpDir);
  const { project, active_context } = state;

  const pendingChanges = state.changes.filter((c: any) => c.status !== 'archived');
  const pendingAdhoc = state.adhoc.filter((c: any) => c.status !== 'archived');

  // Read task progress for each pending change
  const withProgress = (items: any[], type: string) => items.map((c: any) => {
    const tasksPath = join(bpDir, 'changes', c.name, 'tasks.md');
    let tasks = null;
    try {
      const content = readFileSync(tasksPath, 'utf-8');
      const total = (content.match(/^\s*-\s*\[[ x]\]/gm) || []).length;
      const completed = (content.match(/^\s*-\s*\[x\]/gm) || []).length;
      if (total > 0) tasks = { total, completed };
    } catch { /* no tasks.md yet */ }
    return { type, name: c.name, status: c.status, tasks };
  });

  // Read milestone/phase status from roadmap if available
  let roadmap = null;
  try {
    const roadmapPath = join(bpDir, 'roadmap.md');
    if (existsSync(roadmapPath)) {
      const content = readFileSync(roadmapPath, 'utf-8');
      const msMatches = content.match(/^##\s+(M\d+[^\n]*)/gm);
      if (msMatches) {
        roadmap = msMatches.map((m: string) => {
          const name = m.replace(/^##\s+/, '').trim();
          const id = name.split(/\s*[-–—]\s*/)[0].trim();
          const isActive = project.current_milestone === id;
          return { name, id, active: isActive };
        });
      }
    }
  } catch { /* no roadmap */ }

  const output: any = {
    project: project.name,
    status: project.status,
    milestone: project.current_milestone,
    phase: project.current_phase,
    context: {
      type: active_context.type,
      step: active_context.step,
      ref: active_context.ref || null,
    },
    pending: withProgress(pendingChanges, 'change').concat(withProgress(pendingAdhoc, 'adhoc')),
  };
  if (roadmap) output.roadmap = roadmap;

  console.log(JSON.stringify(output, null, 2));
}

function setMilestone(id: string) {
  const bpDir = findBlueprintDir();
  updateState(bpDir, (state) => {
    // Archive current milestone if exists and not shipped
    const current = state.project.current_milestone;
    if (current && state.project.status !== 'milestone-shipped') {
      archiveMilestoneDir(bpDir, current);
    }
    state.project.current_milestone = id;
    state.project.current_phase = null;
    state.active_context = { type: 'milestone', ref: `milestones/${id}`, step: 'active' };
  });
  console.log(JSON.stringify({ ok: true, milestone: id }));
}

function setPhase(id: string) {
  const bpDir = findBlueprintDir();
  updateState(bpDir, (state) => {
    state.project.current_phase = id;
    state.active_context = { type: 'phase', ref: `milestones/${state.project.current_milestone}/phases/${id}`, step: 'discuss' };
  });
  console.log(JSON.stringify({ ok: true, phase: id }));
}

function setStep(step: string) {
  const bpDir = findBlueprintDir();
  updateState(bpDir, (state) => {
    state.active_context.step = step;
  });
  console.log(JSON.stringify({ ok: true, step }));
}
