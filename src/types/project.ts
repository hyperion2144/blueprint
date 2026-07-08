/**
 * bp 实体类型
 * 4 层实体：Project → Milestone → Phase → Change
 */

/** 实体类型 */
export type EntityType = 'project' | 'milestone' | 'phase' | 'change' | 'adhoc' | 'changes';

/** Change 状态 */
export type ChangeStatus =
  | 'pending'
  | 'proposal'
  | 'planning'
  | 'applying'
  | 'reviewing'
  | 'verifying'
  | 'archiving'
  | 'blocked'
  | 'archived';

/** Milestone — 版本周期（可发布增量） */
export interface Milestone {
  id: string;
  name: string;
  version: string;
  goal?: string;
  phases: Phase[];
}

/** Phase — 工作单元 */
export interface Phase {
  id: string;
  name: string;
  milestoneId: string;
  changes: Change[];
}

/** Change — 变更单元 */
export interface Change {
  name: string;
  /** change 类型：phase 归属 phase | adhoc 临时 change */
  type: 'phase' | 'adhoc';
  status: ChangeStatus;
  /** 依赖的其他 change 名（依赖图并行） */
  dependsOn: string[];
}

/** Change 元数据（.bp.yaml） */
export interface ChangeMeta {
  name: string;
  type: 'phase' | 'adhoc';
  phaseId?: string;
  milestoneId?: string;
  dependsOn: string[];
  createdAt: string;
}
