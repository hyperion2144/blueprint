/**
 * Workflow step registry — maps step names to template getters.
 *
 * v2: 8-step spec-driven workflow: init, roadmap, propose, plan, apply, check, archive, continue.
 */

import { getInitSkillTemplate, getInitCommandTemplate } from './init.js';
import { getRoadmapSkillTemplate, getRoadmapCommandTemplate } from './roadmap.js';
import { getProposeSkillTemplate, getProposeCommandTemplate } from './propose.js';
import { getPlanSkillTemplate, getPlanCommandTemplate } from './plan.js';
import { getApplySkillTemplate, getApplyCommandTemplate } from './apply.js';
import { getCheckSkillTemplate, getCheckCommandTemplate } from './check.js';
import { getArchiveSkillTemplate, getArchiveCommandTemplate } from './archive.js';
import { getContinueSkillTemplate, getContinueCommandTemplate } from './continue.js';
import { getFfSkillTemplate, getFfCommandTemplate } from './ff.js';
import { getLoopSkillTemplate, getLoopCommandTemplate } from './loop.js';
import { getRefactorSkillTemplate, getRefactorCommandTemplate } from './refactor.js';

import type { SkillTemplate, CommandTemplate } from '../types.js';

export interface WorkflowEntry {
  skill: () => SkillTemplate;
  command: () => CommandTemplate;
}

/** Registry mapping step name -> template getters */
export const WORKFLOW_REGISTRY = {
  init:     { skill: getInitSkillTemplate,     command: getInitCommandTemplate },
  roadmap:  { skill: getRoadmapSkillTemplate,  command: getRoadmapCommandTemplate },
  propose:  { skill: getProposeSkillTemplate,  command: getProposeCommandTemplate },
  plan:     { skill: getPlanSkillTemplate,     command: getPlanCommandTemplate },
  apply:    { skill: getApplySkillTemplate,    command: getApplyCommandTemplate },
  check:    { skill: getCheckSkillTemplate,    command: getCheckCommandTemplate },
  archive:  { skill: getArchiveSkillTemplate,  command: getArchiveCommandTemplate },
  continue: { skill: getContinueSkillTemplate, command: getContinueCommandTemplate },
  ff:       { skill: getFfSkillTemplate,       command: getFfCommandTemplate },
  loop:     { skill: getLoopSkillTemplate,     command: getLoopCommandTemplate },
  refactor: { skill: getRefactorSkillTemplate, command: getRefactorCommandTemplate },
} as const satisfies Record<string, WorkflowEntry>;

export type WorkflowStep = keyof typeof WORKFLOW_REGISTRY;
