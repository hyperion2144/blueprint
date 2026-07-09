/**
 * 状态转移前置校验
 * 在推进状态前，检查当前步骤的退出条件是否满足。
 * 退出条件 = 离开当前步骤前必须完成的文档/产物。
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface ExitCheck {
  path: string;
  description: string;
  checkMode?: 'file' | 'tasks_marked' | 'issues_all_marked' | 'tasks_format'; // default: 'file'
}

interface StepExitCriteria {
  type: string;
  step: string;
  checks: ExitCheck[];
}

/**
 * 每步的退出条件。
 * 当 CLI 尝试推进某步时，检查这些条件是否满足。
 */
const EXIT_CRITERIA: StepExitCriteria[] = [
  // project/roadmap-defined → must have roadmap + milestone directories
  {
    type: 'project', step: 'roadmap-defined',
    checks: [
      { path: 'roadmap.md', description: 'roadmap.md not found. Complete roadmap step first.' },
      { path: 'milestones/', description: 'No milestone directories found. Create bp/milestones/<id>/phases/<pid>/ for each milestone.' },
    ],
  },
  // milestone/active → must have requirements.md
  {
    type: 'milestone', step: 'active',
    checks: [
      { path: 'requirements.md', description: 'requirements.md not found' },
    ],
  },
  // project/grill → 必须有完整的 requirements.md
  {
    type: 'project', step: 'grill',
    checks: [
      { path: 'requirements.md', description: 'requirements.md 内容为模板，请填写后重试' },
    ],
  },
  // project/researched → 必须有调研产出
  {
    type: 'project', step: 'researched',
    checks: [
      { path: 'research/summary.md', description: 'research/summary.md 不存在，请先完成调研' },
    ],
  },
  // phase/discuss → must have context.md in phase dir
  {
    type: 'phase', step: 'discuss',
    checks: [
      { path: 'context.md', description: 'context.md not found or still a template. Complete the discuss step for this phase.' },
    ],
  },
  // phase/research → must have research.md in phase dir
  {
    type: 'phase', step: 'research',
    checks: [
      { path: 'research.md', description: 'research.md not found or still a template. Complete research-phase for this phase.' },
    ],
  },
  // phase/split → must have changes directories under the phase
  {
    type: 'phase', step: 'split',
    checks: [
      { path: 'changes/', description: 'No change directories found under this phase. Run split to create change directories.' },
    ],
  },
  // adhoc/proposal → proposal.md must be filled (not template)
  {
    type: 'adhoc', step: 'proposal',
    checks: [
      { path: 'proposal.md', description: 'proposal.md is still a template. Fill in intent, scope, and must-haves.' },
    ],
  },
  {
    type: 'change', step: 'proposal',
    checks: [
      { path: 'proposal.md', description: 'proposal.md is still a template. Fill in intent, scope, and must-haves.' },
    ],
  },
  // Change at planning — design.md + tasks.md must be properly filled
  {
    type: 'change', step: 'planning',
    checks: [
      { path: 'design.md', description: 'design.md is still a template. Complete the plan step.' },
      { path: 'tasks.md', description: 'tasks.md must have checkboxes, task names, and files. Complete the plan step.', checkMode: 'tasks_format' },
    ],
  },
  {
    type: 'adhoc', step: 'planning',
    checks: [
      { path: 'design.md', description: 'design.md is still a template. Complete the plan step.' },
      { path: 'tasks.md', description: 'tasks.md must have checkboxes, task names, and files. Complete the plan step.', checkMode: 'tasks_format' },
    ],
  },

  // Change at applying — all tasks in tasks.md/review-task.md must be marked [x] with commit hash
  {
    type: 'change', step: 'applying',
    checks: [
      { path: 'tasks.md', description: 'Not all tasks in tasks.md are marked [x] with <!-- commit: -->. Complete all tasks before advancing.', checkMode: 'tasks_marked' },
    ],
  },
  {
    type: 'adhoc', step: 'applying',
    checks: [
      { path: 'tasks.md', description: 'Not all tasks in tasks.md are marked [x] with <!-- commit: -->. Complete all tasks before advancing.', checkMode: 'tasks_marked' },
    ],
  },
  {
    type: 'change', step: 'fix-applying',
    checks: [
      { path: 'review-task.md', description: 'Not all fix tasks in review-task.md are marked [x] with <!-- commit: -->. Complete all fixes before advancing.', checkMode: 'tasks_marked' },
    ],
  },
  {
    type: 'adhoc', step: 'fix-applying',
    checks: [
      { path: 'review-task.md', description: 'Not all fix tasks in review-task.md are marked [x] with <!-- commit: -->. Complete all fixes before advancing.', checkMode: 'tasks_marked' },
    ],
  },

  // Change at reviewing — must have all three review files AND all Issues must be [x]
  {
    type: 'change', step: 'reviewing',
    checks: [
      { path: 'spec-review.md', description: 'spec-review.md not found. Complete the spec review first.', checkMode: 'issues_all_marked' },
      { path: 'quality-review.md', description: 'quality-review.md not found. Complete the quality review first.', checkMode: 'issues_all_marked' },
      { path: 'goal-review.md', description: 'goal-review.md not found. Complete the goal review first.', checkMode: 'issues_all_marked' },
    ],
  },
  {
    type: 'adhoc', step: 'reviewing',
    checks: [
      { path: 'spec-review.md', description: 'spec-review.md not found.', checkMode: 'issues_all_marked' },
      { path: 'quality-review.md', description: 'quality-review.md not found.', checkMode: 'issues_all_marked' },
      { path: 'goal-review.md', description: 'goal-review.md not found.', checkMode: 'issues_all_marked' },
    ],
  },

  // Change at archiving — must have change-summary.md and verification.md
  {
    type: 'change', step: 'archiving',
    checks: [
      { path: 'change-summary.md', description: 'change-summary.md not found. Run \`bp template change-summary\` to generate it.' },
      { path: 'verification.md', description: 'verification.md not found. Complete verification first.' },
    ],
  },
  {
    type: 'adhoc', step: 'archiving',
    checks: [
      { path: 'change-summary.md', description: 'change-summary.md not found. Run \`bp template change-summary\` to generate it.' },
      { path: 'verification.md', description: 'verification.md not found. Complete verification first.' },
    ],
  },
];

function isTemplateFile(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8');
    // Known template placeholders (proposal.md, design.md, etc.)
    if (['{{name}}', '{{date}}', '{{intent}}', '{{scope}}'].some((p) => content.includes(p))) return true;
    // Generic template placeholders (tasks.md: {{wave-1-theme}}, {{type}}, {{title}}, etc.)
    if (/\{\{[a-z][\w-]*\}\}/.test(content)) return true;
    return false;
  } catch {
    return false;
  }
}

function findChangeDir(bpDir: string, baseDir?: string): string[] {
  const changesDir = baseDir ? join(bpDir, baseDir, 'changes') : join(bpDir, 'changes');
  if (!existsSync(changesDir)) return [];
  try {
    return readdirSync(changesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

function checkExitCondition(bpDir: string, check: ExitCheck, resolvedPath?: string): string | null {
  const fullPath = resolvedPath ?? join(bpDir, check.path);

  // Directory check: path ends with / → verify the directory has content
  if (check.path.endsWith('/')) {
    if (!existsSync(fullPath)) return `${check.path} directory not found. ${check.description}`;

    if (check.path === 'changes/') {
      // fullPath is already the changes/ directory — read it directly
      let changeNames: string[] = [];
      try {
        changeNames = readdirSync(fullPath, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);
      } catch { /* not found */ }
      if (changeNames.length === 0) return `No change directories found under ${check.path}. ${check.description}`;
      for (const change of changeNames) {
        for (const doc of ['proposal.md', 'design.md', 'tasks.md']) {
          const docPath = join(fullPath, change, doc);
          if (existsSync(docPath) && isTemplateFile(docPath)) {
            return `changes/${change}/${doc} is still a template. Fill in before advancing.`;
          }
        }
      }
      return null;
    }

    // For other directories (e.g. milestones/): check they have subdirectories
    try {
      const entries = readdirSync(fullPath, { withFileTypes: true });
      const hasContent = entries.some((e) => e.isDirectory());
      if (!hasContent) return `${check.path} is empty. ${check.description}`;
    } catch {
      return `${check.path} not accessible. ${check.description}`;
    }
    return null;
  }

  // File existence check
  if (!existsSync(fullPath)) {
    return check.description;
  }

  // Template empty check (requirements.md, summary.md, etc.)
  if (isTemplateFile(fullPath)) {
    return check.description;
  }


  // Tasks marking check: all tasks and verification items must be [x]
  if (check.checkMode === 'tasks_marked') {
    if (!existsSync(fullPath)) {
      return `${check.path} not found. ${check.description}`;
    }
    const unmarked: string[] = [];
    const unhashed: string[] = [];
    try {
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      let inVerification = false;
      for (const line of lines) {
        // Track section: skip hash check for ## Implementation Verification
        if (line.startsWith('## ')) inVerification = line.includes('## Implementation Verification');

        // Match task/checkbox lines: "- [...] ..."
        const taskMatch = line.match(/^- \[([ x])\].*/);
        if (!taskMatch) continue;

        if (taskMatch[1] === ' ') {
          unmarked.push(line.trim());
        } else if (taskMatch[1] === 'x') {
          // [x] task must have <!-- commit: xxx --> annotation (skip for verification section)
          if (!inVerification && !line.includes('<!-- commit:')) {
            unhashed.push(line.trim());
          }
        }
      }
    } catch {
      return `Cannot read ${check.path}: ${check.description}`;
    }

    if (unmarked.length > 0) {
      return `Unmarked tasks remain (${unmarked.length}): ${unmarked[0]}${unmarked.length > 1 ? ` (+${unmarked.length - 1} more)` : ''}. ${check.description}`;
    }
    if (unhashed.length > 0) {
      return `Tasks marked [x] but missing commit hash (${unhashed.length}): ${unhashed[0]}${unhashed.length > 1 ? ` (+${unhashed.length - 1} more)` : ''}. Re-run \`bp commit\` with --task to record the hash.`;
    }
  }

  // Issues marking check: ## Issues section must have all items [x]
  if (check.checkMode === 'issues_all_marked') {
    if (!existsSync(fullPath)) {
      return `${check.path} not found. ${check.description}`;
    }
    const unmarked: string[] = [];
    try {
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      let inIssues = false;
      for (const line of lines) {
        // Track section: ## Issues marks the start, any other ## ends it
        if (line.startsWith('## ')) {
          inIssues = line.trim() === '## Issues';
          continue;
        }
        if (!inIssues) continue;

        // Match issue checkbox lines: "- [...] ..."
        const issueMatch = line.match(/^- \[([ x])\]/);
        if (!issueMatch) continue;

        if (issueMatch[1] === ' ') {
          unmarked.push(line.trim());
        }
      }
    } catch {
      return `Cannot read ${check.path}: ${check.description}`;
    }

    if (unmarked.length > 0) {
      return `Unmarked issues in ${check.path} (${unmarked.length}): ${unmarked[0]}${unmarked.length > 1 ? ` (+${unmarked.length - 1} more)` : ''}. Complete re-review or fix. ${check.description}`;
    }
  }

  // Tasks format check: must have checkboxes, task names, and files
  if (check.checkMode === 'tasks_format') {
    if (!existsSync(fullPath)) {
      return `${check.path} not found. ${check.description}`;
    }
    if (isTemplateFile(fullPath)) {
      return `${check.path} is still a template. Fill in all fields. ${check.description}`;
    }
    try {
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      let taskCount = 0;
      const missingFiles: string[] = [];
      let currentTask = '';
      let hasFiles = false;

      for (const line of lines) {
        // Match checkbox task line: "- [ ] task-name"
        const taskMatch = line.match(/^- \[( |x)\]\s*(.+)/);
        if (taskMatch) {
          if (currentTask && !hasFiles && taskCount > 0) {
            missingFiles.push(currentTask);
          }
          currentTask = taskMatch[2].trim();
          taskCount++;
          hasFiles = false;
          // Check if task name is just a placeholder
          if (!currentTask || currentTask.length === 0 || currentTask.startsWith('{{')) {
            return `${check.path}: task at line has no name. ${check.description}`;
          }
          continue;
        }
        // Track files field for the current task
        if (currentTask && line.match(/^\s*-\s+\*\*files\*\*:/)) {
          hasFiles = true;
        }
      }
      // Check last task
      if (currentTask && !hasFiles && taskCount > 0) {
        missingFiles.push(currentTask);
      }

      if (taskCount === 0) {
        return `${check.path}: no tasks found (missing \`- [ ]\` checkboxes). ${check.description}`;
      }
      if (missingFiles.length > 0) {
        return `${check.path}: tasks missing \`files\` field: ${missingFiles[0]}${missingFiles.length > 1 ? ` (+${missingFiles.length - 1} more)` : ''}. ${check.description}`;
      }
    } catch {
      return `Cannot read ${check.path}: ${check.description}`;
    }
  }
  return null;
}
/**
 * 校验当前步骤的退出条件是否满足
 * @param contextType active_context.type
 * @param contextStep active_context.step
 * @param ref active_context.ref（用于解析 phase/change 路径）
 * @param cwd 项目根目录
 */
export function validateStepAdvance(
  contextType: string,
  contextStep: string,
  ref: string | null,
  cwd: string,
): ValidationResult {
  const bpDir = join(cwd, 'bp');

  // Normalize step: strip type-prefix for lookup (phase-discuss → discuss, change-planning → planning)
  const normalizedStep = contextStep.startsWith(`${contextType}-`) ? contextStep.slice(contextType.length + 1) : contextStep;

  const criteria = EXIT_CRITERIA.find(
    (c) => c.type === contextType && c.step === normalizedStep,
  );

  if (!criteria) {
    // 无显式退出条件 = 默认通过
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];
  for (const check of criteria.checks) {
    // Phase context: prefix path with the phase ref (milestones/<mid>/phases/<pid>/)
    // Non-phase context: use bare path relative to bp/
    const resolvedPath = (ref && contextType !== 'project' && contextType !== 'milestone')
      ? join(bpDir, ref, check.path)
      : join(bpDir, check.path);
    const error = checkExitCondition(bpDir, check, resolvedPath);
    if (error) {
      errors.push(error);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 检查文件是否为模板空壳（含未填写的 {{placeholder}}）
 */
export function isTemplateContent(content: string): boolean {
  const placeholders = content.match(/\{\{[a-zA-Z_-]+\}\}/g);
  return (placeholders?.length ?? 0) > 3;
}
