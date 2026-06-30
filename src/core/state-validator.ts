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
  // project/init → 必须有 requirements.md（grill 产出）
  {
    type: 'project', step: 'init',
    checks: [
      { path: 'requirements.md', description: 'requirements.md 不存在。请先执行 grill 步骤收集需求。' },
    ],
  },

  // milestone/active → 必须有 requirements.md
  {
    type: 'milestone', step: 'active',
    checks: [
      { path: 'requirements.md', description: 'requirements.md 不存在' },
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
  // phase/discuss → 必须有 context.md
  {
    type: 'phase', step: 'discuss',
    checks: [
      { path: 'roadmap.md', description: 'roadmap.md 不存在，请先拆分路线图' },
    ],
  },
  // phase/research → 必须有 research.md
  {
    type: 'phase', step: 'research',
    checks: [
      { path: 'roadmap.md', description: 'roadmap.md 不存在' },
    ],
  },
  // adhoc/proposal → proposal.md 不能是模板
  {
    type: 'adhoc', step: 'proposal',
    checks: [
      { path: 'changes/', description: 'change 的 proposal.md 为模板空壳，请填写后重试' },
    ],
  },
  // change/planning → design.md + tasks.md 不能是模板
  {
    type: 'change', step: 'planning',
    checks: [
      { path: 'changes/', description: 'design.md 或 tasks.md 为模板空壳，请填写后重试' },
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

function findChangeDir(specwfDir: string): string[] {
  const changesDir = join(specwfDir, 'changes');
  if (!existsSync(changesDir)) return [];
  try {
    return readdirSync(changesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

function checkExitCondition(specwfDir: string, check: ExitCheck): string | null {
  const fullPath = join(specwfDir, check.path);

  // 目录检查：在目录下找对应文件
  if (check.path.endsWith('/') || check.description.includes('的 ')) {
    // 检查 changes/ 目录下的所有 change
    const changes = findChangeDir(specwfDir);
    for (const change of changes) {
      for (const doc of ['proposal.md', 'design.md', 'tasks.md']) {
        const docPath = join(specwfDir, 'changes', change, doc);
        if (existsSync(docPath) && isTemplateFile(docPath)) {
          return `changes/${change}/${doc} 仍为模板空壳，请填写后重试`;
        }
      }
    }
    return null;
  }

  // 文件存在性检查
  if (!existsSync(fullPath)) {
    return check.description;
  }

  // 模板空壳检查（requirements.md, summary.md 等）
  if (isTemplateFile(fullPath)) {
    return check.description;
  }

  return null;
}

/**
 * 校验当前步骤的退出条件是否满足
 * @param contextType active_context.type
 * @param contextStep active_context.step
 * @param cwd 项目根目录
 */
export function validateStepAdvance(
  contextType: string,
  contextStep: string,
  cwd: string,
): ValidationResult {
  const specwfDir = join(cwd, 'specwf');
  const criteria = EXIT_CRITERIA.find(
    (c) => c.type === contextType && c.step === contextStep,
  );

  if (!criteria) {
    // 无显式退出条件 = 默认通过
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];
  for (const check of criteria.checks) {
    const error = checkExitCondition(specwfDir, check);
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
