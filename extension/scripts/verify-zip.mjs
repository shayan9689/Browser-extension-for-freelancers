import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const outDir = join(process.cwd(), '.output');
const zips = existsSync(outDir)
  ? readdirSync(outDir).filter((f) => f.endsWith('.zip'))
  : [];

if (!zips.length) {
  console.error('No zip found in .output — run npm run zip first');
  process.exit(1);
}

const zipPath = join(outDir, zips[0]);
const size = statSync(zipPath).size;
if (size > 5 * 1024 * 1024) {
  console.error(`Zip too large: ${size} bytes`);
  process.exit(1);
}

const dest = mkdtempSync(join(tmpdir(), 'pp-zip-'));
try {
  execSync(`tar -xf "${zipPath}" -C "${dest}"`, { stdio: 'inherit' });
} catch {
  // Windows fallback: PowerShell Expand-Archive
  execSync(
    `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${dest}' -Force"`,
    { stdio: 'inherit' },
  );
}

const manifestPath = join(dest, 'manifest.json');
if (!existsSync(manifestPath)) {
  // sometimes zip nests one folder
  const kids = readdirSync(dest);
  const nested = kids.map((k) => join(dest, k, 'manifest.json')).find((p) => existsSync(p));
  if (!nested) {
    console.error('manifest.json not at zip root');
    rmSync(dest, { recursive: true, force: true });
    process.exit(1);
  }
  console.warn('manifest is nested; Chrome prefers root — check wxt zip settings');
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else {
      const text = readFileSync(p, 'utf8');
      if (text.includes('localhost') && !name.endsWith('.map')) {
        console.error(`Found localhost in ${p}`);
        rmSync(dest, { recursive: true, force: true });
        process.exit(1);
      }
    }
  }
}

try {
  walk(dest);
} catch {
  // binary files may fail utf8 — ignore
}

rmSync(dest, { recursive: true, force: true });
console.log('verify-zip OK:', zipPath);
