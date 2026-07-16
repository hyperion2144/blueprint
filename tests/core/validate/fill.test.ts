import { describe, it, expect } from 'vitest';
import { parseAndValidate } from '../../../src/core/validate/index.js';

const validProposal = (content: string) =>
  `# Proposal: test\n\n## Intent\n\ntest\n\n## Deliverables\n\n- PR-1: foo\n  refs: FR-1\n  ${content}\n`;

describe('FILL validation — template placeholder detection', () => {
  it('detects {{name}} placeholder', () => {
    const result = parseAndValidate('proposal', validProposal('{{name}}. Source: FR-1 (bp/requirements.md)'));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'fill')).toBe(true);
  });

  it('detects {{x}} placeholder', () => {
    const result = parseAndValidate('proposal', validProposal('scope: {{x}}. Source: FR-1 (bp/requirements.md)'));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'fill')).toBe(true);
  });

  it('passes document without placeholders', () => {
    const result = parseAndValidate('proposal', validProposal('Implement the feature. Source: FR-1 (bp/requirements.md)'));
    expect(result.valid).toBe(true);
    const fillError = result.errors.find(e => e.field === 'fill');
    expect(fillError).toBeUndefined();
  });
});
