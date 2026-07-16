/**
 * bp propose <name> - create change folder and proposal.md
 */

import { join } from 'node:path';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { ARTIFACT_TEMPLATES } from '../templates/artifacts/index.js';
import { findBpDir } from './_utils.js';

export function register(program: any): void {
  program
    .command('propose <name>')
    .description('Create a change folder with proposal.md')
    .option('--phase <milestone>/<phase>', 'reference a roadmap phase')
    .option('--adhoc', 'mark as adhoc change (no phase reference)')
    .action(proposeHandler);
}

function proposeHandler(name: string, options: { phase?: string; adhoc?: boolean }) {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  const changeDir = join(bpDir, 'changes', name);
  if (existsSync(changeDir)) {
    console.error(`Change already exists: ${name}`);
    process.exit(1);
  }

  // Create change directory
  mkdirSync(changeDir, { recursive: true });

  // Generate proposal from template
  let content = ARTIFACT_TEMPLATES.proposal || '';
  content = content.replace(/\{\{name\}\}/g, name);
  content = content.replace(/\{\{date\}\}/g, new Date().toISOString().slice(0, 10));

  // Fill in roadmap reference if provided
  if (options.phase) {
    const [milestone, phase] = options.phase.split('/');
    content = content.replace(/\{\{milestone-name\}\}/g, milestone || '');
    content = content.replace(/\{\{phase-name\}\}/g, phase || '');
  } else if (options.adhoc) {
    // Remove roadmap reference section for adhoc changes
    content = content.replace(/## Roadmap Reference[\s\S]*$/m, '');
  }

  writeFileSync(join(changeDir, 'proposal.md'), content, 'utf-8');

  // Write change metadata
  const meta = {
    name,
    type: options.adhoc ? 'adhoc' : 'phase',
    milestone: options.phase?.split('/')[0],
    phase: options.phase?.split('/')[1],
    createdAt: new Date().toISOString(),
  };
  writeFileSync(join(changeDir, '.bp.yaml'), formatYaml(meta), 'utf-8');

  console.log(`✓ Created bp/changes/${name}/proposal.md`);
  console.log(`  Proposal is ready for planning.`);
  console.log(`\n  Next: bp plan ${name}`);
  console.log(`  (or: bp continue ${name})`);
}

function formatYaml(obj: Record<string, any>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    lines.push(`${key}: ${value}`);
  }
  return lines.join('\n') + '\n';
}
