import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import { readYamlDoc, writeYamlDoc } from '../parser/yaml.js';
import { PROFILE_MODEL_MAP } from '../types/config.js';
import type { ProjectConfig, Profile, ModelMap } from '../types/index.js';
import { Document } from 'yaml';

const CONFIG_FILE = 'project.yml';

/** zod schema for project.yml */
const ProjectConfigSchema = z.object({
  version: z.number(),
  platform: z.array(z.string()),
  profile: z.enum(['lite', 'standard', 'strict']),
  context: z.string(),
  workflow: z.object({
    research: z.boolean().optional(),
    plan_check: z.boolean().optional(),
    tdd: z.boolean().optional(),
    triple_review: z.boolean().optional(),
    auto_advance: z.boolean().optional(),
    spec_injection: z.boolean().optional(),
  }).optional().default({}),
  review: z.object({
    gate: z.enum(['all-pass', 'severity', 'report-only']).optional(),
    parallel: z.boolean().optional(),
  }).optional().default({}),
  change: z.object({
    parallel: z.enum(['serial', 'dependency-graph', 'pipeline']).optional(),
    isolation: z.boolean().optional(),
  }).optional().default({}),
  git: z.object({
    branching: z.enum(['none', 'phase', 'milestone']).optional(),
    create_tag: z.boolean().optional(),
  }).optional().default({}),
  conventions: z.object({
    inject: z.boolean().optional().default(true),
  }).optional().default({ inject: true }),
  models: z.record(z.string(), z.string()).optional().default({}),
});

/** project.yml 路径 */
export function configPath(specwfDir: string): string {
  return join(specwfDir, CONFIG_FILE);
}

/** 读取并验证 project.yml */
export function loadConfig(specwfDir: string): ProjectConfig {
  const doc = readYamlDoc(configPath(specwfDir));
  const raw = doc.toJS();
  return ProjectConfigSchema.parse(raw) as ProjectConfig;
}

/** 写回 project.yml（保留注释） */
export function saveConfig(specwfDir: string, config: ProjectConfig): void {
  let doc: Document;
  if (existsSync(configPath(specwfDir))) {
    doc = readYamlDoc(configPath(specwfDir));
  } else {
    doc = new Document({});
  }
  doc.set('version', config.version);
  doc.set('platform', config.platform);
  doc.set('profile', config.profile);
  doc.set('context', config.context);
  if (config.workflow) doc.set('workflow', config.workflow);
  if (config.review) doc.set('review', config.review);
  if (config.change) doc.set('change', config.change);
  if (config.git) doc.set('git', config.git);
  if (config.conventions) doc.set('conventions', config.conventions);
  if (config.models) doc.set('models', config.models);
  writeYamlDoc(configPath(specwfDir), doc);
}

/** 修改单个字段并写回 */
export function updateConfig(specwfDir: string, updater: (config: ProjectConfig) => void): void {
  const config = loadConfig(specwfDir);
  updater(config);
  saveConfig(specwfDir, config);
}

/** 解析模型映射：profile 默认 + 用户覆盖 */
export function resolveModels(config: ProjectConfig): ModelMap {
  const profile = config.profile as Profile;
  const defaults = PROFILE_MODEL_MAP[profile];
  return { ...defaults, ...config.models };
}
