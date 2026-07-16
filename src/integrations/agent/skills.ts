/**
 * bp — .agent skills generator
 * Generates .agent/skills/<step>/SKILL.md files from WORKFLOW_REGISTRY.
 */

import type { ProjectConfig } from '../../types/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../../templates/workflows/registry.js';

/**
 * $1 — meaning depends on step type, consistent with expandTemplateVars() primaryId inference:
 *   context is change -> [BP:CHANGE_NAME]
 *   no context        -> keep $1 as-is
 */
const STEP_PARAM: Record<string, string> = {
  propose: '[BP:CHANGE_NAME]',
  plan: '[BP:CHANGE_NAME]',
  apply: '[BP:CHANGE_NAME]',
  review: '[BP:CHANGE_NAME]',
  archive: '[BP:CHANGE_NAME]',
  continue: '[BP:CHANGE_NAME]',
  ff: '[BP:CHANGE_NAME]',
  loop: '[BP:CHANGE_NAME]',
};

function resolveBody(step: string): string {
  const entry = WORKFLOW_REGISTRY[step as WorkflowStep];
  let body = entry ? entry.command().content : `# bp-${step}\n\nWorkflow guide.`;

  // Map $ARGUMENTS/$1 to the appropriate [BP:xxx] placeholder
  const param = STEP_PARAM[step];
  body = body.replaceAll('$ARGUMENTS', param ?? '$ARGUMENTS');
  body = body.replaceAll('$1', param ?? '$1');
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
    ff: 'Fast-forward: auto-advance through all steps',
    loop: 'Autonomous loop: auto-advance with no user interaction',
  };
  return map[step] ?? '';
}

const STEPS = ['init', 'roadmap', 'propose', 'plan', 'apply', 'review', 'archive', 'continue', 'ff', 'loop'];

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
