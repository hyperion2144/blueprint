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
  if (result.globalSpecs && result.globalSpecs.length > 0) {
    lines.push('globalSpecs:');
    for (const s of result.globalSpecs) lines.push(`  ${s.path}`);
  }
  if (result.conventions && result.conventions.length > 0) {
    lines.push('conventions:');
    for (const c of result.conventions) lines.push(`  ${c.path}`);
  }
  if (result.changeArtifacts && result.changeArtifacts.length > 0) {
    lines.push('artifacts:');
    for (const a of result.changeArtifacts) lines.push(`  ${typeof a === 'string' ? a : (a as any).path ?? a}`);
  }
  if (result.requirements && result.requirements.length > 0) {
    lines.push('requirements:');
    for (const r of result.requirements) {
      lines.push(typeof r === 'string' ? `  ${r}` : `  ${(r as unknown as Record<string, unknown>).path ?? r}`);
    }
  }

  // --- Directory paths ---
  lines.push('dirs:');
  const mid = project.current_milestone;
  const pid = project.current_phase;
  if (mid) {
    lines.push(`  milestone: bp/milestones/${mid}/`);
    if (pid) {
      lines.push(`  phase: bp/milestones/${mid}/phases/${pid}/`);
    }
  }
  lines.push(`  archive: bp/archive/`);
  if (mid && pid) {
    lines.push(`  archive_phase: bp/archive/${mid}/${pid}/`);
  }
  lines.push(`  specs: bp/specs/`);
  lines.push(`  conventions: bp/conventions/`);
  if (pendingChanges.length > 0 || pendingAdhoc.length > 0) {
    for (const c of pendingChanges) {
      const ref = mid && pid ? `bp/milestones/${mid}/phases/${pid}/changes/${c.name}/` : `bp/changes/${c.name}/`;
      lines.push(`  change_${c.name}: ${ref} [${c.status}]`);
    }
    for (const c of pendingAdhoc) {
      lines.push(`  adhoc_${c.name}: bp/changes/${c.name}/ [${c.status}]`);
    }
  }

  console.log(lines.join('\n'));
}
