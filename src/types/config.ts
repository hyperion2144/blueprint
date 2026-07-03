/**
 * bp 配置类型
 * 对应 bp/project.yml 的结构
 */

/** 工作流严格度 */
export type Profile = 'lite' | 'standard' | 'strict';

/** 模型映射 — key 是子代理名（researcher/planner/executor/reviewer/phase-researcher/codebase-mapper/spec-bootstrapper） */
export type ModelMap = Record<string, string>;

/** 模型档次 — 影响 PROFILE_MODEL_MAP 的默认选择 */
export type ModelTier = 'budget' | 'balanced' | 'quality';

/** 子代理级别模型覆盖 — agentName → model */
export type AgentModelMap = Record<string, string>;

/** Tier → Profile 映射 */
export const TIER_TO_PROFILE: Record<ModelTier, Profile> = {
  budget: 'lite',
  balanced: 'standard',
  quality: 'strict',
};

/** 工作流 toggles（absent = enabled 模式，缺失默认 true） */
export interface WorkflowToggles {
  research?: boolean;
  plan_check?: boolean;
  tdd?: boolean;
  triple_review?: boolean;
  auto_advance?: boolean;
  spec_injection?: boolean;
  commitDocs?: boolean;
}

/** review 配置 */
export interface ReviewConfig {
  /** 门控：all-pass 全通过才进 verify | severity 按 severity 门控 | report-only 只报告 */
  gate?: 'all-pass' | 'severity' | 'report-only';
  /** 三重 review 是否并行 */
  parallel?: boolean;
}

/** change 配置 */
export interface ChangeConfig {
  /** 并行策略：serial 串行 | dependency-graph 依赖图并行 | pipeline 流水线 */
  parallel?: 'serial' | 'dependency-graph' | 'pipeline';
  /** OMP isolated 模式 */
  isolation?: boolean;
}

/** git 配置 */
export interface GitConfig {
  /** 分支策略：none 无 | phase 按 phase 分支 | milestone 按 milestone 分支 */
  branching?: 'none' | 'phase' | 'milestone';
  /** milestone ship 时打 tag */
  create_tag?: boolean;
}

/** release 配置 */
export interface ReleaseConfig {
  /** PR body 模板：standard(默认) | detailed | minimal */
  template?: 'standard' | 'detailed' | 'minimal';
}

/** spec 配置 */
export interface SpecConfig {
  /** 技术栈标识 */
  stack: string;
}

/** project.yml 完整配置 */
export interface ProjectConfig {
  version: number;
  platform: string[];
  profile: Profile;
  context: string;
  workflow: WorkflowToggles;
  review: ReviewConfig;
  change: ChangeConfig;
  git: GitConfig;
  release: ReleaseConfig;
  spec: SpecConfig;
  modelProfile?: ModelTier;
  agentModels?: AgentModelMap;
  conventions: {
    inject: boolean;
  };
  models: ModelMap;
}

/** profile → 子代理模型映射表（7 个 key 全列） */
export const PROFILE_MODEL_MAP: Record<Profile, ModelMap> = {
  lite: {
    researcher: 'pi/task',
    planner: 'pi/task',
    executor: 'pi/task',
    reviewer: 'pi/task',
    'phase-researcher': 'pi/task',
    'codebase-mapper': 'pi/task',
    'spec-bootstrapper': 'pi/task',
  },
  standard: {
    researcher: 'pi/task',
    planner: 'pi/plan',
    executor: 'pi/plan',
    reviewer: 'pi/plan',
    'phase-researcher': 'pi/task',
    'codebase-mapper': 'pi/task',
    'spec-bootstrapper': 'pi/task',
  },
  strict: {
    researcher: 'pi/default',
    planner: 'pi/slow',
    executor: 'pi/slow',
    reviewer: 'pi/slow',
    'phase-researcher': 'pi/default',
    'codebase-mapper': 'pi/default',
    'spec-bootstrapper': 'pi/default',
  },
};
