/**
 * v2 type exports - unified barrel
 */

export type {
  Profile,
  ModelMap,
  Rules,
  ProjectConfig,
} from './config.js';

export { PROFILE_MODEL_MAP } from './config.js';

export type {
  ChangeStage,
  ChangeMeta,
} from './project.js';
export type {
  ArtifactStatus,
  ChangeProgress,
  NextStep,
  ContinueResult,
} from './state.js';

export type {
  HeadingNode,
  ScenarioStepType,
  ScenarioStep,
  Scenario,
  Requirement,
  SpecSection,
  DeltaSpec,
  MergedSpec,
} from './spec.js';
