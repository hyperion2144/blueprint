import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { updateState } from '../core/state-file.js';
import { createAdhocChangeDir } from '../core/file-tree.js';
import { ARTIFACT_TEMPLATES } from '../templates/artifacts/index.js';
import { getProposalCommandTemplate } from '../templates/workflows/proposal.js';

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
  // Validate change name — prevent path traversal and shell injection
  const NAME_RE = /^[a-z0-9][a-z0-9._-]{0,62}$/;
  if (!NAME_RE.test(name)) {
    console.error(`✗ Invalid change name "${name}". Use 1-63 chars: a-z, 0-9, '.', '_', '-'.`);
    process.exit(1);
  }
  const date = new Date().toISOString().slice(0, 10);

  // Phase-scoped: creates under milestones/<mid>/phases/<pid>/changes/<name>/
  // Adhoc: creates under bp/changes/<name>/
  const isPhaseChange = options.milestone && options.phase;
  const changeDir = isPhaseChange
    ? join(bpDir, 'milestones', options.milestone!, 'phases', options.phase!, 'changes', name)
    : createAdhocChangeDir(bpDir, name);
  mkdirSync(changeDir, { recursive: true });
  const changeType = isPhaseChange ? 'change' : 'adhoc';

  const changeEntry = { name, status: 'pending' as const, depends_on: [] as string[] };

  if (options.intent) {
    // Write intent-only proposal so the agent knows what to do
    writeFileSync(join(changeDir, 'proposal.md'), `# Proposal: ${name}\n\nintent: ${options.intent}\nscope: TBD\nmust_haves:\n- TBD\n`, 'utf-8');
    console.log(`✓ Created change: ${changeDir} (with intent)`);
  } else {
    // No auto-generated artifacts — agent uses \`bp template <type>\` to create each file
    console.log(`✓ Created change: ${changeDir}`);
  }

  updateState(bpDir, (state) => {
    if (changeType === 'change') state.changes.push(changeEntry);
    else state.adhoc.push(changeEntry);
  });
  console.log('');
  console.log(`## Next step`);
  console.log(`Run \`bp continue change ${name}\` to start working on this change.`);
}
