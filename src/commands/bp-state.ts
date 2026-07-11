/**
 * bp state — view/modify current state (compact JSON output)
 */

import { join, basename } from 'node:path';
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

  const allPending = state.changes.filter((c: any) => c.status !== 'archived');
  const allPendingAdhoc = state.adhoc.filter((c: any) => c.status !== 'archived');

  // Read milestone/phase status from roadmap if available
  let roadmap = null;
  try {
    const roadmapPath = join(bpDir, 'roadmap.md');
    if (existsSync(roadmapPath)) {
      const content = readFileSync(roadmapPath, 'utf-8');
      const msMatches = content.match(/^##\s+(Md-\d+[^\n]*)/gm);
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

  // Active changes (not pending, not archived)
  const active = allPending.filter((c: any) => c.status !== 'pending');
  const activeAdhoc = allPendingAdhoc.filter((c: any) => c.status !== 'pending');
  const activeList = [...active, ...activeAdhoc];
  if (activeList.length > 0) {
    lines.push('active:');
    const focusRef = active_context.ref ? basename(active_context.ref) : null;
    for (const c of activeList) {
      const marker = c.name === focusRef ? ' *' : '';
      const deps = c.depends_on?.length > 0 ? ` (needs: ${c.depends_on.join(', ')})` : '';
      lines.push(`  ${c.name} [${c.status}]${marker}${deps}`);
    }
  }

  // Not started changes (pending)
  const notStarted = allPending.filter((c: any) => c.status === 'pending');
  const notStartedAdhoc = allPendingAdhoc.filter((c: any) => c.status === 'pending');
  if (notStarted.length + notStartedAdhoc.length > 0) {
    lines.push('not_started:');
    for (const c of [...notStarted, ...notStartedAdhoc]) {
      const deps = c.depends_on?.length > 0 ? ` (needs: ${c.depends_on.join(', ')})` : '';
      lines.push(`  ${c.name}${deps}`);
    }
  }

  // Contexts (parallel changes)
  if (active_context.type === 'changes' && active_context.contexts) {
    lines.push('contexts:');
    for (const [name, entry] of Object.entries(active_context.contexts)) {
      lines.push(`  ${name} [${entry.step}]`);
    }
  }

  // Completed (archived but not released)
  if (state.completed && state.completed.length > 0) {
    lines.push('completed:');
    for (const c of state.completed) {
      const loc = c.type === 'change' ? ` (${c.milestone} / ${c.phase})` : ' (adhoc)';
      lines.push(`  ${c.name}${loc}`);
    }
  }

  // Released
  if (state.released && state.released.length > 0) {
    lines.push('released:');
    for (const r of state.released) {
      const loc = r.type === 'change' ? ` (${r.milestone} / ${r.phase})` : ' (adhoc)';
      lines.push(`  ${r.name}${loc}`);
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
