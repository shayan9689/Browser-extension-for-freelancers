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
// unzip (Linux/macOS CI), then bsdtar (Windows tar.exe), then PowerShell.
const extractors = [
  `unzip -q "${zipPath}" -d "${dest}"`,
  `tar -xf "${zipPath}" -C "${dest}"`,
  `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${dest}' -Force"`,
];
if (!extractors.some((cmd) => {
  try {
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})) {
  console.error('Could not extract zip (need unzip, tar or PowerShell)');
  process.exit(1);
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
  console.error('manifest.json is nested; it must be at the zip root');
  rmSync(dest, { recursive: true, force: true });
  process.exit(1);
}

// Keep in sync with docs/permissions.md; new permissions need a store justification.
const ALLOWED_PERMISSIONS = new Set(['storage', 'sidePanel', 'activeTab', 'scripting']);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const unexpected = [
  ...(manifest.permissions ?? []).filter((p) => !ALLOWED_PERMISSIONS.has(p)),
  ...(manifest.host_permissions ?? []),
  ...(manifest.optional_permissions ?? []),
];
if (unexpected.length) {
  console.error(`Unexpected permissions: ${unexpected.join(', ')}`);
  rmSync(dest, { recursive: true, force: true });
  process.exit(1);
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
