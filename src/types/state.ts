/**
 * bp 状态机类型
 * 对应 bp/state.md 的 frontmatter 结构
 */

import type { EntityType, ChangeStatus } from './project.js';


/** 已归档的变更 */
export interface CompletedEntry {
  name: string;
  type: 'change' | 'adhoc';
  milestone: string | null;
  phase: string | null;
  archived_at: string;
  archive_dir: string;
}

/** 已发布的变更 */
export interface ReleasedEntry {
  name: string;
  type: 'change' | 'adhoc';
  milestone: string | null;
  phase: string | null;
  released_at: string;
}

/** state.md 的 frontmatter 结构 */
export interface StateFile {
  project: {
    name: string;
    status: string;
    current_milestone: string | null;
    current_phase: string | null;
  };
  active_context: {
    type: EntityType;
    ref: string | null;
    step: string;
    contexts?: Record<string, { type: 'change' | 'adhoc'; ref: string; step: string }>;
  };
  changes: ChangeState[];
  adhoc: ChangeState[];
  completed?: CompletedEntry[];
  released?: ReleasedEntry[];
}

/** 状态转移定义 */
export interface StateTransition {
  /** 当前状态 */
  from: string;
  /** 触发转移的命令 */
  command: string;
  /** 转移后的状态 */
  to: string;
  /** 对应的 slash command */
  slashCommand: string;
  /** 是否需要子代理 */
  subagent?: boolean;
}

/**
 * 状态转移表
 * 定义所有合法的状态转移
 */
export const STATE_TRANSITIONS: StateTransition[] = [
  // 项目层路径
  { from: 'initialized', command: 'grill', to: 'grill', slashCommand: '/bp:grill' },
  { from: 'grill', command: 'research', to: 'research', slashCommand: '/bp:research', subagent: true },
  { from: 'grill', command: 'design', to: 'ui-design', slashCommand: '/bp:design' },
  { from: 'ui-design', command: 'research', to: 'research', slashCommand: '/bp:research', subagent: true },
  { from: 'research', command: 'roadmap', to: 'roadmap', slashCommand: '/bp:roadmap' },
  { from: 'roadmap', command: 'discuss', to: 'phase-discuss', slashCommand: '/bp:discuss' },

  // Phase 路径（phase-start 是 setPhase 后的入口，discuss-start 引导输出指令）
  { from: 'phase-start', command: 'discuss-start', to: 'phase-discuss', slashCommand: '/bp:discuss' },
  { from: 'phase-discuss', command: 'research-phase', to: 'phase-research', slashCommand: '/bp:research-phase', subagent: true },
  { from: 'phase-research', command: 'split', to: 'phase-split', slashCommand: '/bp:split' },
  { from: 'phase-split', command: 'plan', to: 'change-planning', slashCommand: '/bp:plan', subagent: true },
  { from: 'change-planning', command: 'apply', to: 'change-applying', slashCommand: '/bp:apply', subagent: true },
  { from: 'change-applying', command: 'review', to: 'change-reviewing', slashCommand: '/bp:review', subagent: true },
  { from: 'change-reviewing', command: 'archive', to: 'change-archiving', slashCommand: '/bp:archive' },
  { from: 'change-archiving', command: 'archive-done', to: 'change-archived', slashCommand: '' },

  // 回环 — 从 review 进入独立修复阶段
  { from: 'change-reviewing', command: 'replan', to: 'change-fix-planning', slashCommand: '/bp:fix-plan', subagent: true },
  { from: 'change-reviewing', command: 'reapply', to: 'change-fix-applying', slashCommand: '/bp:fix-apply', subagent: true },
  // Change pending → proposal (首次推进激活)
  { from: 'change-pending', command: 'proposal', to: 'change-proposal', slashCommand: '' },
  { from: 'adhoc-pending', command: 'proposal', to: 'adhoc-proposal', slashCommand: '' },

  // 修复阶段间流转
  { from: 'change-fix-planning', command: 'apply-fix', to: 'change-fix-applying', slashCommand: '/bp:fix-apply', subagent: true },
  { from: 'change-fix-applying', command: 'review-fix', to: 'change-reviewing', slashCommand: '/bp:review', subagent: true },

  // Milestone 层（新里程碑 = 项目流程 - init）
  { from: 'milestone-active', command: 'grill', to: 'grill', slashCommand: '/bp:grill' },

  // Phase 间流转
  { from: 'change-archived', command: 'next-change', to: 'phase-ready', slashCommand: '' },

  // Phase change (not adhoc) — same as adhoc-proposal, routes to plan
  { from: 'change-proposal', command: 'plan', to: 'change-planning', slashCommand: '/bp:plan', subagent: true },
  // 临时 change
  { from: 'adhoc-proposal', command: 'plan', to: 'change-planning', slashCommand: '/bp:plan', subagent: true },
  { from: 'change-archived', command: 'adhoc-done', to: 'adhoc-archived', slashCommand: '' },
  { from: 'adhoc-archived', command: 'new-change', to: 'adhoc-proposal', slashCommand: '' },
  // Milestone 切换
  { from: 'milestone-shipped', command: 'new-milestone', to: 'milestone-active', slashCommand: '/bp:state set-milestone' },
];
