// Every spec imports `test`/`expect` from here, not from '@playwright/test'
// (lint enforces it). An uncaught error or unhandled rejection in any page of
// the test's context fails the test: a handler that throws is a bug even when
// the assertion under test still passes. So does a Content-Security-Policy
// violation: the dev server sends the deployed CSP, and a blocked load is only
// a console line (the first deploy that applied it blocked every bundled icon).
import { test as base, expect } from '@playwright/test';

export { expect };
export type { Locator, Page } from '@playwright/test';

export const test = base.extend<{ allowPageErrors: readonly RegExp[]; failOnPageError: void }>({
  /** A spec that provokes an error on purpose names it: `test.use({ allowPageErrors: [/…/] })`. */
  allowPageErrors: [[], { option: true }],
  failOnPageError: [async ({ context, allowPageErrors }, use) => {
    const errors: string[] = [];
    await context.addInitScript(() => document.addEventListener('securitypolicyviolation', (event) => {
      console.error(`CSP violation: ${event.violatedDirective} blocked ${event.blockedURI.slice(0, 80)}`);
    }));
    context.on('console', (message) => { if (message.text().startsWith('CSP violation: ')) errors.push(message.text()); });
    context.on('weberror', (webError) => {
      const error = webError.error();
      if (!allowPageErrors.some((pattern) => pattern.test(error.message))) errors.push(error.stack ?? error.message);
    });
    await use();
    expect(errors, 'uncaught errors or CSP violations in the page').toEqual([]);
  }, { auto: true }],
});
