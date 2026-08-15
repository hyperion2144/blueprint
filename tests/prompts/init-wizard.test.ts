/**
 * init-wizard.test.ts — `bp init` interactive wizard cancel handling
 *
 * GIVEN the interactive wizard is running
 * WHEN the user presses Ctrl+C (the active prompt resolves the clack cancel symbol)
 * THEN the whole wizard aborts with WizardCancelledError
 *      AND no defaulted step values are applied
 *
 * Regression: Ctrl+C used to fall through to the next prompt with defaults,
 * eventually completing initialization with all-default values.
 */

import { describe, it, expect, vi } from 'vitest';
import { runInitWizard, WizardCancelledError } from '../../src/prompts/init-wizard.js';

// The clack cancel symbol is a plain unique symbol (clack-core CANCEL_SYMBOL).
const MOCK_CANCEL = Symbol('clack:cancel');

vi.mock('@clack/prompts', () => ({
  isCancel: (v: unknown) => v === MOCK_CANCEL,
  select: vi.fn(async () => MOCK_CANCEL),
  text: vi.fn(async () => MOCK_CANCEL),
  multiselect: vi.fn(async () => MOCK_CANCEL),
  confirm: vi.fn(async () => MOCK_CANCEL),
}));

describe('runInitWizard — Ctrl+C abort', () => {
  it('rejects with WizardCancelledError when the first prompt is cancelled', async () => {
    await expect(runInitWizard({ profile: 'standard', yes: false })).rejects.toThrow(
      WizardCancelledError,
    );
  });

  it('does not swallow the cancellation into defaulted config', async () => {
    try {
      await runInitWizard({ profile: 'standard', yes: false });
      expect.unreachable('wizard should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(WizardCancelledError);
    }
  });
});
