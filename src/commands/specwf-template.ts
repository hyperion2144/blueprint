/**
 * specwf template <type> — 从模板文件生成产物
 */

import { join, dirname } from 'node:path';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, 'templates');

/** 支持的模板类型 => 模板文件相对路径 */
const TEMPLATE_TYPES: Record<string, string> = {
  // artifacts（现有）
  proposal: 'artifacts/proposal.md',
  design: 'artifacts/design.md',
  tasks: 'artifacts/tasks.md',
  context: 'artifacts/context.md',
  research: 'artifacts/research.md',
  summary: 'artifacts/summary.md',
  verification: 'artifacts/verification.md',
  'spec-review': 'artifacts/spec-review.md',
  'quality-review': 'artifacts/quality-review.md',
  'goal-review': 'artifacts/goal-review.md',
  'project.yml': 'artifacts/project.yml',
  'state.md': 'artifacts/state.md',
  // change summary（新增）
  'change-summary': 'artifacts/change-summary.md',
  // codebase（新增）
  'codebase-stack': 'codebase/stack.md',
  'codebase-architecture': 'codebase/architecture.md',
  'codebase-conventions': 'codebase/conventions.md',
  'codebase-pitfalls': 'codebase/pitfalls.md',
  // specs（新增）
  'spec-bootstrap': 'specs/spec.md',
};

export function register(program: any): void {
  program
    .command('template <type>')
    .description('生成模板文件（proposal|design|tasks|context|research|summary|...）')
    .option('--name <name>', 'change 名称', 'my-change')
    .option('--dir <path>', '目标目录（默认 specwf/changes/<name>/）')
    .action(templateHandler);
}

function templateHandler(type: string, options: { name: string; dir?: string }) {
  const templateFile = TEMPLATE_TYPES[type];
  if (!templateFile) {
    console.error(`未知模板类型: ${type}。可选: ${Object.keys(TEMPLATE_TYPES).join(', ')}`);
    process.exit(1);
  }

  const templatePath = join(TEMPLATES_DIR, templateFile);
  if (!existsSync(templatePath)) {
    console.error(`模板文件不存在: ${templatePath}`);
    process.exit(1);
  }

  let content = readFileSync(templatePath, 'utf-8');
  const name = options.name;
  const date = new Date().toISOString().slice(0, 10);

  // 替换占位符
  content = content.replace(/\{\{name\}\}/g, name);
  content = content.replace(/\{\{date\}\}/g, date);
  content = content.replace(/\{\{phase-name\}\}/g, name);
  content = content.replace(/\{\{change-name\}\}/g, name);

  // 确定目标目录和文件名
  // 从模板路径提取文件名（如 artifacts/change-summary.md → change-summary.md）
  const baseName = templateFile.split('/').pop() ?? `${type}.md`;
  let targetDir: string;
  let filename: string;

  if (options.dir) {
    targetDir = options.dir.startsWith('/') ? options.dir : join(process.cwd(), options.dir);
    filename = baseName;
  } else if (type === 'project.yml' || type === 'state.md') {
    targetDir = join(process.cwd(), 'specwf');
    filename = baseName;
  } else {
    targetDir = join(process.cwd(), 'specwf', 'changes', name);
    filename = baseName;
  }

  mkdirSync(targetDir, { recursive: true });
  const fullPath = join(targetDir, filename);
  writeFileSync(fullPath, content, 'utf-8');

  console.log(`✓ 创建 ${fullPath}`);
}
