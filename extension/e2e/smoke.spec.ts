import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lightweight smoke: production build output exists.
 * Full extension-loaded Chromium e2e is documented in docs/ci.md and can be
 * expanded with --load-extension once CI browsers are provisioned.
 */
test('built extension output exists', async () => {
  const out = join(process.cwd(), '.output', 'chrome-mv3', 'manifest.json');
  expect(existsSync(out)).toBe(true);
});

test('demo fixture pages are reachable via file content', async () => {
  const fixture = join(process.cwd(), 'tests', 'fixtures', 'upwork-job.html');
  expect(existsSync(fixture)).toBe(true);
});
