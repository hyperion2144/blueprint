/**
 * bp config — 查看/修改配置
 */

import { findBlueprintDir } from './_utils.js';
import { loadConfig, updateConfig, ProjectConfigSchema } from '../core/config.js';
export function register(program: any): void {
  const cmd = program
    .command('config')
    .description('View/modify configuration');

  cmd
    .command('list')
    .description('View current configuration')
    .action(configList);

  cmd
    .command('set <key> <value>')
    .description('Modify configuration key')
    .action(configSet);

  // 默认行为：list
  cmd.action(configList);
}

function configList(options?: any, cmd?: any) {
  // 检查是否被子命令调用
  if (cmd?.parent?.args?.length > 1) return;

  const bpDir = findBlueprintDir();
  const config = loadConfig(bpDir);
  console.log(JSON.stringify(config, null, 2));
}

function configSet(key: string, value: string) {
  const bpDir = findBlueprintDir();

  // Read current config and apply change in memory first
  const currentConfig = loadConfig(bpDir);

  // Support dot-separated path e.g. "profile" or "workflow.research"
  const parts = key.split('.');
  let target: any = currentConfig;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!target[parts[i]]) target[parts[i]] = {};
    target = target[parts[i]];
  }
  const lastKey = parts[parts.length - 1];
  const typedValue = parseTypedValue(value);
  target[lastKey] = typedValue;

  // Validate in-memory before writing
  const result = ProjectConfigSchema.safeParse(currentConfig);
  if (!result.success) {
    const firstError = result.error.errors[0];
    console.error(`✗ Invalid config value for "${key}": ${firstError.message}`, '');
    process.exit(1);
  }

  // Validation passed — persist
  updateConfig(bpDir, (config) => {
    const parts2 = key.split('.');
    let t: any = config;
    for (let i = 0; i < parts2.length - 1; i++) {
      if (!t[parts2[i]]) t[parts2[i]] = {};
      t = t[parts2[i]];
    }
    t[parts2[parts2.length - 1]] = typedValue;
  });

  console.log(`✓ ${key} = ${value}`);
}

function parseTypedValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (value === 'null') return null;
  return value;
}

