import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { saveConfig } from '../core/config.js';
import { createSpecwfStructure, isInitialized } from '../core/file-tree.js';
import { saveState } from '../core/state-file.js';
import { runInitWizard } from '../prompts/init-wizard.js';
import { detectProjectInfo, runBrownfieldInit } from '../core/brownfield.js';
import { generateAll } from '../generators/index.js';
import { REQUIREMENTS_TEMPLATE } from '../templates/artifacts/index.js';
import { writeGeneratedFiles } from './_utils.js';

export function register(program: any): void {
  program
    .command('init')
    .description('Initialize blueprint project structure')
    .option('--dir <path>', 'target directory', '.')
    .option('--profile <profile>', 'workflow strictness (lite|standard|strict)', 'standard')
    .option('--brownfield', 'brownfield mode (codebase mapping + spec bootstrap)')
    .option('--yes', 'skip confirmation, use defaults')
    .action(initHandler);
}

async function initHandler(options: {
  dir: string;
  profile: string;
  brownfield: boolean;
  yes: boolean;
}) {
  const baseDir = options.dir.startsWith('/')
    ? options.dir
    : join(process.cwd(), options.dir);
  const bpDir = join(baseDir, 'bp');

  if (isInitialized(bpDir)) {
    console.log('Already initialized. Use `bp update` to refresh platform files.');
    process.exit(0);
  }

  const wizard = await runInitWizard({ profile: options.profile, yes: options.yes });
  const profile = wizard.profile;
  const platform = wizard.platform;
  const isBrownfield = options.brownfield || wizard.brownfield;

  createSpecwfStructure(bpDir);
  console.log('✓ bp/ directory structure created');

  saveConfig(bpDir, {
    version: 1,
    platform,
    profile,
    context: wizard.context,
    workflow: {},
    review: {},
    change: {},
    git: { branching: 'none' as const, create_tag: true },
    release: { template: 'standard' as const },
    conventions: { inject: true },
    models: {},
  });
  console.log('✓ project.yml created (profile: ' + profile + ')');

  saveState(bpDir, {
    project: {
      name: baseDir.split('/').pop() || 'project',
      status: 'initialized',
      current_milestone: null,
      current_phase: null,
    },
    active_context: {
      type: 'project',
      ref: null,
      step: 'init',
    },
    changes: [],
    adhoc: [],
  });
  console.log('✓ state.md created');

  // Create requirements.md template
  const reqContent = REQUIREMENTS_TEMPLATE.replace(/\{\{name\}\}/g, baseDir.split('/').pop() || 'project');
  writeFileSync(join(bpDir, 'requirements.md'), reqContent, 'utf-8');
  console.log('✓ requirements.md created (template)');

  if (isBrownfield) {
    const info = detectProjectInfo(process.cwd());
    const domains = await runBrownfieldInit(process.cwd(), bpDir, info);
    console.log("✓ Project structure scanned. Dispatch bp-codebase-mapper and bp-spec-bootstrapper sub-agents to complete analysis.");
  }

  console.log('Blueprint initialized.');

  // 自动生成平台文件
  try {
    const files = generateAll({ version: 1, platform, profile, context: wizard.context, workflow: {}, review: {}, change: {}, git: { branching: 'none', create_tag: true }, conventions: { inject: true }, models: {} });
    writeGeneratedFiles(files);
    console.log(`✓ Platform files generated (${files.length})`);
  } catch {
    console.log('⚠ Platform file generation failed. Run `bp update` to retry.');
  }
}
