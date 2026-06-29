import { join, dirname } from 'node:path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { updateState } from '../core/state-file.js';
import { createAdhocChangeDir } from '../core/file-tree.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function register(program: any): void {
  const cmd = program
    .command('change')
    .description('管理 change（创建/列表）');

  cmd
    .command('new <name>')
    .description('创建临时 change（与阶段无关）')
    .option('--dir <path>', 'specwf 目录', 'specwf')
    .action(newChange);

  cmd.action(() => {
    console.log('用法: specwf change new <name>');
  });
}

function newChange(name: string, options: { dir: string }) {
  const specwfDir = join(process.cwd(), options.dir);
  const changeDir = createAdhocChangeDir(specwfDir, name);
  console.log(`✓ 创建 change 目录: changes/${name}/`);

  const templatesDir = join(__dirname, 'templates', 'artifacts');
  const date = new Date().toISOString().slice(0, 10);

  for (const file of ['proposal.md', 'design.md', 'tasks.md']) {
    const tplPath = join(templatesDir, file);
    let content: string;
    if (existsSync(tplPath)) {
      content = readFileSync(tplPath, 'utf-8');
      content = content.replace(/\{\{name\}\}/g, name);
      content = content.replace(/\{\{date\}\}/g, date);
    } else {
      content = `# ${file.replace('.md', '')}: ${name}\n`;
    }
    writeFileSync(join(changeDir, file), content, 'utf-8');
  }
  console.log('✓ 创建模板文件: proposal.md, design.md, tasks.md');

  try {
    updateState(specwfDir, (state) => {
      state.adhoc.push({ name, status: 'proposal', depends_on: [] });
    });
    console.log('✓ state.md 已更新');
  } catch {
    console.log('⚠ state.md 更新失败（非关键）');
  }

  console.log('');
  console.log('→ 下一步: 完成 proposal 后，运行 specwf continue 推进');
}
