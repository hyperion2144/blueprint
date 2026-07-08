/**
 * bp state — view/modify current state (compact JSON output)
 */

import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { loadState, updateState } from '../core/state-file.js';

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

  cmd
    .command('set-deps <name>')
    .description('Set change dependencies (comma-separated)')
    .option('--deps <list>', 'comma-separated dependency names')
    .action(setDeps);

  cmd.action(showState);
}

function setDeps(name: string, options: { deps?: string }) {
  const bpDir = findBlueprintDir();
  const depList = options.deps ? options.deps.split(',').map((d) => d.trim()).filter(Boolean) : [];
  updateState(bpDir, (state) => {
    const change = state.changes.find((c) => c.name === name) || state.adhoc.find((c) => c.name === name);
    if (!change) {
      console.log(JSON.stringify({ error: `Change "${name}" not found in state.changes or state.adhoc.` }));
      return;
    }
    change.depends_on = depList;
  });
  console.log(JSON.stringify({ ok: true, name, depends_on: depList }));
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
    return { type, name: c.name, status: c.status, depends_on: c.depends_on || [], tasks };
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

  const lines: string[] = [];
  lines.push('# bp state');
  lines.push(`project: ${project.name}`);
  lines.push(`status: ${project.status}`);
  lines.push(`milestone: ${project.current_milestone ?? '-'}`);
  lines.push(`phase: ${project.current_phase ?? '-'}`);
  lines.push(`type: ${active_context.type}`);
  lines.push(`step: ${active_context.step}`);
  if (active_context.ref) lines.push(`ref: ${active_context.ref}`);

  const pending = withProgress(pendingChanges, 'change').concat(withProgress(pendingAdhoc, 'adhoc'));
  if (pending.length > 0) {
    lines.push('pending:');
    for (const p of pending) {
      const deps = p.depends_on && p.depends_on.length > 0 ? ` (needs: ${(p.depends_on as string[]).join(', ')})` : '';
      const tasks = p.tasks ? ` [${p.tasks.completed}/${p.tasks.total} tasks]` : '';
      lines.push(`  ${p.name} [${p.status}]${deps}${tasks}`);
    }
  }

  if (roadmap) {
    lines.push('roadmap:');
    for (const r of roadmap) {
      lines.push(`  ${r.id} ${r.active ? '*' : ''}`);
    }
  }

  console.log(lines.join('\n'));
}

function setMilestone(id: string) {
  const bpDir = findBlueprintDir();
  updateState(bpDir, (state) => {
    state.project.current_milestone = id;
    state.project.current_phase = null;
    state.project.status = 'milestone-active';
    state.active_context = { type: 'milestone', ref: `milestones/${id}`, step: 'active' };
  });
}

function setPhase(id: string) {
  const bpDir = findBlueprintDir();
  updateState(bpDir, (state) => {
    state.project.current_phase = id;
    state.active_context = { type: 'phase', ref: `milestones/${state.project.current_milestone}/phases/${id}`, step: 'start' };
  });
  console.log(JSON.stringify({ ok: true, phase: id }));
}

function setStep(step: string) {
  const bpDir = findBlueprintDir();
  const validProjectSteps = ['init', 'grill', 'ui-design', 'research', 'roadmap', 'milestone-active', 'milestone-shipped'];
  const validPhaseSteps = ['discuss', 'research', 'split'];
  const validChangeSteps = ['planning', 'applying', 'reviewing', 'archiving', 'archived'];
  const validSteps = [...validProjectSteps, ...validPhaseSteps, ...validChangeSteps];
  if (!validSteps.includes(step)) {
    console.log(JSON.stringify({ error: `Invalid step "${step}". Use \`bp state set-phase <id>\` to reset to a valid phase.` }));
    return;
  }
  updateState(bpDir, (state) => {
    state.active_context.step = step;
  });
  console.log(JSON.stringify({ ok: true, step }));
}
