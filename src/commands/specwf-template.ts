/**
 * specwf template <type> — 从模板文件生成产物
 */

import { join, dirname } from 'node:path';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, 'templates', 'artifacts');

/** 支持的模板类型 */
const TEMPLATE_TYPES = [
  'proposal', 'design', 'tasks',
  'context', 'research', 'summary',
  'verification', 'spec-review', 'quality-review', 'goal-review',
  'project.yml', 'state.md',
];

export function register(program: any): void {
  program
    .command('template <type>')
    .description('生成模板文件（proposal|design|tasks|context|research|summary|...）')
    .option('--name <name>', 'change 名称', 'my-change')
    .option('--dir <path>', '目标目录（默认 specwf/changes/<name>/）')
    .action(templateHandler);
}

function templateHandler(type: string, options: { name: string; dir?: string }) {
  if (!TEMPLATE_TYPES.includes(type)) {
    console.error(`未知模板类型: ${type}。可选: ${TEMPLATE_TYPES.join(', ')}`);
    process.exit(1);
  }

  const templatePath = join(TEMPLATES_DIR, type.endsWith('.yml') || type.endsWith('.md') ? type : `${type}.md`);
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
  let targetDir: string;
  let filename: string;

  if (options.dir) {
    targetDir = options.dir.startsWith('/') ? options.dir : join(process.cwd(), options.dir);
    filename = type;
  } else if (type === 'project.yml' || type === 'state.md') {
    targetDir = join(process.cwd(), 'specwf');
    filename = type;
  } else {
    targetDir = join(process.cwd(), 'specwf', 'changes', name);
    filename = type.endsWith('.yml') ? type : `${type}.md`;
  }

  mkdirSync(targetDir, { recursive: true });
  const fullPath = join(targetDir, filename);
  writeFileSync(fullPath, content, 'utf-8');

  console.log(`✓ 创建 ${fullPath}`);
}
