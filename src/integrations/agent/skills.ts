/**
 * agent/skills.ts — .agent/ skill file generator
 *
 * Generates .agent/skills/bp-<step>/SKILL.md files.
 * Uses [BP:xxx] parameter format instead of $1/$ARGUMENTS.
 */

import type { ProjectConfig } from '../../types/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../../templates/workflows/registry.js';

/**
 * $1 含义取决于 step 类型，和 expandTemplateVars() 的 primaryId 推断一致：
 *   上下文为 milestone → [BP:MILESTONE_ID]
 *   上下文为 phase → [BP:PHASE_ID]
 *   上下文为 change → [BP:CHANGE_NAME]
 *   无上下文 (init/grill/…) → 保持 $1 原样
 */
const STEP_PARAM: Record<string, string> = {
  design: '',
  milestone: '[BP:MILESTONE_ID]',
  discuss: '[BP:PHASE_ID]',
  'research-phase': '[BP:PHASE_ID]',
  split: '[BP:PHASE_ID]',
  adhoc: '[BP:CHANGE_NAME]',
  proposal: '[BP:CHANGE_NAME]',
  plan: '[BP:CHANGE_NAME]',
  apply: '[BP:CHANGE_NAME]',
  review: '[BP:CHANGE_NAME]',
  archive: '[BP:CHANGE_NAME]',
  continue: '[BP:CHANGE_NAME]',
  audit: '[BP:CHANGE_NAME]',
  ship: '[BP:CHANGE_NAME]',
  'fix-plan': '[BP:CHANGE_NAME]',
  'fix-apply': '[BP:CHANGE_NAME]',
};

function resolveBody(step: string): string {
  const entry = WORKFLOW_REGISTRY[step as WorkflowStep];
  let body = entry ? entry.command().content : `# bp-${step}\n\nWorkflow guide.`;

  // $ARGUMENTS/$1 根据 step 类型映射到对应的 [BP:xxx]
  const param = STEP_PARAM[step];
  body = body.replaceAll('$ARGUMENTS', param ?? '$ARGUMENTS');
  body = body.replaceAll('$1', param ?? '$1');
  for (let i = 2; i <= 9; i++) body = body.replaceAll(`$${i}`, '');

  // [BP:xxx] 变量原样保留（agent 运行时替换）
  return body;
}

function skillDescription(step: string): string {
  const map: Record<string, string> = {
    init: 'Initialize bp project structure and generate platform files',
    grill: 'Requirements exploration — detailed questioning until shared understanding',
    research: 'Project-level technical research',
    roadmap: 'Roadmap definition',
    milestone: 'Milestone management',
    design: 'UI design direction',
    discuss: 'Phase discussion',
    'research-phase': 'Phase research',
    split: 'Change splitting',
    adhoc: 'Create adhoc change',
    plan: 'Change design',
    apply: 'Code implementation',
    review: 'Triple review',
    archive: 'Verify and archive',
    proposal: 'Fill change proposal',
    ship: 'Ship',
    continue: 'Auto-advance',
    audit: 'Human UAT verification',
    loop: 'Autonomous loop',
    config: 'Interactive configuration',
    commit: 'Commit changes',
    'fix-plan': 'Fix design',
    'fix-apply': 'Fix implementation',
  };
  return map[step] ?? '';
}

const STEPS = ['init', 'design', 'grill', 'research', 'roadmap', 'milestone', 'discuss', 'research-phase', 'split', 'adhoc', 'plan', 'apply', 'review', 'archive', 'proposal', 'ship', 'continue', 'audit', 'loop', 'config', 'commit', 'fix-plan', 'fix-apply'];

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
