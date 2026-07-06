/**
 * agent/skills.ts — .agent/ skill file generator
 *
 * Generates .agent/skills/bp-<step>/SKILL.md files.
 * Uses [BP:xxx] parameter format instead of $1/$ARGUMENTS.
 */

import type { ProjectConfig } from '../../types/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../../templates/workflows/registry.js';

/** Map of $1/$ARGUMENTS → [BP:xxx] replacements */
const PARAM_MAP: Record<string, string> = {
  '$ARGUMENTS': '[BP:CHANGE_NAME]',
  '$1': '[BP:CHANGE_NAME]',
  '$2': '',
  '$3': '',
  '$4': '',
  '$5': '',
};

function resolveBody(step: string): string {
  const entry = WORKFLOW_REGISTRY[step as WorkflowStep];
  let body = entry ? entry.command().content : `# bp-${step}\n\nWorkflow guide.`;
  for (const [from, to] of Object.entries(PARAM_MAP)) {
    if (to) {
      body = body.replaceAll(from, to);
    }
  }
  return body;
}

function skillDescription(step: string): string {
  const map: Record<string, string> = {
    init: 'Initialize bp project structure and generate platform files',
    grill: 'Requirements exploration — detailed questioning until shared understanding',
    research: 'Project-level technical research',
    roadmap: 'Roadmap definition',
    milestone: 'Milestone management',
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

const STEPS = ['init', 'grill', 'research', 'roadmap', 'milestone', 'discuss', 'research-phase', 'split', 'adhoc', 'plan', 'apply', 'review', 'archive', 'proposal', 'ship', 'continue', 'audit', 'loop', 'config', 'commit', 'fix-plan', 'fix-apply'];

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
