import { describe, it, expect } from 'vitest';
import { canTransition, getTransition, getNextSteps, getSlashCommand, isValidStatus } from '../../src/core/state-machine.js';

describe('canTransition', () => {
  it('合法转移返回 true', () => {
    expect(canTransition('initialized', 'grill')).toBe(true);
    expect(canTransition('grill', 'research')).toBe(true);
    expect(canTransition('change-planning', 'apply')).toBe(true);
  });

  it('非法转移返回 false', () => {
    expect(canTransition('initialized', 'apply')).toBe(false);
    expect(canTransition('change-archived', 'apply')).toBe(false);
  });
});

describe('getTransition', () => {
  it('返回转移详情', () => {
    const t = getTransition('initialized', 'grill');
    expect(t).not.toBeNull();
    expect(t!.to).toBe('grill');
    expect(t!.slashCommand).toBe('/bp:grill');
  });

  it('不存在时返回 null', () => {
    expect(getTransition('initialized', 'apply')).toBeNull();
  });
});

describe('getNextSteps', () => {
  it('返回从当前状态的所有可用转移', () => {
    const steps = getNextSteps('grill');
    expect(steps).toHaveLength(1);
    expect(steps[0].command).toBe('research');
  });

  it('change-verifying 有多个转移（archive/replan/reapply）', () => {
    const steps = getNextSteps('change-verifying');
    expect(steps.length).toBeGreaterThanOrEqual(2);
    const commands = steps.map((s) => s.command);
    expect(commands).toContain('archive');
    expect(commands).toContain('replan');
    expect(commands).toContain('reapply');
  });
});

describe('getSlashCommand', () => {
  it('返回 slash command', () => {
    expect(getSlashCommand('grill', 'research')).toBe('/bp:research');
  });

  it('无 slash command 时返回 null', () => {
    expect(getSlashCommand('researching', 'research-done')).toBeNull();
  });
});

describe('isValidStatus', () => {
  it('已知状态返回 true', () => {
    expect(isValidStatus('initialized')).toBe(true);
    expect(isValidStatus('change-planning')).toBe(true);
  });

  it('未知状态返回 false', () => {
    expect(isValidStatus('unknown')).toBe(false);
  });
});
