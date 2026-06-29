import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadEnvLocal() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i <= 0) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const client = new pg.Client({
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || 'newray',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '',
});

const sqlPath = path.join(ROOT, 'supabase/migrations/supabase_migration_report_modules.sql');

try {
  if (!process.env.POSTGRES_PASSWORD) {
    throw new Error('POSTGRES_PASSWORD not set in .env.local');
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  await client.connect();
  await client.query(sql);

  const { rows } = await client.query(
    'select slug, title, is_builtin, is_active from report_modules order by sort_order, title'
  );

  console.log(`Migration OK — ${rows.length} row(s) in report_modules:`);
  for (const r of rows) {
    console.log(`  • ${r.slug} | ${r.title} | builtin=${r.is_builtin} active=${r.is_active}`);
  }
} catch (err) {
  console.error('Migration FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
