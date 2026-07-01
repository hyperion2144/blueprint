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
    .option('--dir <path>', 'bp directory', 'bp')
    .option('--full', 'Full cycle: proposal only, goes through plan phase')
    .option('--intent <text>', 'one-line intent for the proposal')
    .option('--milestone <id>', 'milestone ID for phase-scoped change')
    .option('--phase <id>', 'phase ID for phase-scoped change')
    .action(newChange);

  cmd.action(() => {
    console.log('Usage: bp change new <name> [--full] [--intent <text>]');
  });
}

function newChange(name: string, options: { dir: string; full?: boolean; intent?: string; milestone?: string; phase?: string }) {
  const bpDir = join(process.cwd(), options.dir);
  const date = new Date().toISOString().slice(0, 10);

  // Phase-scoped: creates under milestones/<mid>/phases/<pid>/changes/<name>/
  // Adhoc: creates under bp/changes/<name>/
  const isPhaseChange = options.milestone && options.phase;
  const changeDir = isPhaseChange
    ? join(bpDir, 'milestones', options.milestone!, 'phases', options.phase!, 'changes', name)
    : createAdhocChangeDir(bpDir, name);
  mkdirSync(changeDir, { recursive: true });
  const changeType = isPhaseChange ? 'change' : 'adhoc';

  if (options.full) {
    // Full cycle: proposal only, goes through plan → apply → review → verify → archive
    const content = (ARTIFACT_TEMPLATES['proposal'] ?? `# Proposal: ${name}\n`)
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{date\}\}/g, date);
    writeFileSync(join(changeDir, 'proposal.md'), content, 'utf-8');

    console.log(`✓ Created change: ${changeDir} (full cycle)`);
    console.log(`  proposal.md — fill in, then plan → apply → review → verify → archive`);

    const changeEntry = { name, status: 'proposal' as const, depends_on: [] as string[] };
    updateState(bpDir, (state) => {
      if (changeType === 'change') state.changes.push(changeEntry);
      else state.adhoc.push(changeEntry);
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

    console.log(`✓ Created change: ${changeDir} (fast path)`);
    console.log(`  proposal.md — fill in intent, scope, must-haves`);
    console.log(`  design.md — fill in technical approach`);
    console.log(`  tasks.md — fill in implementation tasks`);
    console.log(`  specs/${name}/spec.md — fill in behavioral contracts`);

    const changeEntry = { name, status: 'planning' as const, depends_on: [] as string[] };
    updateState(bpDir, (state) => {
      if (changeType === 'change') state.changes.push(changeEntry);
      else state.adhoc.push(changeEntry);
    });
  }

  console.log(`✓ state.md updated`);
  console.log('');
  console.log(`→ Next: fill in artifacts, then \`bp continue change ${name}\``);
}
