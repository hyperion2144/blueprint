/**
 * specwf 状态机类型
 * 对应 specwf/state.md 的 frontmatter 结构
 */

import type { EntityType, ChangeStatus } from './project.js';

/** 单个 change 在状态机中的跟踪状态 */
export interface ChangeState {
  name: string;
  status: ChangeStatus | 'blocked';
  depends_on: string[];
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
  };
  /** 当前 phase 的所有 change 状态（依赖图并行） */
  changes: ChangeState[];
  /** 活跃的临时 change */
  adhoc: ChangeState[];
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
  { from: 'initialized', command: 'grill', to: 'requirements-defined', slashCommand: '/specwf:grill' },
  { from: 'requirements-defined', command: 'research', to: 'researching', slashCommand: '/specwf:research', subagent: true },
  { from: 'researching', command: 'research-done', to: 'researched', slashCommand: '' },
  { from: 'researched', command: 'roadmap', to: 'roadmap-defined', slashCommand: '/specwf:roadmap' },
  { from: 'roadmap-defined', command: 'discuss', to: 'phase-discuss', slashCommand: '/specwf:discuss' },

  // Phase 路径
  { from: 'phase-discuss', command: 'research-phase', to: 'phase-research', slashCommand: '/specwf:research-phase', subagent: true },
  { from: 'phase-research', command: 'split', to: 'phase-split', slashCommand: '/specwf:split' },
  { from: 'phase-split', command: 'plan', to: 'change-planning', slashCommand: '/specwf:plan', subagent: true },
  { from: 'change-planning', command: 'apply', to: 'change-applying', slashCommand: '/specwf:apply', subagent: true },
  { from: 'change-applying', command: 'review', to: 'change-reviewing', slashCommand: '/specwf:review', subagent: true },
  { from: 'change-reviewing', command: 'verify', to: 'change-verifying', slashCommand: '/specwf:verify', subagent: true },
  { from: 'change-verifying', command: 'archive', to: 'change-archiving', slashCommand: '/specwf:archive', subagent: true },
  { from: 'change-archiving', command: 'archive-done', to: 'change-archived', slashCommand: '' },

  // 回环
  { from: 'change-verifying', command: 'replan', to: 'change-planning', slashCommand: '/specwf:plan', subagent: true },
  { from: 'change-verifying', command: 'reapply', to: 'change-applying', slashCommand: '/specwf:apply', subagent: true },
  { from: 'change-reviewing', command: 'fix', to: 'change-applying', slashCommand: '/specwf:apply', subagent: true },

  // Ship
  { from: 'change-archived', command: 'ship-phase', to: 'phase-shipped', slashCommand: '/specwf:ship' },
  { from: 'phase-shipped', command: 'next-phase', to: 'phase-discuss', slashCommand: '/specwf:discuss' },
  { from: 'phase-shipped', command: 'ship-milestone', to: 'milestone-shipped', slashCommand: '/specwf:ship' },

  // 临时 change
  { from: 'adhoc-proposal', command: 'plan', to: 'change-planning', slashCommand: '/specwf:plan', subagent: true },
];
