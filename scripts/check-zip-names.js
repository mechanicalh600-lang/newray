#!/usr/bin/env node
/** لیست فایل‌هایی که در zip قرار می‌گیرند و نام‌های سانیتایز شده */
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const EXCLUDE = new Set(['node_modules','dist','liara','.git','.env','.env.local','.env.liara','.env.production','.cursor','404.bak.tmp','scripts','docs','fonts']);
const UNSAFE_NAME_RE = /[\[\]{}()\s\u0080-\uFFFF]/;

function shouldExclude(name) {
  if (EXCLUDE.has(name)) return true;
  if (name.startsWith('.env') || name.endsWith('.zip')) return true;
  if (name.startsWith('.')) return true;
  if (name.startsWith('supabase_') && name.endsWith('.sql')) return true;
  if (UNSAFE_NAME_RE.test(name)) return true;
  return false;
}

function toSafe(rel) {
  let s = rel.replace(/\\/g, '/');
  s = s.replace(/[^a-zA-Z0-9._\-\/]/g, '-');
  s = s.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return s || '_';
}

const seen = new Map();
function walk(dir, base = '') {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = join(base, e.name).replace(/\\/g, '/');
    if (shouldExclude(e.name)) continue;
    if (e.isDirectory()) walk(join(dir, e.name), rel);
    else {
      const safe = toSafe(rel);
      if (safe !== rel) console.log('RENAMED:', rel, '->', safe);
      if (seen.has(safe)) console.log('DUPLICATE name in zip:', safe, 'from', seen.get(safe), 'and', rel);
      else seen.set(safe, rel);
    }
  }
}

walk(root);
console.log('Total entries that would be in zip:', seen.size);
