/**
 * bp context <step> — output state summary + file manifest as JSON
 */

import { join } from 'node:path';
import { loadState } from '../core/state-file.js';
import { generateContext } from '../core/spec-injector.js';

export function register(program: any): void {
  program
    .command('context <step>')
    .description('Output state + file manifest as JSON')
    .action(contextHandler);
}

function contextHandler(step: string) {
  const bpDir = join(process.cwd(), 'bp');
  const state = loadState(bpDir);
  const { project, active_context } = state;

  const pendingChanges = state.changes.filter((c: any) => c.status !== 'archived');
  const pendingAdhoc = state.adhoc.filter((c: any) => c.status !== 'archived');
  const result = generateContext(bpDir, step);

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
    pending: [
      ...pendingChanges.map((c: any) => ({ type: 'change', name: c.name, status: c.status })),
      ...pendingAdhoc.map((c: any) => ({ type: 'adhoc', name: c.name, status: c.status })),
    ],
    specs: result.specs,
    conventions: result.conventions,
    artifacts: result.changeArtifacts,
    requirements: result.requirements,
  };

  console.log(JSON.stringify(output));
}
