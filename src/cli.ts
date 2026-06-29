import { program } from 'commander';
import { register as registerInit } from './commands/specwf-init.js';
import { register as registerUpdate } from './commands/specwf-update.js';
import { register as registerConfig } from './commands/specwf-config.js';
import { register as registerState } from './commands/specwf-state.js';
import { register as registerContext } from './commands/specwf-context.js';
import { register as registerContinue } from './commands/specwf-continue.js';
import { register as registerArchive } from './commands/specwf-archive.js';
import { register as registerList } from './commands/specwf-list.js';
import { register as registerTemplate } from './commands/specwf-template.js';
import { register as registerChange } from './commands/specwf-change.js';
const version = '0.1.0';

program
  .name('specwf')
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
program.parse();
