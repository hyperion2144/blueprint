/**
 * 生成器入口 — delegates to platform integrations.
 */

import { generateAllCommands } from '../integrations/omp/commands.js';
import { generateAllAgents } from '../integrations/omp/agents.js';
import { generateAllSkills } from '../integrations/omp/skills.js';
import { supportsCommands } from '../integrations/omp/index.js';
import type { ProjectConfig } from '../types/index.js';

export interface GeneratedFile {
  path: string;
  content: string;
}

/** 生成所有平台文件 — skip skills on platforms that support commands (redundant). */
export function generateAll(config: ProjectConfig): GeneratedFile[] {
  const files: GeneratedFile[] = [
    ...generateAllCommands(config),
    ...generateAllAgents(config),
  ];

  // Skills duplicate command content on command-capable platforms.
  if (!supportsCommands) {
    files.push(...generateAllSkills(config));
  }

  return files;
}
