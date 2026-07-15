/**
 * Workflow step registry — maps step names to template getters.
 *
 * Direct imports (no barrel re-exports) to avoid TypeScript module resolution issues.
 */

import { getDesignSkillTemplate, getDesignCommandTemplate } from './design.js';
import { getInitSkillTemplate, getInitCommandTemplate } from './init';
import { getGrillSkillTemplate, getGrillCommandTemplate } from './grill';
import { getResearchSkillTemplate, getResearchCommandTemplate } from './research';
import { getRoadmapSkillTemplate, getRoadmapCommandTemplate } from './roadmap';
import { getMilestoneSkillTemplate, getMilestoneCommandTemplate } from './milestone';
import { getDiscussSkillTemplate, getDiscussCommandTemplate } from './discuss';
import { getResearchPhaseSkillTemplate, getResearchPhaseCommandTemplate } from './research-phase';
import { getSplitSkillTemplate, getSplitCommandTemplate } from './split';
import { getAdhocSkillTemplate, getAdhocCommandTemplate } from './adhoc';
import { getPlanSkillTemplate, getPlanCommandTemplate } from './plan';
import { getApplySkillTemplate, getApplyCommandTemplate } from './apply';
import { getReviewSkillTemplate, getReviewCommandTemplate } from './review';
import { getArchiveSkillTemplate, getArchiveCommandTemplate } from './archive';
import { getShipSkillTemplate, getShipCommandTemplate } from './ship';
import { getContinueSkillTemplate, getContinueCommandTemplate } from './continue';
import { getAuditSkillTemplate, getAuditCommandTemplate } from './audit';
import { getConfigSkillTemplate, getConfigCommandTemplate } from './config';
import { getLoopSkillTemplate, getLoopCommandTemplate } from './loop';
import { getProposalSkillTemplate, getProposalCommandTemplate } from './proposal';
import { getCommitSkillTemplate, getCommitCommandTemplate } from './commit';
import { getFixPlanSkillTemplate, getFixPlanCommandTemplate } from './fix-plan';
import { getFixApplySkillTemplate, getFixApplyCommandTemplate } from './fix-apply';
import { getUpgradeSkillTemplate, getUpgradeCommandTemplate } from './upgrade';
import { getAddPhaseSkillTemplate, getAddPhaseCommandTemplate } from './add-phase';

/** Registry mapping step name → template getters */
export const WORKFLOW_REGISTRY = {
  init:      { skill: getInitSkillTemplate,      command: getInitCommandTemplate },
  design:     { skill: getDesignSkillTemplate,     command: getDesignCommandTemplate },
  grill:     { skill: getGrillSkillTemplate,     command: getGrillCommandTemplate },
  research:  { skill: getResearchSkillTemplate,  command: getResearchCommandTemplate },
  roadmap:   { skill: getRoadmapSkillTemplate,   command: getRoadmapCommandTemplate },
  milestone: { skill: getMilestoneSkillTemplate, command: getMilestoneCommandTemplate },
  discuss:   { skill: getDiscussSkillTemplate,   command: getDiscussCommandTemplate },
  'research-phase': { skill: getResearchPhaseSkillTemplate, command: getResearchPhaseCommandTemplate },
  split:     { skill: getSplitSkillTemplate,     command: getSplitCommandTemplate },
  adhoc:     { skill: getAdhocSkillTemplate,     command: getAdhocCommandTemplate },
  plan:      { skill: getPlanSkillTemplate,      command: getPlanCommandTemplate },
  apply:     { skill: getApplySkillTemplate,     command: getApplyCommandTemplate },
  review:    { skill: getReviewSkillTemplate,    command: getReviewCommandTemplate },
  archive:   { skill: getArchiveSkillTemplate,   command: getArchiveCommandTemplate },
  ship:      { skill: getShipSkillTemplate,      command: getShipCommandTemplate },
  continue:  { skill: getContinueSkillTemplate,  command: getContinueCommandTemplate },
  audit:     { skill: getAuditSkillTemplate,     command: getAuditCommandTemplate },
  loop:      { skill: getLoopSkillTemplate,      command: getLoopCommandTemplate },
  config:    { skill: getConfigSkillTemplate,    command: getConfigCommandTemplate },
  proposal:  { skill: getProposalSkillTemplate,  command: getProposalCommandTemplate },
  commit:    { skill: getCommitSkillTemplate,    command: getCommitCommandTemplate },
  'fix-plan':  { skill: getFixPlanSkillTemplate,  command: getFixPlanCommandTemplate },
  'fix-apply': { skill: getFixApplySkillTemplate, command: getFixApplyCommandTemplate },
  upgrade:   { skill: getUpgradeSkillTemplate,   command: getUpgradeCommandTemplate },
  'add-phase': { skill: getAddPhaseSkillTemplate, command: getAddPhaseCommandTemplate },
} as const;

export type WorkflowStep = keyof typeof WORKFLOW_REGISTRY;

