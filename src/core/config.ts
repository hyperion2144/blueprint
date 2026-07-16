/**
 * v2 config - simplified project configuration
 * Loads/saves bp/config.yaml with Zod validation
 */

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import { readYamlDoc, writeYamlDoc } from '../parser/yaml.js';
import { PROFILE_MODEL_MAP } from '../types/config.js';
import type { ProjectConfig, Profile, ModelMap } from '../types/index.js';
import { Document } from 'yaml';

const CONFIG_FILE = 'config.yaml';

/** Zod schema for config.yaml */
export const ProjectConfigSchema = z.object({
  version: z.number().default(2),
  platform: z.array(z.string()).default(['omp']),
  profile: z.enum(['lite', 'standard']).default('standard'),
  context: z.string().default(''),
  brownfield: z.boolean().default(false),
  commitDocs: z.boolean().default(false),
  rules: z.record(z.string(), z.array(z.string())).default({}),
  schema: z.string().default('spec-driven'),
  models: z.record(z.string(), z.string()).default({}),
  conventions: z.object({ inject: z.boolean() }).default({ inject: true }),
  git: z.object({ create_tag: z.boolean() }).default({ create_tag: true }),
});

/** Get config file path */
export function configPath(bpDir: string): string {
  return join(bpDir, CONFIG_FILE);
}

/** Load config from bp/config.yaml */
export function loadConfig(bpDir: string): ProjectConfig {
  const path = configPath(bpDir);
  if (!existsSync(path)) {
    const oldPath = join(bpDir, 'project.yml');
    if (existsSync(oldPath)) {
      return migrateConfig(bpDir);
    }
    throw new Error(`Config not found: ${path}. Run 'bp init' first.`);
  }
  const doc = readYamlDoc(path);
  const raw = doc.toJS();
  return ProjectConfigSchema.parse(raw) as ProjectConfig;
}

/** Save config to bp/config.yaml */
export function saveConfig(bpDir: string, config: ProjectConfig): void {
  const path = configPath(bpDir);
  const doc = new Document({
    version: config.version,
    platform: config.platform,
    profile: config.profile,
    context: config.context,
    brownfield: config.brownfield,
    commitDocs: config.commitDocs,
    rules: config.rules,
    schema: config.schema,
    models: config.models,
    conventions: config.conventions,
    git: config.git,
  });
  writeYamlDoc(path, doc);
}

/** Update config in-place */
export function updateConfig(bpDir: string, updater: (config: ProjectConfig) => void): void {
  const config = loadConfig(bpDir);
  updater(config);
  saveConfig(bpDir, config);
}

/** Resolve model mapping: profile defaults + per-role overrides */
export function resolveModels(config: ProjectConfig): ModelMap {
  const profile = config.profile as Profile;
  return { ...PROFILE_MODEL_MAP[profile], ...config.models };
}

/** Migrate from v1 project.yml to v2 config.yaml */
function migrateConfig(bpDir: string): ProjectConfig {
  const oldPath = join(bpDir, 'project.yml');
  const doc = readYamlDoc(oldPath);
  const old = doc.toJS() as Record<string, any>;

  const config: ProjectConfig = {
    version: 2,
    platform: old.platform ?? ['omp'],
    profile: old.profile === 'strict' ? 'standard' : (old.profile ?? 'standard'),
    context: old.context ?? '',
    brownfield: false,
    commitDocs: old.workflow?.commitDocs ?? false,
    rules: {},
    schema: 'spec-driven',
    models: old.models ?? {},
    conventions: { inject: old.conventions?.inject ?? true },
    git: { create_tag: old.git?.create_tag ?? true },
  };

  saveConfig(bpDir, config);
  return config;
}
