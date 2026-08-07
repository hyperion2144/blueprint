/**
 * bp — .agent skills generator
 * Generates .agent/skills/<step>/SKILL.md files from WORKFLOW_REGISTRY.
 */

import type { ProjectConfig } from '../../types/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../../templates/workflows/registry.js';


function resolveBody(step: string): string {
  const entry = WORKFLOW_REGISTRY[step as WorkflowStep];
  // Use skill().instructions (matching OMP and Codex generators) — previously
  // this returned entry.command().content, which is the slash-command template
  // and produced command-flavored content in skill files.
  return entry ? entry.skill().instructions : `# bp-${step}\n\nWorkflow guide.`;
}

function skillDescription(step: string): string {
  const map: Record<string, string> = {
    init: 'Initialize bp project structure and generate platform files',
    roadmap: 'Roadmap definition',
    propose: 'Create a change folder with proposal.md',
    plan: 'Change design',
    apply: 'Code implementation',
    check: 'Triple check',
    archive: 'Verify and archive',
    continue: 'Check progress and suggest next step',
    ff: 'Fast-forward: auto-advance through all steps',
    loop: 'Autonomous loop: auto-advance with no user interaction',
    refactor: 'Run deterministic refactor analyzer and dispatch refactorer sub-agents per module',
  };
  return map[step] ?? '';
}

// Type as readonly WorkflowStep[] so a typo (e.g. 'continu') is caught at
// compile time — previously inferred as string[] and would silently produce
// a skill with no body.
const STEPS: readonly WorkflowStep[] = ['init', 'roadmap', 'propose', 'plan', 'apply', 'check', 'archive', 'continue', 'ff', 'loop', 'refactor'];

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
