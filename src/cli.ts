import { program } from 'commander';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { register as registerInit } from './commands/bp-init.js';
import { register as registerUpdate } from './commands/bp-update.js';
import { register as registerConfig } from './commands/bp-config.js';
import { register as registerState } from './commands/bp-state.js';
import { register as registerContext } from './commands/bp-context.js';
import { register as registerContinue } from './commands/bp-continue.js';
import { register as registerArchive } from './commands/bp-archive.js';
import { register as registerList } from './commands/bp-list.js';
import { register as registerTemplate } from './commands/bp-template.js';
import { register as registerChange } from './commands/bp-change.js';
import { register as registerDispatch } from './commands/bp-dispatch.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const version: string = pkg.version;

program
  .name('bp')
  .description('规格驱动开发工作流 — spec-driven development workflow')
  .version(version);

// 注册所有子命令
registerInit(program);
registerUpdate(program);
registerConfig(program);
registerState(program);
registerContext(program);
registerContinue(program);
registerArchive(program);
registerList(program);
registerTemplate(program);
registerChange(program);
registerDispatch(program);

program.parse(process.argv);
