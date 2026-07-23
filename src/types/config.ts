/**
 * v2 configuration types
 * Simplified from v1: profile (lite|standard), rules, schema, models
 */

/** Workflow profile */
/** Workflow profile —  four-level risk-based routing */
export type Profile = 'trivial' | 'light' | 'standard' | 'critical';

/** Model role -> model identifier mapping */
export type ModelMap = Record<string, string>;

/** Per-artifact rules injected into sub-agent prompts */
export type Rules = Record<string, string[]>;

/** Project configuration (bp/config.yaml) */
export interface ProjectConfig {
  version: number;
  platform: string[];
  /** Prompt detail level --: controls capability-compensation inclusion */
  prompt_profile: 'lite' | 'standard' | 'full';
  /** Workflow version -- controls process intensity */
  workflow_version: string;
  profile: Profile;
  context: string;
  /** Whether this is a brownfield project (existing codebase) */
  brownfield: boolean;
  /** Whether to auto-commit documentation files alongside code */
  commitDocs: boolean;
  rules: Rules;
  schema: string;
  models: ModelMap;
  conventions: { inject: boolean };
  git: { create_tag: boolean };
  /** Critical change approvers */
  approvers: string[];
  /** Per-change cost and convergence limits */
  budget: {
    max_subagent_runs: number;
    max_review_rounds: number;
    max_wall_time_min: number;
    estimated_token_cap: number;
    no_progress_fuse_rounds: number;
  };
}

/** Profile -> default model mapping */
export const PROFILE_MODEL_MAP: Record<Profile, ModelMap> = {
  trivial: {
    planner: 'pi/task',
    executor: 'pi/task',
    reviewer: 'pi/task',
    'codebase-scanner': 'pi/task',
  },
  light: {
    planner: 'pi/task',
    executor: 'pi/task',
    reviewer: 'pi/task',
    'codebase-scanner': 'pi/task',
  },
  standard: {
    planner: 'pi/plan',
    executor: 'pi/slow',
    reviewer: 'pi/task',
    'codebase-scanner': 'pi/task',
  },
  critical: {
    planner: 'pi/plan',
    executor: 'pi/slow',
    reviewer: 'pi/plan',
    'codebase-scanner': 'pi/task',
  },
};
