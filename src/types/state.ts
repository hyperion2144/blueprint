/**
 * bp 状态机类型
 * 对应 bp/state.md 的 frontmatter 结构
 */

import type { EntityType, ChangeStatus } from './project.js';

/** 单个 change 在状态机中的跟踪状态 */
export interface ChangeState {
  name: string;
  status: ChangeStatus | 'blocked';
  depends_on: string[];
  /** 执行模式: lightweight (编排者自实现) | full (派发子代理) */
  mode?: 'lightweight' | 'full';
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
  { from: 'initialized', command: 'grill', to: 'grill', slashCommand: '/bp:grill' },
  { from: 'grill', command: 'research', to: 'researching', slashCommand: '/bp:research', subagent: true },
  { from: 'researching', command: 'research-done', to: 'researched', slashCommand: '' },
  { from: 'researched', command: 'roadmap', to: 'roadmap-defined', slashCommand: '/bp:roadmap' },
  { from: 'roadmap-defined', command: 'discuss', to: 'phase-discuss', slashCommand: '/bp:discuss' },

  // Phase 路径（phase-start 是 setPhase 后的入口，discuss-start 引导输出指令）
  { from: 'phase-start', command: 'discuss-start', to: 'phase-discuss', slashCommand: '/bp:discuss' },
  { from: 'phase-discuss', command: 'research-phase', to: 'phase-research', slashCommand: '/bp:research-phase', subagent: true },
  { from: 'phase-research', command: 'split', to: 'phase-split', slashCommand: '/bp:split' },
  { from: 'phase-split', command: 'plan', to: 'change-planning', slashCommand: '/bp:plan', subagent: true },
  { from: 'change-planning', command: 'apply', to: 'change-applying', slashCommand: '/bp:apply', subagent: true },
  { from: 'change-applying', command: 'review', to: 'change-reviewing', slashCommand: '/bp:review', subagent: true },
  { from: 'change-reviewing', command: 'archive', to: 'change-archiving', slashCommand: '/bp:archive' },
  { from: 'change-archiving', command: 'archive-done', to: 'change-archived', slashCommand: '' },

  // 回环 (from reviewing — merged verify+archive step)
  { from: 'change-reviewing', command: 'replan', to: 'change-planning', slashCommand: '/bp:plan', subagent: true },
  { from: 'change-reviewing', command: 'reapply', to: 'change-applying', slashCommand: '/bp:apply', subagent: true },
  { from: 'change-reviewing', command: 'fix', to: 'change-applying', slashCommand: '/bp:apply', subagent: true },

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
];
