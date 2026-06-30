import { join } from 'node:path';
import { saveConfig } from '../core/config.js';
import { createSpecwfStructure, isInitialized } from '../core/file-tree.js';
import { saveState } from '../core/state-file.js';
import { runInitWizard } from '../prompts/init-wizard.js';
import { detectProjectInfo, runBrownfieldInit } from '../core/brownfield.js';
import { generateAll } from '../generators/index.js';
import { writeGeneratedFiles } from './_utils.js';

export function register(program: any): void {
  program
    .command('init')
    .description('初始化 specwf 项目结构')
    .option('--dir <path>', '目标目录', '.')
    .option('--profile <profile>', '工作流严格度 (lite|standard|strict)', 'standard')
    .option('--brownfield', '存量项目模式（codebase mapping + spec bootstrap）')
    .option('--yes', '跳过确认使用默认值')
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
  const specwfDir = join(baseDir, 'specwf');

  if (isInitialized(specwfDir)) {
    console.error('specwf 已初始化。运行 `specwf update` 更新平台文件。');
    process.exit(1);
  }

  const wizard = await runInitWizard({ profile: options.profile, yes: options.yes });
  const profile = wizard.profile;
  const platform = wizard.platform;
  const isBrownfield = options.brownfield || wizard.brownfield;

  createSpecwfStructure(specwfDir);
  console.log('✓ 创建 specwf/ 目录结构');

  saveConfig(specwfDir, {
    version: 1,
    platform,
    profile,
    context: wizard.context,
    workflow: {},
    review: {},
    change: {},
    git: { branching: 'none' as const, create_tag: true },
    conventions: { inject: true },
    models: {},
  });
  console.log('✓ 创建 project.yml (profile: ' + profile + ')');

  saveState(specwfDir, {
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
  console.log('✓ 创建 state.md');

  if (isBrownfield) {
    const info = detectProjectInfo(process.cwd());
    const domains = await runBrownfieldInit(process.cwd(), specwfDir, info);
    console.log('✓ 存量项目 codebase mapping 完成 (' + domains.length + ' 个 spec 域)');
  }

  console.log('specwf 初始化完成。');

  // 自动生成平台文件
  try {
    const files = generateAll({ version: 1, platform, profile, context: wizard.context, workflow: {}, review: {}, change: {}, git: { branching: 'none', create_tag: true }, conventions: { inject: true }, models: {} });
    writeGeneratedFiles(files);
    console.log(`✓ 平台文件已生成 (${files.length} 个)`);
  } catch {
    console.log('⚠ 平台文件生成失败，可稍后运行 `specwf update` 重试');
  }
}
