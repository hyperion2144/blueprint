/**
 * v2 configuration types
 * Simplified from v1: profile (lite|standard), rules, schema, models
 */

/** Workflow profile */
export type Profile = 'lite' | 'standard';

/** Model role -> model identifier mapping */
export type ModelMap = Record<string, string>;

/** Per-artifact rules injected into sub-agent prompts */
export type Rules = Record<string, string[]>;

/** Project configuration (bp/config.yaml) */
export interface ProjectConfig {
  version: number;
  platform: string[];
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
}

/** Profile -> default model mapping */
export const PROFILE_MODEL_MAP: Record<Profile, ModelMap> = {
  lite: {
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
};
