import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

// Lightweight fixture health check without full Vitest bootstrap of adapters via TS.
// Delegates to vitest for authoritative checks; this script fails loudly on empty fixtures.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixturesDir = join(root, 'tests', 'fixtures');
const files = readdirSync(fixturesDir).filter((f) => f.endsWith('.html'));

if (files.length === 0) {
  console.error('No fixtures found');
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const html = readFileSync(join(fixturesDir, file), 'utf8');
  const window = new Window();
  window.document.write(html);
  const text = (window.document.body?.textContent || '').trim();
  if (text.length < 10) {
    console.error(`FAIL ${file}: body text too short`);
    failed += 1;
  } else {
    console.log(`OK ${file} (${text.length} chars)`);
  }
}

if (failed) process.exit(1);

// Also run adapter vitest suite for authoritative selector assertions
import { spawnSync } from 'node:child_process';
const result = spawnSync('npx', ['vitest', 'run', 'src/content/adapters/extract.test.ts'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});
process.exit(result.status ?? 1);
