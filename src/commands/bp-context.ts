/**
 * bp context <step> — output state summary + file manifest
 */

import { join } from 'node:path';
import { loadState } from '../core/state-file.js';
import { generateContext } from '../core/spec-injector.js';

export function register(program: any): void {
  program
    .command('context <step>')
    .description('Output state + file manifest')
    .action(contextHandler);
}

function contextHandler(step: string) {
  const bpDir = join(process.cwd(), 'bp');
  const state = loadState(bpDir);
  const { project, active_context } = state;

  const pendingChanges = state.changes.filter((c: any) => c.status !== 'archived');
  const pendingAdhoc = state.adhoc.filter((c: any) => c.status !== 'archived');
  const result = generateContext(bpDir, step);

  const lines: string[] = [];
  lines.push(`# bp context ${step}`);
  lines.push(`project: ${project.name}`);
  lines.push(`status: ${project.status}`);
  lines.push(`milestone: ${project.current_milestone ?? '-'}`);
  lines.push(`phase: ${project.current_phase ?? '-'}`);
  lines.push(`type: ${active_context.type}`);
  lines.push(`step: ${active_context.step}`);
  if (active_context.ref) lines.push(`ref: ${active_context.ref}`);

  if (pendingChanges.length > 0 || pendingAdhoc.length > 0) {
    lines.push('pending:');
    for (const c of pendingChanges) lines.push(`  ${c.name} [${c.status}]`);
    for (const c of pendingAdhoc) lines.push(`  ${c.name} [${c.status}] (adhoc)`);
  }

  if (result.specs && result.specs.length > 0) {
    lines.push('specs:');
    for (const s of result.specs) lines.push(`  ${s.path}`);
  }
  if (result.conventions && result.conventions.length > 0) {
    lines.push('conventions:');
    for (const c of result.conventions) lines.push(`  ${c.path}`);
  }
  if (result.changeArtifacts && result.changeArtifacts.length > 0) {
    lines.push('artifacts:');
    for (const a of result.changeArtifacts) lines.push(`  ${a}`);
  }
  if (result.requirements && result.requirements.length > 0) {
    lines.push('requirements:');
    for (const r of result.requirements) {
      lines.push(typeof r === 'string' ? `  ${r}` : `  ${(r as Record<string, unknown>).path ?? r}`);
    }
  }

  console.log(lines.join('\n'));
}
