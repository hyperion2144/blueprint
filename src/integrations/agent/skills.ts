/**
 * agent/skills.ts — .agent/ skill file generator
 *
 * Generates .agent/skills/bp-<step>/SKILL.md files.
 * Uses [BP:xxx] parameter format instead of $1/$ARGUMENTS.
 */

import type { ProjectConfig } from '../../types/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../../templates/workflows/registry.js';

/**
 * $1 —— meaning depends on step type, consistent with expandTemplateVars() primaryId inference:
 *   context is milestone -> [BP:MILESTONE_ID]
 *   context is phase     -> [BP:PHASE_ID]
 *   context is change    -> [BP:CHANGE_NAME]
 *   no context           -> keep $1 as-is
 */
const STEP_PARAM: Record<string, string> = {
  propose: '[BP:CHANGE_NAME]',
  plan: '[BP:CHANGE_NAME]',
  apply: '[BP:CHANGE_NAME]',
  review: '[BP:CHANGE_NAME]',
  archive: '[BP:CHANGE_NAME]',
  continue: '[BP:CHANGE_NAME]',
};

function resolveBody(step: string): string {
  const entry = WORKFLOW_REGISTRY[step as WorkflowStep];
  let body = entry ? entry.command().content : `# bp-${step}\n\nWorkflow guide.`;

  // Map $ARGUMENTS/$1 to the appropriate [BP:xxx] placeholder
  const param = STEP_PARAM[step];
  body = body.replaceAll('$ARGUMENTS', param ?? '$ARGUMENTS');
  body = body.replaceAll('$1', param ?? '$1');
  for (let i = 2; i <= 9; i++) body = body.replaceAll(`$${i}`, '');

  // [BP:xxx] variables remain as-is (agent replaces at runtime)
  return body;
}

function skillDescription(step: string): string {
  const map: Record<string, string> = {
    init: 'Initialize bp project structure and generate platform files',
    roadmap: 'Roadmap definition',
    propose: 'Create a change folder with proposal.md',
    plan: 'Change design',
    apply: 'Code implementation',
    review: 'Triple review',
    archive: 'Verify and archive',
    continue: 'Check progress and suggest next step',
  };
  return map[step] ?? '';
}

const STEPS = ['init', 'roadmap', 'propose', 'plan', 'apply', 'review', 'archive', 'continue'];

export function generateAgentSkills(_config: ProjectConfig): { path: string; content: string }[] {
  return STEPS.map((step) => {
    const body = resolveBody(step);
    const content = [
      '---',
      `name: bp-${step}`,
      `description: ${skillDescription(step)}`,
      'hide: false',
      '---',
      '',
      body,
    ].join('\n');
    return {
      path: `.agent/skills/bp-${step}/SKILL.md`,
      content,
    };
  });
}
