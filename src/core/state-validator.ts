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
  // project/requirements-defined → 必须有完整的 requirements.md
  {
    type: 'project', step: 'requirements-defined',
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
  // phase/phase-research → must have research.md in phase dir
  {
    type: 'phase', step: 'phase-research',
    checks: [
      { path: 'research.md', description: 'research.md not found or still a template. Complete research-phase for this phase.' },
    ],
  },
  // phase/phase-split → must have changes directories under the phase
  {
    type: 'phase', step: 'phase-split',
    checks: [
      { path: 'changes/', description: 'No change directories found under this phase. Run split to create change directories.' },
    ],
  },
  // adhoc/proposal → proposal.md must be filled (not template)
  {
    type: 'adhoc', step: 'proposal',
    checks: [
      { path: 'changes/', description: 'proposal.md is still a template. Fill in intent, scope, and must-haves.' },
    ],
  },
  // change/change-planning → design.md + tasks.md must be filled
  {
    type: 'change', step: 'change-planning',
    checks: [
      { path: 'changes/', description: 'design.md or tasks.md is still a template. Complete the plan step.' },
    ],
  },
];

function isTemplateFile(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8');
    // 检测模板占位符: {{xxx}} 模式，超过 3 个即判定为模板空壳
    const placeholders = content.match(/\{\{[a-zA-Z_-]+\}\}/g);
    return (placeholders?.length ?? 0) > 3;
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
      // For changes/ directories: scan subdirs for template files
      const changeNames = findChangeDir(bpDir, resolvedPath);
      if (changeNames.length === 0) return `No change directories found under ${check.path}. ${check.description}`;
      const baseDir = resolvedPath ? join(bpDir, resolvedPath, 'changes') : join(bpDir, 'changes');
      for (const change of changeNames) {
        for (const doc of ['proposal.md', 'design.md', 'tasks.md']) {
          const docPath = join(baseDir, change, doc);
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
    const resolvedPath = (ref && contextType !== 'project' && contextType !== 'milestone' && !check.path.startsWith('changes/'))
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
