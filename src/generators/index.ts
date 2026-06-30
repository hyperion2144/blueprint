/**
 * 生成器入口 — delegates to platform integrations.
 */

import { generateAllCommands } from '../integrations/omp/commands.js';
import { generateAllAgents } from '../integrations/omp/agents.js';
import { generateAllSkills } from '../integrations/omp/skills.js';
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
