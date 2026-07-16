import { program } from 'commander';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { register as registerInit } from './commands/bp-init.js';
import { register as registerRoadmap } from './commands/bp-roadmap.js';
import { register as registerPropose } from './commands/bp-propose.js';
import { register as registerPlan } from './commands/bp-plan.js';
import { register as registerApply } from './commands/bp-apply.js';
import { register as registerReview } from './commands/bp-review.js';
import { register as registerArchive } from './commands/bp-archive.js';
import { register as registerContinue } from './commands/bp-continue.js';
import { register as registerTemplate } from './commands/bp-template.js';
import { register as registerList } from './commands/bp-list.js';
import { register as registerDispatch } from './commands/bp-dispatch.js';
import { register as registerConfig } from './commands/bp-config.js';
import { register as registerUpdate } from './commands/bp-update.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const version: string = pkg.version;

program
  .name('bp')
  .description('Blueprint — spec-driven development workflow for AI agents')
  .version(version);

registerInit(program);
registerRoadmap(program);
registerPropose(program);
registerPlan(program);
registerApply(program);
registerReview(program);
registerArchive(program);
registerContinue(program);
registerTemplate(program);
registerList(program);
registerDispatch(program);
registerConfig(program);
registerUpdate(program);

program.parse(process.argv);
