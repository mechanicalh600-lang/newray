#!/usr/bin/env node
/**
 * بیلد برای لیارا پلتفرم React: خروجی liara/newray-react.zip
 * شامل سورس کد (بدون node_modules) برای استقرار روی پلتفرم React
 */

import { existsSync, mkdirSync, rmSync, createWriteStream, readdirSync, writeFileSync, appendFileSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// #region agent log
const DBG = (msg, data, hyp) => { try { appendFileSync(join(root, '.cursor', 'debug.log'), JSON.stringify({ location: 'build-liara-react.js', message: msg, data: data || {}, hypothesisId: hyp || 'H1', timestamp: Date.now() }) + '\n'); } catch (_) {} };
// #endregion

const EXCLUDE = new Set([
  'node_modules',
  'dist',
  'liara',
  '.git',
  '.env',
  '.env.local',
  '.env.production',
  '.cursor',
  '404.bak.tmp',
  '*.zip',
]);

function shouldExclude(name) {
  if (EXCLUDE.has(name)) return true;
  if (name.startsWith('.env')) return true;
  if (name.endsWith('.zip')) return true;
  return false;
}

/** نام مسیر را به فرمتی فقط ASCII ایمن تبدیل می‌کند (whitelist: a-zA-Z0-9._/-) */
function toSafeArchiveName(rel) {
  let s = rel.replace(/\\/g, '/');
  s = s.replace(/[^a-zA-Z0-9._\-\/]/g, '-');
  s = s.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return s || '_';
}

function* walkDir(dir, base = '') {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = join(base, e.name);
    if (shouldExclude(e.name)) continue;
    if (e.isDirectory()) {
      yield* walkDir(join(dir, e.name), rel);
    } else {
      yield { path: join(dir, e.name), rel };
    }
  }
}

const liaraDir = join(root, 'liara');
if (existsSync(liaraDir)) rmSync(liaraDir, { recursive: true });
mkdirSync(liaraDir, { recursive: true });

const zipPath = join(liaraDir, 'newray.zip');
const output = createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

await new Promise((resolve, reject) => {
  output.on('close', resolve);
  archive.on('error', reject);
  archive.pipe(output);

  const SAFE_RE = /^[a-zA-Z0-9._\-\/]+$/;
  let renamed = 0;
  const allNames = [];
  for (const { path: fullPath, rel } of walkDir(root)) {
    const safe = toSafeArchiveName(rel);
    allNames.push(safe);
    if (!SAFE_RE.test(safe)) DBG('Unsafe name in archive', { safe, rel }, 'H1');
    if (safe !== rel.replace(/\\/g, '/')) {
      renamed++;
      if (renamed <= 3) console.warn('⚠ سانیتایز:', rel, '->', safe);
    }
    archive.file(fullPath, { name: safe });
  }
  DBG('Pre-archive summary', { total: allNames.length, renamed, unsafeCount: allNames.filter(n => !SAFE_RE.test(n)).length, sampleNames: allNames.slice(0, 5) }, 'H1');
  if (renamed) console.warn(`⚠ ${renamed} نام سانیتایز شد`);

  archive.append(JSON.stringify({
    platform: 'react',
    build: { output: 'dist' },
  }, null, 2), { name: 'liara.json' });
  archive.finalize();
});

// #region agent log
try {
  const { createRequire } = await import('module');
  const req = createRequire(import.meta.url);
  const AdmZip = req('adm-zip');
  const zip = new AdmZip(zipPath);
  const SAFE_RE = /^[a-zA-Z0-9._\-\/]+$/;
  const entries = zip.getEntries();
  const unsafe = entries.filter(e => !SAFE_RE.test(e.entryName));
  const reportPath = join(liaraDir, 'build-report.txt');
  const report = [
    `Build: ${new Date().toISOString()}`,
    `Total entries: ${entries.length}`,
    `Unsafe names: ${unsafe.length}`,
    ...(unsafe.length ? unsafe.map(e => `  BAD: ${JSON.stringify(e.entryName)}`) : []),
    `Sample: ${entries.slice(0, 3).map(e => e.entryName).join(', ')}`,
    `Has brackets: ${entries.some(e => /[\[\]{}]/.test(e.entryName))}`,
  ].join('\n');
  rmSync(reportPath, { force: true });
  writeFileSync(reportPath, report);
  DBG('Post-build zip verification', { total: entries.length, unsafeCount: unsafe.length, unsafeNames: unsafe.map(e => e.entryName).slice(0, 10) }, 'H2');
  if (unsafe.length) console.warn('⚠ در زیپ نام‌های غیرایمن:', unsafe.map(e => e.entryName).join(', '));
} catch (e) {
  DBG('Verification skip', { error: String(e.message || e) }, 'H2');
}
// #endregion

console.log('\n✅ liara/newray.zip آماده است (سورس برای پلتفرم React)');
console.log('   پلتفرم React را در لیارا انتخاب کرده و این فایل را آپلود کنید.');
console.log('   متغیرهای محیطی (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY) را در پنل لیارا تنظیم کنید.');
console.log('   برای دامنه ریشه، در متغیرهای محیطی VITE_BASE_URL=/ تنظیم کنید.');
