import { join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import type { Command } from 'commander';
import { saveConfig } from '../core/config.js';
import type { ProjectConfig, SpecConfig } from '../types/index.js';
import { createSpecwfStructure, isInitialized } from '../core/file-tree.js';
import { saveState } from '../core/state-file.js';
import { runInitWizard } from '../prompts/init-wizard.js';
import { detectProjectInfo, runBrownfieldInit } from '../core/brownfield.js';
import { generateAll } from '../generators/index.js';
import { REQUIREMENTS_TEMPLATE } from '../templates/artifacts/index.js';
import { writeGeneratedFiles } from './_utils.js';
import { getSpecStack, detectSpecStack } from '../templates/spec-stacks/detect.js';
import type { SpecStackTemplate } from '../templates/spec-stacks/index.js';

export function register(program: Command): void {
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

  // Resolve spec stack — auto-detect for brownfield, use wizard choice for greenfield
  let stack: SpecStackTemplate;
  let specStackId: string;
  if (isBrownfield) {
    const info = detectProjectInfo(process.cwd());
    stack = detectSpecStack(info);
    specStackId = stack.id;
  } else {
    specStackId = wizard.specStack;
    stack = getSpecStack(specStackId);
  }

  createSpecwfStructure(bpDir);
  console.log('✓ bp/ directory structure created');

  const config: ProjectConfig = {
    version: 1,
    platform,
    profile,
    context: wizard.context + (isBrownfield ? ' [BROWNFIELD]' : ''),
    workflow: { commitDocs: wizard.commitDocs },
    review: {},
    change: {},
    git: { branching: 'none' as const, create_tag: true },
    release: { template: wizard.releaseTemplate as 'standard' | 'detailed' | 'minimal' },
    spec: { stack: specStackId } as SpecConfig,
    conventions: { inject: true },
    models: {},
  };
  saveConfig(bpDir, config);
  console.log('✓ project.yml created (profile: ' + profile + ', spec stack: ' + specStackId + ')');

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

  // Initialize spec directories with tech stack templates
  const specsDir = join(bpDir, 'specs');
  for (const domain of stack.domains) {
    const domainDir = join(specsDir, domain.name);
    mkdirSync(domainDir, { recursive: true });
    writeFileSync(join(domainDir, 'spec.md'), domain.specContent, 'utf-8');
  }
  console.log('✓ specs/ created (' + stack.domains.map((d) => d.name).join(', ') + ')');

  // Create conventions from stack template
  const convDir = join(bpDir, 'conventions');
  mkdirSync(convDir, { recursive: true });
  writeFileSync(join(convDir, 'coding-standards.md'), stack.conventions, 'utf-8');
  console.log('✓ conventions/coding-standards.md created');

  if (isBrownfield) {
    const info = detectProjectInfo(process.cwd());
    const domains = await runBrownfieldInit(process.cwd(), bpDir, info, stack);
    console.log("✓ Project structure scanned. Dispatch bp-codebase-mapper and bp-spec-bootstrapper sub-agents to complete analysis.");
  }

  console.log('Blueprint initialized.');

  // Generate platform files
  try {
    const files = generateAll(config);
    writeGeneratedFiles(files);
    console.log(`✓ Platform files generated (${files.length})`);
  } catch {
    console.log('⚠ Platform file generation failed. Run `bp update` to retry.');
  }
}
