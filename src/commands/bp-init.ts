/**
 * bp init — initialize blueprint project structure
 *
 * Creates bp/ directory skeleton and initial files:
 * - config.yaml (from template)
 * - roadmap.md (from template)
 - conventions/coding.md (empty)
 * - specs/ (domain stubs, greenfield only)
* - conventions/coding.md (empty)
 */

import { join, basename } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import type { Command } from 'commander';
import type { Profile, ProjectConfig } from '../types/index.js';
import { createBlueprintStructure, isInitialized } from '../core/file-tree.js';
import { runInitWizard } from '../prompts/init-wizard.js';
import { detectProjectInfo, runBrownfieldInit } from '../core/brownfield.js';
import { generateAll } from '../generators/index.js';
import { ARTIFACT_TEMPLATES } from '../templates/artifacts/index.js';
import { writeGeneratedFiles } from './_utils.js';
import { getSpecStack, detectSpecStack } from '../templates/spec-stacks/detect.js';
import type { SpecStackTemplate } from '../templates/spec-stacks/index.js';
import { HOOK_TEMPLATE } from './bp-update.js';
import { commitDocChanges } from '../core/git-doc.js';

export function register(program: Command): void {
  program
    .command('init')
    .description('Initialize blueprint project structure')
    .option('--dir <path>', 'target directory', '.')
    .option('--profile <profile>', 'workflow strictness (lite|standard)', 'standard')
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

  createBlueprintStructure(bpDir);
  console.log('✓ bp/ directory structure created');

  // Write config.yaml from template
  const projectName = basename(baseDir) || 'project';
  const date = new Date().toISOString().slice(0, 10);
  let configContent = ARTIFACT_TEMPLATES.config;
  configContent = configContent.replace(/\{\{project-name\}\}/g, projectName);
  configContent = configContent.replace(/\{\{date\}\}/g, date);
  configContent = configContent.replace(/\{\{tech-stack\}\}/g, wizard.context || 'TypeScript');
  configContent = configContent.replace(/\{\{test-framework\}\}/g, 'vitest');
  configContent = configContent.replace(/\{\{response-language\}\}/g, 'English');
  configContent = configContent.replace(/profile: standard/, `profile: ${profile}`);
  configContent = configContent.replace(/platform:[\s\S]*?(?=\n\n)/, `platform:\n${platform.map((p) => `  - ${p}`).join('\n')}`);
  configContent = configContent.replace(/brownfield: false/, `brownfield: ${isBrownfield}`);
  configContent = configContent.replace(/commitDocs: false/, `commitDocs: ${wizard.commitDocs}`);
  writeFileSync(join(bpDir, 'config.yaml'), configContent, 'utf-8');
  console.log('✓ config.yaml created');

  // Write roadmap.md from template
  let roadmapContent = ARTIFACT_TEMPLATES.roadmap;
  roadmapContent = roadmapContent.replace(/\{\{project-name\}\}/g, projectName);
  writeFileSync(join(bpDir, 'roadmap.md'), roadmapContent, 'utf-8');
  console.log('✓ roadmap.md created');

  // Write conventions/coding.md (empty template)
  writeFileSync(
    join(bpDir, 'conventions', 'coding.md'),
    '# Coding Conventions\n\n<!-- Add project-specific coding conventions here -->\n',
    'utf-8',
  );
  console.log('✓ conventions/coding.md created');

  // Initialize spec directories with tech stack templates (greenfield only)
  const specsDir = join(bpDir, 'specs');
  if (!isBrownfield) {
    for (const domain of stack.domains) {
      const domainDir = join(specsDir, domain.name);
      mkdirSync(domainDir, { recursive: true });
      writeFileSync(join(domainDir, 'spec.md'), domain.specContent, 'utf-8');
    }
  } else {
    mkdirSync(specsDir, { recursive: true });
  }
  console.log('✓ specs/ directory created');

  console.log('Blueprint initialized.');

  // Generate platform files
  try {
    const config: ProjectConfig = {
      version: 2,
      platform,
      profile: profile as Profile,
      brownfield: isBrownfield,
      commitDocs: wizard.commitDocs,
      context: wizard.context,
      rules: {},
      schema: 'spec-driven',
      models: {},
      conventions: { inject: true },
      git: { create_tag: true },
    };
    const files = generateAll(config);
    writeGeneratedFiles(files);
    console.log(`✓ Platform files generated (${files.length})`);
  } catch {
    console.log('⚠ Platform file generation failed. Run `bp update` to retry.');
  }

  // Deploy OMP hook (for OMP platform only)
  if (platform.includes('omp')) {
    try {
      const cwd = process.cwd();
      const hookDir = join(cwd, '.omp', 'hooks', 'pre');
      mkdirSync(hookDir, { recursive: true });
      writeFileSync(join(hookDir, 'bp.ts'), HOOK_TEMPLATE, 'utf-8');
      console.log('  ✓ .omp/hooks/pre/bp.ts');
    } catch {
      console.log('⚠ OMP hook deployment failed. Run `bp update` to retry.');
    }
  }

  // Auto-create .gitignore when commitDocs is false (bp/ files should not be tracked)
  if (!wizard.commitDocs) {
    const gitignorePath = join(baseDir, '.gitignore');
    const gitignoreEntries = ['bp/', '.omp/', '.claude/', '.agent/'];

    if (existsSync(gitignorePath)) {
      // Append missing entries
      const existing = readFileSync(gitignorePath, 'utf-8');
      const missing = gitignoreEntries.filter(e => !existing.includes(e));
      if (missing.length > 0) {
        writeFileSync(gitignorePath, existing + '\n' + missing.join('\n') + '\n', 'utf-8');
        console.log(`✓ .gitignore updated (added: ${missing.join(', ')})`);
      }
    } else {
      writeFileSync(gitignorePath, gitignoreEntries.join('\n') + '\n', 'utf-8');
      console.log('✓ .gitignore created (bp/, .omp/, .claude/, .agent/ ignored)');
    }
  }

  // Auto git init + commit if commitDocs enabled
  if (wizard.commitDocs) {
    commitDocChanges(bpDir, baseDir, 'init: blueprint project scaffolding', ['bp/']);
  }

  // Suggest next step
  console.log('');
  console.log('Next: /bp:continue');
}
