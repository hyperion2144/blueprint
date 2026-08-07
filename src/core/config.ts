/**
 * v2 config - simplified project configuration
 * Loads/saves bp/config.yaml with Zod validation
 */

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import { readYamlDoc, writeYamlDoc } from '../parser/yaml.js';
import { PROFILE_MODEL_MAP } from '../types/config.js';
import type { ProjectConfig, Profile, ModelMap, RefactorThresholds } from '../types/index.js';
import { Document } from 'yaml';

const CONFIG_FILE = 'config.yaml';

/** Default refactor thresholds — single source of truth for schema defaults and init/migration literals. */
export const DEFAULT_REFACTOR_THRESHOLDS: RefactorThresholds = {
  fragmentation: { exportsMax: 2, fileLinesMax: 50 },
  duplication: { similarityMin: 0.8, gramSize: 15 },
  flatness: { maxDepth: 1, subdirMin: 2 },
  lowReuse: { fanInMax: 1, exportsMin: 3 },
};

/** Fresh copy of the defaults — zod applies default values without re-parsing
 *  or cloning, so object defaults MUST NOT be a shared mutable reference. */
const freshRefactorThresholds = (): RefactorThresholds => structuredClone(DEFAULT_REFACTOR_THRESHOLDS);

/** Zod schema for the refactor.thresholds block (bp/config.yaml `refactor:`). */
const RefactorThresholdsSchema = z.object({
  fragmentation: z.object({
    exportsMax: z.number().int().positive().default(2),
    fileLinesMax: z.number().int().positive().default(50),
  }).default(() => structuredClone(DEFAULT_REFACTOR_THRESHOLDS.fragmentation)),
  duplication: z.object({
    similarityMin: z.number().min(0).max(1).default(0.8),
    gramSize: z.number().int().positive().default(15),
  }).default(() => structuredClone(DEFAULT_REFACTOR_THRESHOLDS.duplication)),
  flatness: z.object({
    maxDepth: z.number().int().nonnegative().default(1),
    subdirMin: z.number().int().nonnegative().default(2),
  }).default(() => structuredClone(DEFAULT_REFACTOR_THRESHOLDS.flatness)),
  lowReuse: z.object({
    fanInMax: z.number().int().nonnegative().default(1),
    exportsMin: z.number().int().positive().default(3),
  }).default(() => structuredClone(DEFAULT_REFACTOR_THRESHOLDS.lowReuse)),
}).default(freshRefactorThresholds);

/** Zod schema for config.yaml */
export const ProjectConfigSchema = z.object({
  version: z.number().default(2),
  platform: z.array(z.string()).default(['omp']),
  profile: z.enum(['trivial', 'light', 'standard', 'critical']).default('standard'),
  workflow_version: z.string().default('0.6.1'),
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
  refactor: z.object({ thresholds: RefactorThresholdsSchema }).default(() => ({ thresholds: freshRefactorThresholds() })),
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
  //  backward compat: lite → light
  if (raw?.profile === 'lite') raw.profile = 'light';
  return ProjectConfigSchema.parse(raw) as ProjectConfig;
}

/** Save config to bp/config.yaml.
 *  Passes the full config object to the YAML document so no fields are
 *  silently dropped on round-trip (load → mutate → save). */
export function saveConfig(bpDir: string, config: ProjectConfig): void {
  const path = configPath(bpDir);
  // Re-validate on save to catch any in-memory corruption from callers
  // that bypassed the typed surface.
  const validated = ProjectConfigSchema.parse(config) as ProjectConfig;
  const doc = new Document(validated);
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
/**: Resolve models with level-based dynamic downgrade.
 *  Per-role overrides in config.models are preserved even when downgrading. */
export function resolveModelsForLevel(config: ProjectConfig, level: Profile, round: number = 1): ModelMap {
  const base = resolveModels(config);
  // Trivial/Light -> downgrade all to fast, but preserve explicit user overrides
  if (level === 'trivial' || level === 'light') {
    return Object.fromEntries(
      Object.entries(base).map(([k]) => [k, config.models[k] ?? 'pi/task']),
    );
  }
  // Reviewer round 2+ with no blockers -> downgrade reviewer
  if (round >= 2) {
    return { ...base, reviewer: 'pi/task' };
  }
  return base;
}

/** Refactor analyzer thresholds — the schema defaults guarantee a populated value. */
export function getRefactorThresholds(config: ProjectConfig): RefactorThresholds {
  return config.refactor.thresholds;
}

/** Loose Zod schema for v1 project.yml — accepts the v1 shape, then we map
 *  fields explicitly. Prevents unvalidated casts from propagating malformed
 *  values into the v2 config. */
const V1ConfigSchema = z.object({
  platform: z.union([z.string(), z.array(z.string())]).optional(),
  profile: z.string().optional(),
  context: z.string().optional(),
  workflow: z.object({ commitDocs: z.boolean() }).partial().optional(),
  models: z.record(z.string(), z.string()).optional(),
  conventions: z.object({ inject: z.boolean() }).partial().optional(),
  git: z.object({ create_tag: z.boolean() }).partial().optional(),
}).partial();

/** Migrate from v1 project.yml to v2 config.yaml.
 *  Parses v1 input through Zod, then validates the migrated v2 config through
 *  ProjectConfigSchema before saving. */
function migrateConfig(bpDir: string): ProjectConfig {
  const oldPath = join(bpDir, 'project.yml');
  const doc = readYamlDoc(oldPath);
  const old = V1ConfigSchema.parse(doc.toJS() ?? {});
  // Normalize platform: v1 allowed a single string; v2 requires an array.
  const platformRaw = old.platform;
  const platform = Array.isArray(platformRaw)
    ? platformRaw
    : (typeof platformRaw === 'string' ? [platformRaw] : ['omp']);
  const profileRaw = old.profile;
  // v1 'strict' → v2 'standard'; v1 'lite' → v2 'light'
  const profile: Profile = profileRaw === 'strict'
    ? 'standard'
    : profileRaw === 'lite'
      ? 'light'
      : (profileRaw === 'trivial' || profileRaw === 'light' || profileRaw === 'standard' || profileRaw === 'critical')
        ? profileRaw
        : 'standard';
  const draft: ProjectConfig = {
    version: 2,
    platform,
    profile,
    context: old.context ?? '',
    workflow_version: '0.6.1',
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
    refactor: { thresholds: DEFAULT_REFACTOR_THRESHOLDS },
  };
  // Validate the migrated shape before persisting
  const validated = ProjectConfigSchema.parse(draft) as ProjectConfig;
  saveConfig(bpDir, validated);
  return validated;
}
