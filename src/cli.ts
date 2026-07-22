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
import { register as registerFinalize } from './commands/bp-finalize.js';
import { register as registerContinue } from './commands/bp-continue.js';
import { register as registerCommit } from './commands/bp-commit.js';
import { register as registerTemplate } from './commands/bp-template.js';
import { register as registerList } from './commands/bp-list.js';
import { register as registerDispatch } from './commands/bp-dispatch.js';
import { register as registerConfig } from './commands/bp-config.js';
import { register as registerContext } from './commands/bp-context.js';
import { register as registerState } from './commands/bp-state.js';
import { register as registerUpdate } from './commands/bp-update.js';
import { register as registerSchema } from './commands/bp-schema.js';
import { register as registerSpecRefresh } from './commands/bp-spec-refresh.js';
import { register as registerSplit } from './commands/bp-split.js';
import { register as registerMap } from './commands/bp-map.js';
import { register as registerStats } from './commands/bp-stats.js';
import { register as registerLock } from './commands/bp-lock.js';

import { register as registerUnarchive } from './commands/bp-unarchive.js';

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
registerFinalize(program);
registerCommit(program);
registerContinue(program);
registerTemplate(program);
registerList(program);
registerDispatch(program);
registerConfig(program);
registerUpdate(program);
registerSchema(program);
registerContext(program);
registerState(program);
registerSpecRefresh(program);
registerSplit(program);
registerUnarchive(program);
registerMap(program);
registerLock(program);

registerStats(program);
program.parse(process.argv);
