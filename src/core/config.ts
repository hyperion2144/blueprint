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
  profile: z.enum(['trivial', 'light', 'standard', 'critical']).default('standard'),
  workflow_version: z.string().default('2.1'),
  prompt_profile: z.enum(['lite', 'standard', 'full']).default('standard'),
  context: z.string().default(''),
  brownfield: z.boolean().default(false),
  commitDocs: z.boolean().default(false),
  rules: z.record(z.string(), z.array(z.string())).default({}),
  schema: z.string().default('spec-driven'),
  models: z.record(z.string(), z.string()).default({}),
  conventions: z.object({ inject: z.boolean() }).default({ inject: true }),
  git: z.object({ create_tag: z.boolean() }).default({ create_tag: true }),
  approvers: z.array(z.string()).default([]),
  budget: z.object({
    max_subagent_runs: z.number(),
    max_review_rounds: z.number(),
    max_wall_time_min: z.number(),
    estimated_token_cap: z.number(),
    no_progress_fuse_rounds: z.number(),
  }).default({
    max_subagent_runs: 5,
    max_review_rounds: 3,
    max_wall_time_min: 60,
    estimated_token_cap: 500000,
    no_progress_fuse_rounds: 2,
  }),
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
  // v2.1 backward compat: lite → light
  if (raw?.profile === 'lite') raw.profile = 'light';
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
/** v2.1 P2: Resolve models with level-based dynamic downgrade */
export function resolveModelsForLevel(config: ProjectConfig, level: Profile, round: number = 1): ModelMap {
  const base = resolveModels(config);
  // Trivial/Light -> downgrade all to fast
  if (level === 'trivial' || level === 'light') {
    return Object.fromEntries(Object.entries(base).map(([k]) => [k, 'pi/task']));
  }
  // Reviewer round 2+ with no blockers -> downgrade reviewer
  if (round >= 2) {
    return { ...base, reviewer: 'pi/task' };
  }
  return base;
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
    workflow_version: '2.1',
    brownfield: false,
    commitDocs: old.workflow?.commitDocs ?? false,
    rules: {},
    schema: 'spec-driven',
    models: old.models ?? {},
    conventions: { inject: old.conventions?.inject ?? true },
    git: { create_tag: old.git?.create_tag ?? true },
    prompt_profile: 'standard',
    approvers: [],
    budget: { max_subagent_runs: 5, max_review_rounds: 3, max_wall_time_min: 60, estimated_token_cap: 500000, no_progress_fuse_rounds: 2 },
  };

  saveConfig(bpDir, config);
  return config;
}
