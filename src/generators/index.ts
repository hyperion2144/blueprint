/**
 * 生成器入口
 * 调度各生成器：commands + agents + skills
 */

import { generateAllCommands } from './omp-commands.js';
import { generateAllAgents } from './omp-agents.js';
import { generateAllSkills } from './skills.js';
import type { ProjectConfig } from '../types/index.js';

export interface GeneratedFile {
  path: string;
  content: string;
}

/** 生成所有平台文件 */
export function generateAll(config: ProjectConfig): GeneratedFile[] {
  return [
    ...generateAllCommands(config),
    ...generateAllAgents(config),
    ...generateAllSkills(config),
  ];
}
