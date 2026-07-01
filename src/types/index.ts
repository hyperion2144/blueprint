/**
 * bp 类型统一导出
 */

export type {
  Profile,
  ModelRole,
  ModelMap,
  WorkflowToggles,
  ReviewConfig,
  ChangeConfig,
  GitConfig,
  ProjectConfig,
} from './config.js';

export { PROFILE_MODEL_MAP } from './config.js';

export type {
  EntityType,
  ChangeStatus,
  Milestone,
  Phase,
  Change,
  ChangeMeta,
} from './project.js';

export type {
  ChangeState,
  StateFile,
  StateTransition,
} from './state.js';

export { STATE_TRANSITIONS } from './state.js';

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
