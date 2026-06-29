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

const migrationFiles = [
  'supabase_migration_process_modules.sql',
  'supabase_migration_cartable_entity_workflow.sql',
];

try {
  if (!process.env.POSTGRES_PASSWORD) {
    throw new Error('POSTGRES_PASSWORD not set in .env.local');
  }

  await client.connect();

  for (const file of migrationFiles) {
    const sqlPath = path.join(ROOT, 'supabase/migrations', file);
    if (!fs.existsSync(sqlPath)) {
      console.warn(`Skip missing: ${file}`);
      continue;
    }
    console.log(`Running ${file} ...`);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log(`  OK`);
  }

  const { rows } = await client.query(
    `select module_key, title, is_active, entity_table
     from public.process_modules
     where is_active = true
     order by sort_order, title`
  );

  console.log(`\nActive process_modules (${rows.length}):`);
  for (const r of rows) {
    console.log(`  • ${r.module_key} | ${r.title} | ${r.entity_table}`);
  }

  const { rows: cartableCheck } = await client.query(
    `select exists (
       select 1 from information_schema.tables
       where table_schema = 'public' and table_name = 'cartable_items'
     ) as ok`
  );
  console.log(`cartable_items table: ${cartableCheck[0]?.ok ? 'yes' : 'NO'}`);
} catch (err) {
  console.error('Migration FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
