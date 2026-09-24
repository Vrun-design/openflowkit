// Every spec imports `test`/`expect` from here, not from '@playwright/test'
// (lint enforces it). An uncaught error or unhandled rejection in any page of
// the test's context fails the test: a handler that throws is a bug even when
// the assertion under test still passes.
import { test as base, expect } from '@playwright/test';

export { expect };
export type { Locator, Page } from '@playwright/test';

export const test = base.extend<{ allowPageErrors: readonly RegExp[]; failOnPageError: void }>({
  /** A spec that provokes an error on purpose names it: `test.use({ allowPageErrors: [/…/] })`. */
  allowPageErrors: [[], { option: true }],
  failOnPageError: [async ({ context, allowPageErrors }, use) => {
    const errors: string[] = [];
    context.on('weberror', (webError) => {
      const error = webError.error();
      if (!allowPageErrors.some((pattern) => pattern.test(error.message))) errors.push(error.stack ?? error.message);
    });
    await use();
    expect(errors, 'uncaught errors in the page').toEqual([]);
  }, { auto: true }],
});
