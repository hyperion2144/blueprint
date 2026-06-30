import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { updateState } from '../core/state-file.js';
import { createAdhocChangeDir } from '../core/file-tree.js';
import { ARTIFACT_TEMPLATES } from '../templates/artifacts/index.js';

export function register(program: any): void {
  const cmd = program
    .command('change')
    .description('Manage changes (create/list)');

  cmd
    .command('new <name>')
    .description('Create a change. Default: fast path (all artifacts). Use --full for full plan cycle.')
    .option('--dir <path>', 'specwf directory', 'specwf')
    .option('--full', 'Full cycle: proposal only, goes through plan phase')
    .option('--intent <text>', 'one-line intent for the proposal')
    .action(newChange);

  cmd.action(() => {
    console.log('Usage: specwf change new <name> [--full] [--intent <text>]');
  });
}

function newChange(name: string, options: { dir: string; full?: boolean; intent?: string }) {
  const specwfDir = join(process.cwd(), options.dir);
  const changeDir = createAdhocChangeDir(specwfDir, name);
  const date = new Date().toISOString().slice(0, 10);

  if (options.full) {
    // Full cycle: proposal only, goes through plan → apply → review → verify → archive
    const content = (ARTIFACT_TEMPLATES['proposal'] ?? `# Proposal: ${name}\n`)
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{date\}\}/g, date);
    writeFileSync(join(changeDir, 'proposal.md'), content, 'utf-8');

    console.log(`✓ Created change: changes/${name}/ (full cycle)`);
    console.log(`  proposal.md — fill in, then plan → apply → review → verify → archive`);

    updateState(specwfDir, (state) => {
      state.adhoc.push({ name, status: 'proposal', depends_on: [] });
    });
  } else {
    // Fast path (default): all artifacts, skip plan, go directly to apply
    const templates: Record<string, string> = {
      'proposal.md': (ARTIFACT_TEMPLATES['proposal'] ?? `# Proposal: ${name}\n`)
        .replace(/\{\{name\}\}/g, name).replace(/\{\{date\}\}/g, date)
        .replace('{{intent}}', options.intent || '{{intent}}'),
      'design.md': (ARTIFACT_TEMPLATES['design'] ?? `# Design: ${name}\n`)
        .replace(/\{\{name\}\}/g, name).replace(/\{\{date\}\}/g, date),
      'tasks.md': (ARTIFACT_TEMPLATES['tasks'] ?? `# Tasks: ${name}\n`)
        .replace(/\{\{name\}\}/g, name).replace(/\{\{date\}\}/g, date),
    };

    for (const [filename, content] of Object.entries(templates)) {
      writeFileSync(join(changeDir, filename), content, 'utf-8');
    }

    // Create delta-spec template
    const specsDir = join(changeDir, 'specs', name);
    mkdirSync(specsDir, { recursive: true });
    writeFileSync(join(specsDir, 'spec.md'),
      `# ${name} — Delta Spec\n\n## ADDED Requirements\n\n### Requirement: <name>\n\nThe system SHALL <behavior>.\n\n#### Scenario: <name>\n- **GIVEN** <precondition>\n- **WHEN** <trigger>\n- **THEN** <expected outcome>\n`,
      'utf-8'
    );

    console.log(`✓ Created change: changes/${name}/ (fast path)`);
    console.log(`  proposal.md — fill in intent, scope, must-haves`);
    console.log(`  design.md — fill in technical approach`);
    console.log(`  tasks.md — fill in implementation tasks`);
    console.log(`  specs/${name}/spec.md — fill in behavioral contracts`);

    updateState(specwfDir, (state) => {
      state.adhoc.push({ name, status: 'planning', depends_on: [] });
    });
  }

  console.log(`✓ state.md updated`);
  console.log('');
  console.log(`→ Next: fill in artifacts, then \`specwf continue change ${name}\``);
}
