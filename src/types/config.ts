/**
 * bp 配置类型
 * 对应 bp/project.yml 的结构
 */

/** 工作流严格度 */
export type Profile = 'lite' | 'standard' | 'strict';

/** 模型角色 — 映射到 OMP modelRoles */
export type ModelRole =
  | 'research'
  | 'plan'
  | 'execute'
  | 'review'
  | 'verify'
  | 'archive';

/** 模型映射 — profile 自动填充默认，用户可按角色覆盖 */
export type ModelMap = Partial<Record<ModelRole, string>>;

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
  conventions: {
    inject: boolean;
  };
  models: ModelMap;
}

/** profile → 模型角色映射表 */
export const PROFILE_MODEL_MAP: Record<Profile, ModelMap> = {
  lite: {
    research: 'pi/default',
    plan: 'pi/default',
    execute: 'pi/default',
    review: 'pi/default',
    verify: 'pi/default',
    archive: 'pi/smol',
  },
  standard: {
    research: 'pi/slow',
    plan: 'pi/slow',
    execute: 'pi/default',
    review: 'pi/slow',
    verify: 'pi/default',
    archive: 'pi/default',
  },
  strict: {
    research: 'pi/slow',
    plan: 'pi/slow',
    execute: 'pi/slow',
    review: 'pi/slow',
    verify: 'pi/slow',
    archive: 'pi/default',
  },
};
