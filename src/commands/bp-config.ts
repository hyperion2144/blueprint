/**
 * bp config — 查看/修改配置
 */

import { join } from 'node:path';
import { loadConfig, updateConfig } from '../core/config.js';

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

  updateConfig(bpDir, (config) => {
    // 支持用点分隔路径，如 "profile" 或 "workflow.research"
    const parts = key.split('.');
    let target: any = config;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) target[parts[i]] = {};
      target = target[parts[i]];
    }

    const lastKey = parts[parts.length - 1];

    // 尝试解析数值和布尔值
    const typedValue = parseTypedValue(value);
    target[lastKey] = typedValue;
  });

  console.log(`✓ ${key} = ${value}`);

  // Validate by re-reading with Zod schema
  try {
    loadConfig(bpDir);
  } catch (e) {
    console.error(`✗ Invalid config value: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

function parseTypedValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (value === 'null') return null;
  return value;
}

function findBlueprintDir(): string {
  return join(process.cwd(), 'bp');
}
