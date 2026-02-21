#!/usr/bin/env node
/**
 * بیلد zip برای لیارا (پلتفرم React).
 * فایل‌ها در یک پوشه موقت کپی می‌شوند و با دستور zip (سازگار با لینوکس) فشرده می‌شوند
 * تا استخراج روی سرور لیارا بدون خطا انجام شود (بدون بک‌اسلش یا کاراکتر خاص).
 */
import { existsSync, mkdirSync, rmSync, readdirSync, copyFileSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const EXCLUDE = new Set([
  'node_modules', 'dist', 'liara', '.git', '.env', '.env.liara', '.env.production',
  '.cursor', '404.bak.tmp', 'scripts', 'docs', 'fonts',
]);

// فقط .env.local در zip قرار می‌گیرد تا موقع بیلد روی لیارا Vite کلیدها را از آن بخواند
const ENV_LOCAL_ALLOWED = '.env.local';

const UNSAFE_NAME_RE = /[^a-zA-Z0-9._\-]/;

function shouldExclude(name) {
  if (name === ENV_LOCAL_ALLOWED) return false;
  if (EXCLUDE.has(name)) return true;
  if (name.startsWith('.env') || name.endsWith('.zip')) return true;
  if (name.startsWith('.')) return true;
  if (name.startsWith('supabase_') && name.endsWith('.sql')) return true;
  if (UNSAFE_NAME_RE.test(name)) return true;
  return false;
}

function isPathSafe(rel) {
  const normalized = rel.replace(/\\/g, '/');
  return !/[^a-zA-Z0-9._\-\/]/.test(normalized);
}

function* walkDir(dir, base = '') {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = join(base, e.name).replace(/\\/g, '/');
    if (shouldExclude(e.name)) continue;
    if (e.isDirectory()) {
      yield* walkDir(join(dir, e.name), rel);
    } else {
      yield { path: join(dir, e.name), rel };
    }
  }
}

const liaraDir = join(root, 'liara');
const ziproot = join(liaraDir, 'ziproot');
const zipPath = join(liaraDir, 'newray.zip');

if (existsSync(ziproot)) rmSync(ziproot, { recursive: true, force: true });
if (existsSync(zipPath)) rmSync(zipPath, { force: true });
mkdirSync(liaraDir, { recursive: true });
mkdirSync(ziproot, { recursive: true });

// کپی فایل‌ها به ziproot با همان ساختار (فقط مسیرهای امن)
let added = 0;
const skipped = [];
for (const { path: fullPath, rel } of walkDir(root)) {
  if (!isPathSafe(rel)) {
    skipped.push(rel);
    continue;
  }
  const destPath = join(ziproot, ...rel.split('/'));
  mkdirSync(dirname(destPath), { recursive: true });
  copyFileSync(fullPath, destPath);
  added++;
}

// liara.json
const liaraJson = join(ziproot, 'liara.json');
writeFileSync(liaraJson, JSON.stringify({ platform: 'react', build: { output: 'dist' } }, null, 2), 'utf8');
added++;

if (skipped.length) {
  writeFileSync(join(liaraDir, 'skipped-paths.txt'), skipped.join('\n'), 'utf8');
  console.warn(`\n⚠ ${skipped.length} فایل به‌خاطر نام ناامن حذف شد.`);
}

// ساخت zip با دستور zip (سازگار با لینوکس)
let zipOk = false;
const zipExes = [
  process.platform === 'win32' ? 'C:\\Program Files\\Git\\usr\\bin\\zip.exe' : null,
  'zip',
  'zip.exe',
].filter(Boolean);

for (const zipExe of zipExes) {
  const res = spawnSync(zipExe, ['-r', '-q', zipPath, '.'], {
    cwd: ziproot,
    shell: false,
    stdio: 'pipe',
  });
  if (res.status === 0 && existsSync(zipPath)) {
    zipOk = true;
    break;
  }
}

if (!zipOk) {
  // Fallback: استفاده از Node با archiver و نام‌های با اسلش جلو
  const archiver = (await import('archiver')).default;
  const { createWriteStream, readdirSync: rd, createReadStream } = await import('fs');
  if (existsSync(zipPath)) rmSync(zipPath);
  const output = createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  await new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    function addDir(dir, prefix) {
      const entries = rd(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = join(dir, e.name);
        const name = (prefix ? prefix + '/' : '') + e.name;
        if (e.isDirectory()) addDir(full, name);
        else archive.append(createReadStream(full), { name });
      }
    }
    addDir(ziproot, '');
    archive.finalize();
  });
  zipOk = existsSync(zipPath);
}

rmSync(ziproot, { recursive: true, force: true });

writeFileSync(join(liaraDir, 'build-report-yazl.txt'), [
  `Build: ${new Date().toISOString()}`,
  `Added: ${added}, Skipped: ${skipped.length}, Zip: ${zipOk ? 'OK' : 'FAIL'}`,
].join('\n'), 'utf8');

if (!zipOk) {
  console.error('\n❌ ساخت zip ناموفق بود. نصب Git for Windows یا zip برای ساخت zip سازگار با لیارا لازم است.');
  process.exit(1);
}

console.log('\n✅ liara/newray.zip آماده است (سورس برای پلتفرم React)');
console.log('   پلتفرم React را در لیارا انتخاب کرده و این فایل را آپلود کنید.');
