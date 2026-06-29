/**
 * 状态机引擎
 * 纯函数，无状态。复用 types/state.ts 的 STATE_TRANSITIONS。
 */

import { STATE_TRANSITIONS } from '../types/state.js';
import type { StateTransition } from '../types/index.js';

/** 验证状态转移是否合法 */
export function canTransition(from: string, command: string): boolean {
  return STATE_TRANSITIONS.some(
    (t) => t.from === from && t.command === command,
  );
}

/** 获取转移后的状态 */
export function getTransition(from: string, command: string): StateTransition | null {
  return (
    STATE_TRANSITIONS.find(
      (t) => t.from === from && t.command === command,
    ) ?? null
  );
}

/** 获取从当前状态可用的所有转移 */
export function getNextSteps(from: string): StateTransition[] {
  return STATE_TRANSITIONS.filter((t) => t.from === from);
}

/** 获取 slash command */
export function getSlashCommand(from: string, command: string): string | null {
  const transition = getTransition(from, command);
  return transition?.slashCommand || null;
}

/** 检查状态是否存在 */
export function isValidStatus(status: string): boolean {
  return STATE_TRANSITIONS.some((t) => t.from === status || t.to === status);
}
