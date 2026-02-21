#!/usr/bin/env node
/**
 * بیلد برای لیارا: خروجی liara/newray.zip
 * بدون node_modules و بدون متغیرهای Supabase و GenAI
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, rmSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// 404 برای root (pathSegmentsToKeep=0)
const public404 = join(root, 'public', '404.html');
const backup404 = join(root, '404.bak.tmp');
const liara404 = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>در حال انتقال...</title>
    <script>
      var pathSegmentsToKeep = 0;
      var l = window.location;
      var repoBase = l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/');
      var restPath = l.pathname.slice(repoBase.length).replace(/^\\//, '');
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') + repoBase + '/?/' + restPath +
        (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') + l.hash
      );
    </script>
  </head>
  <body></body>
</html>`;

const orig404 = readFileSync(public404, 'utf8');
writeFileSync(backup404, orig404);
writeFileSync(public404, liara404);

try {
  execSync('npx vite build --base / --mode liara', { cwd: root, stdio: 'inherit' });
} finally {
  writeFileSync(public404, orig404);
  unlinkSync(backup404);
}

// پوشه liara و فایل newray.zip
const liaraDir = join(root, 'liara');
const distDir = join(root, 'dist');

if (existsSync(liaraDir)) rmSync(liaraDir, { recursive: true });
mkdirSync(liaraDir, { recursive: true });

const zipPath = join(liaraDir, 'newray-static.zip');
const output = createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

await new Promise((resolve, reject) => {
  output.on('close', resolve);
  archive.on('error', reject);
  archive.pipe(output);
  archive.directory(distDir, false);
  archive.append(JSON.stringify({ platform: 'static' }, null, 2), { name: 'liara.json' });
  archive.finalize();
});

console.log('\n✅ liara/newray-static.zip آماده است (پیش‌ساخته، پلتفرم static)');
