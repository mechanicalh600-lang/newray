/**
 * API محلی — جایگزین Supabase Cloud (PostgREST + Storage ساده)
 * Usage: POSTGRES_PASSWORD=... node scripts/local-api-server.mjs
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import {
  hashPassword,
  verifyPassword,
  isPasswordHash,
  upgradePasswordOnLogin,
  migratePlainPasswords,
} from './lib/password-auth.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STORAGE_DIR = path.join(ROOT, 'local-storage');
const PORT = Number(process.env.LOCAL_API_PORT || 3000);

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

const DB = {
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || 'newray',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '',
};

if (!DB.password) {
  console.error('POSTGRES_PASSWORD is required (set in env or .env.local)');
  process.exit(1);
}

const pool = new pg.Pool(DB);
let fkMap = new Map();

async function loadForeignKeys() {
  const { rows } = await pool.query(`
    SELECT
      tc.table_name AS source_table,
      kcu.column_name AS source_column,
      ccu.table_name AS target_table,
      ccu.column_name AS target_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  `);
  fkMap = new Map();
  for (const r of rows) {
    fkMap.set(`${r.source_table}->${r.target_table}`, r);
    fkMap.set(`${r.target_table}<-${r.source_table}`, r);
  }
}

function json(res, status, body, extraHeaders = {}) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Content-Range',
    ...extraHeaders,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function decodeVal(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

const OP_MAP = {
  eq: '=',
  neq: '<>',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  like: 'LIKE',
  ilike: 'ILIKE',
};

function parseFilters(query, skip = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'or'])) {
  const filters = [];
  for (const [key, raw] of Object.entries(query)) {
    if (skip.has(key)) continue;
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value == null) continue;
    if (value.startsWith('not.is.')) {
      const v = value.slice(7);
      if (v === 'null') filters.push({ col: key, kind: 'not_null' });
      continue;
    }
    if (value.startsWith('not.cs.')) {
      filters.push({ col: key, kind: 'not_cs', val: value.slice(7) });
      continue;
    }
    if (value.startsWith('cs.')) {
      filters.push({ col: key, kind: 'cs', val: value.slice(3) });
      continue;
    }
    let matched = false;
    for (const [op, sqlOp] of Object.entries(OP_MAP)) {
      const prefix = `${op}.`;
      if (value.startsWith(prefix)) {
        filters.push({ col: key, op: sqlOp, val: decodeVal(value.slice(prefix.length)), kind: 'cmp' });
        matched = true;
        break;
      }
    }
    if (matched) continue;
    if (value.startsWith('in.(') && value.endsWith(')')) {
      const inner = value.slice(4, -1);
      const vals = inner === '' ? [] : inner.split(',').map(decodeVal);
      filters.push({ col: key, op: 'IN', val: vals, kind: 'in' });
      continue;
    }
    if (value.startsWith('is.')) {
      const v = value.slice(3);
      filters.push({ col: key, op: 'IS', val: v === 'null' ? null : decodeVal(v), kind: 'is' });
    }
  }
  return filters;
}

function jsonbContainsValue(raw) {
  const v = decodeVal(raw);
  if (v.startsWith('{') && v.endsWith('}')) {
    const inner = v.slice(1, -1);
    return JSON.stringify([inner]);
  }
  return JSON.stringify(v);
}

function parseFilterExpr(expr, params) {
  const e = decodeVal(expr.trim());
  if (e.startsWith('and(') && e.endsWith(')')) {
    const inner = e.slice(4, -1);
    const parts = splitTopLevel(inner, ',');
    const sql = parts.map((p) => parseFilterExpr(p, params)).join(' AND ');
    return `(${sql})`;
  }
  const dot1 = e.indexOf('.');
  if (dot1 <= 0) return 'TRUE';
  const col = e.slice(0, dot1);
  const rest = e.slice(dot1 + 1);
  const dot2 = rest.indexOf('.');
  if (dot2 <= 0) return 'TRUE';
  const op = rest.slice(0, dot2);
  const val = decodeVal(rest.slice(dot2 + 1));
  if (op === 'eq') {
    params.push(val);
    return `${quoteId(col)} = $${params.length}`;
  }
  if (op === 'like') {
    params.push(val);
    return `${quoteId(col)} LIKE $${params.length}`;
  }
  return 'TRUE';
}

function splitTopLevel(s, sep) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function buildWhereClause(filters, params, orRaw) {
  const parts = [];
  for (const f of filters) {
    if (f.kind === 'in') {
      params.push(f.val);
      parts.push(`${quoteId(f.col)} = ANY($${params.length})`);
    } else if (f.kind === 'is') {
      if (f.val === null) parts.push(`${quoteId(f.col)} IS NULL`);
      else {
        params.push(f.val);
        parts.push(`${quoteId(f.col)} IS $${params.length}`);
      }
    } else if (f.kind === 'not_null') {
      parts.push(`${quoteId(f.col)} IS NOT NULL`);
    } else if (f.kind === 'cs') {
      params.push(jsonbContainsValue(f.val));
      parts.push(`${quoteId(f.col)}::jsonb @> $${params.length}::jsonb`);
    } else if (f.kind === 'not_cs') {
      params.push(jsonbContainsValue(f.val));
      parts.push(`NOT (${quoteId(f.col)}::jsonb @> $${params.length}::jsonb)`);
    } else {
      params.push(f.val);
      parts.push(`${quoteId(f.col)} ${f.op} $${params.length}`);
    }
  }
  if (orRaw) {
    const orVal = pickQueryVal(orRaw);
    const inner = orVal.startsWith('(') && orVal.endsWith(')') ? orVal.slice(1, -1) : orVal;
    const orParts = splitTopLevel(inner, ',').map((ex) => parseFilterExpr(ex, params));
    if (orParts.length) parts.push(`(${orParts.join(' OR ')})`);
  }
  return parts.length ? `WHERE ${parts.join(' AND ')}` : '';
}

function parseSelect(selectRaw) {
  const select = selectRaw || '*';
  if (select === '*') return { cols: '*', embeds: [] };
  const embeds = [];
  const re = /([a-zA-Z0-9_]+)\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(select))) {
    embeds.push({ table: m[1], cols: m[2].split(',').map((s) => s.trim()).filter(Boolean) });
  }
  let cols = select.replace(re, '').replace(/,\s*,/g, ',').replace(/^,+|,+$/g, '').trim();
  if (!cols) cols = '*';
  return { cols, embeds };
}

function buildEmbedSql(mainTable, embed) {
  const m2o = fkMap.get(`${mainTable}->${embed.table}`);
  if (m2o) {
    const objCols = embed.cols.map((c) => `'${c}', e.${quoteId(c)}`).join(', ');
    return `(SELECT json_build_object(${objCols}) FROM ${quoteId(embed.table)} e WHERE e.${quoteId(m2o.target_column)} = t.${quoteId(m2o.source_column)} LIMIT 1) AS ${quoteId(embed.table)}`;
  }
  const o2m = fkMap.get(`${mainTable}<-${embed.table}`);
  if (o2m) {
    const objCols = embed.cols.map((c) => `'${c}', e.${quoteId(c)}`).join(', ');
    return `(SELECT COALESCE(json_agg(json_build_object(${objCols})), '[]'::json) FROM ${quoteId(embed.table)} e WHERE e.${quoteId(o2m.source_column)} = t.${quoteId(o2m.target_column)}) AS ${quoteId(embed.table)}`;
  }
  return `NULL::json AS ${quoteId(embed.table)}`;
}

function quoteId(id) {
  return `"${String(id).replace(/"/g, '""')}"`;
}

const SENSITIVE_APP_USER_COLS = new Set(['password', 'password_hash']);

function redactAppUserRow(row) {
  if (!row || typeof row !== 'object') return row;
  const copy = { ...row };
  for (const col of SENSITIVE_APP_USER_COLS) delete copy[col];
  return copy;
}

function redactAppUserRows(table, rows) {
  if (table !== 'app_users') return rows;
  return rows.map(redactAppUserRow);
}

async function prepareAppUserWrite(row) {
  const copy = { ...row };
  if (copy.password !== undefined && copy.password !== null && copy.password !== '') {
    copy.password_hash = await hashPassword(String(copy.password));
  }
  delete copy.password;
  return copy;
}

async function prepareAppUserWrites(rows) {
  return Promise.all(rows.map((row) => prepareAppUserWrite(row)));
}

function mapAuthUser(row) {
  const personnel = row.personnel && typeof row.personnel === 'object' ? row.personnel : null;
  const username = String(row.username || '');
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    isDefaultPassword: Boolean(row.is_default_password),
    fullName: personnel?.full_name || username,
    personnelCode: personnel?.personnel_code || undefined,
    avatar: row.avatar || personnel?.profile_picture || undefined,
  };
}

async function fetchAppUserByUsername(username) {
  const { rows } = await pool.query(
    `SELECT u.*,
      (
        SELECT json_build_object(
          'full_name', p.full_name,
          'personnel_code', p.personnel_code,
          'profile_picture', p.profile_picture,
          'unit', p.unit
        )
        FROM ${quoteId('personnel')} p
        WHERE p.id = u.personnel_id
        LIMIT 1
      ) AS personnel
     FROM ${quoteId('app_users')} u
     WHERE lower(u.username) = lower($1)
     LIMIT 1`,
    [username]
  );
  return rows[0] || null;
}

async function handleAuthLogin(body, res) {
  const username = String(body?.username || '').trim();
  const password = body?.password;
  if (!username || password == null || password === '') {
    return json(res, 400, { message: 'نام کاربری و رمز عبور الزامی است' });
  }

  const row = await fetchAppUserByUsername(username);
  if (!row) {
    return json(res, 401, { message: 'نام کاربری یا رمز عبور اشتباه است' });
  }

  const ok = await verifyPassword(password, row);
  if (!ok) {
    return json(res, 401, { message: 'نام کاربری یا رمز عبور اشتباه است' });
  }

  if (!isPasswordHash(row.password_hash) && row.password) {
    await upgradePasswordOnLogin(pool, row.id, password);
  }

  return json(res, 200, mapAuthUser(row));
}

async function handleAuthChangePassword(body, res) {
  const userId = body?.user_id;
  const currentPassword = body?.current_password;
  const newPassword = body?.new_password;

  if (!userId || currentPassword == null || currentPassword === '') {
    return json(res, 400, { message: 'اطلاعات ناقص است' });
  }
  if (!newPassword || String(newPassword).length < 4) {
    return json(res, 400, { message: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد' });
  }
  if (String(newPassword) === String(currentPassword)) {
    return json(res, 400, { message: 'رمز عبور جدید نمی‌تواند مشابه رمز فعلی باشد' });
  }

  const { rows } = await pool.query(
    `SELECT id, password, password_hash FROM ${quoteId('app_users')} WHERE id = $1 LIMIT 1`,
    [userId]
  );
  const row = rows[0];
  if (!row) {
    return json(res, 404, { message: 'کاربر یافت نشد' });
  }

  const ok = await verifyPassword(currentPassword, row);
  if (!ok) {
    return json(res, 401, { message: 'رمز عبور فعلی اشتباه است' });
  }

  const passwordHash = await hashPassword(String(newPassword));
  await pool.query(
    `UPDATE ${quoteId('app_users')} SET password_hash = $1, password = NULL, is_default_password = false WHERE id = $2`,
    [passwordHash, userId]
  );

  return json(res, 200, { ok: true });
}

function pickQueryVal(v) {
  if (Array.isArray(v)) return v.join(',');
  return v;
}

function parseOrder(orderRaw) {
  if (!orderRaw) return '';
  const items = (Array.isArray(orderRaw) ? orderRaw[0] : orderRaw).split(',');
  const parts = items.map((item) => {
    const [col, dir = 'asc'] = item.split('.');
    return `${quoteId(col)} ${dir.toLowerCase() === 'desc' ? 'DESC' : 'ASC'}`;
  });
  return parts.length ? `ORDER BY ${parts.join(', ')}` : '';
}

async function handleTableGet(table, query, req, res) {
  const selectRaw = pickQueryVal(query.select);
  const { cols, embeds } = parseSelect(selectRaw);
  const filters = parseFilters(query);
  const params = [];
  const where = buildWhereClause(filters, params, query.or);
  const order = parseOrder(pickQueryVal(query.order));
  const limit = pickQueryVal(query.limit);
  const offset = pickQueryVal(query.offset);
  const headOnly = req.method === 'HEAD' || selectRaw === 'count';

  if (headOnly) {
    const countSql = `SELECT COUNT(*)::int AS c FROM ${quoteId(table)} t ${where}`;
    const { rows } = await pool.query(countSql, params);
    const total = rows[0]?.c ?? 0;
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Range': `0-${Math.max(total - 1, 0)}/${total}`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Range',
    });
    res.end();
    return;
  }

  const selectParts = [];
  if (cols === '*') selectParts.push('t.*');
  else selectParts.push(`t.${cols.split(',').map((c) => c.trim()).join(', t.')}`);
  for (const emb of embeds) selectParts.push(buildEmbedSql(table, emb));
  const finalSelect = selectParts.join(', ');

  let sql = `SELECT ${finalSelect} FROM ${quoteId(table)} t ${where} ${order}`;
  if (limit) {
    params.push(Number(limit));
    sql += ` LIMIT $${params.length}`;
  }
  if (offset) {
    params.push(Number(offset));
    sql += ` OFFSET $${params.length}`;
  }

  const { rows } = await pool.query(sql, params);
  const safeRows = redactAppUserRows(table, rows);
  const accept = req.headers.accept || '';
  if (accept.includes('application/vnd.pgrst.object+json')) {
    if (safeRows.length === 0) return json(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
    if (safeRows.length > 1) return json(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
    return json(res, 200, safeRows[0]);
  }
  return json(res, 200, safeRows);
}

function parseConflictColumns(raw, fallbackKey) {
  const value = pickQueryVal(raw) || fallbackKey || '';
  return String(value)
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

async function handleTablePost(table, query, body, req, res) {
  let rows = Array.isArray(body) ? body : [body];
  if (!rows.length) return json(res, 400, { message: 'Empty body' });
  if (table === 'app_users') {
    rows = await prepareAppUserWrites(rows);
  }
  const prefer = req.headers.prefer || '';
  const keys = Object.keys(rows[0]);
  const params = [];
  const valueRows = rows.map((row, ri) => {
    const placeholders = keys.map((k) => {
      params.push(row[k]);
      return `$${params.length}`;
    });
    return `(${placeholders.join(', ')})`;
  });
  let sql = `INSERT INTO ${quoteId(table)} (${keys.map(quoteId).join(', ')}) VALUES ${valueRows.join(', ')}`;
  if (prefer.includes('resolution=merge-duplicates') || query.on_conflict) {
    const conflictCols = parseConflictColumns(query.on_conflict, keys[0]);
    const conflictSql = conflictCols.map(quoteId).join(', ');
    const conflictSet = new Set(conflictCols);
    const updates = keys.filter((k) => !conflictSet.has(k)).map((k) => `${quoteId(k)} = EXCLUDED.${quoteId(k)}`);
    if (updates.length) {
      sql += ` ON CONFLICT (${conflictSql}) DO UPDATE SET ${updates.join(', ')}`;
    } else {
      sql += ` ON CONFLICT (${conflictSql}) DO NOTHING`;
    }
  }
  sql += ' RETURNING *';
  const { rows: inserted } = await pool.query(sql, params);
  const safe = redactAppUserRows(table, inserted);
  const ret = prefer.includes('return=minimal') ? null : safe.length === 1 ? safe[0] : safe;
  return json(res, 201, ret ?? undefined);
}

async function handleTablePatch(table, query, body, req, res) {
  let patchBody = body || {};
  if (table === 'app_users') {
    patchBody = await prepareAppUserWrite(patchBody);
  }
  const filters = parseFilters(query);
  const params = [];
  const sets = Object.entries(patchBody).map(([k, v]) => {
    params.push(v);
    return `${quoteId(k)} = $${params.length}`;
  });
  if (!sets.length) return json(res, 400, { message: 'No fields to update' });
  const where = buildWhereClause(filters, params, query.or);
  const sql = `UPDATE ${quoteId(table)} t SET ${sets.join(', ')} ${where} RETURNING *`;
  const { rows } = await pool.query(sql, params);
  const prefer = req.headers.prefer || '';
  if (prefer.includes('return=minimal')) return json(res, 204, undefined);
  return json(res, 200, redactAppUserRows(table, rows));
}

async function handleTableDelete(table, query, res) {
  const filters = parseFilters(query);
  const params = [];
  const where = buildWhereClause(filters, params, query.or);
  const sql = `DELETE FROM ${quoteId(table)} t ${where} RETURNING *`;
  const { rows } = await pool.query(sql, params);
  return json(res, 200, redactAppUserRows(table, rows));
}

async function handleRpc(name, body, res) {
  const params = Object.values(body || {});
  const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `SELECT ${quoteId(name)}(${placeholders}) AS result`;
  const { rows } = await pool.query(sql, params);
  return json(res, 200, rows[0]?.result ?? null);
}

async function handleStorageUpload(bucket, objectPath, req, res) {
  const dir = path.join(STORAGE_DIR, bucket);
  fs.mkdirSync(dir, { recursive: true });
  const safeName = objectPath.replace(/\\/g, '/').replace(/\.\./g, '');
  const full = path.join(dir, safeName);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const buf = await readBody(req);
  fs.writeFileSync(full, buf);
  return json(res, 200, { Key: safeName, path: safeName });
}

function handleStoragePublic(bucket, objectPath, res) {
  const safeName = objectPath.replace(/\\/g, '/').replace(/\.\./g, '');
  const full = path.join(STORAGE_DIR, bucket, safeName);
  if (!fs.existsSync(full)) {
    return json(res, 404, { message: 'Object not found' });
  }
  const ext = path.extname(full).toLowerCase();
  const types = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
  fs.createReadStream(full).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'authorization,apikey,content-type,prefer,accept,x-client-info',
      });
      return res.end();
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname.startsWith('/storage/v1/object/public/')) {
      const rest = pathname.slice('/storage/v1/object/public/'.length);
      const slash = rest.indexOf('/');
      const bucket = rest.slice(0, slash);
      const objectPath = rest.slice(slash + 1);
      return handleStoragePublic(bucket, objectPath, res);
    }

    if (req.method === 'POST' && pathname.startsWith('/storage/v1/object/')) {
      const rest = pathname.slice('/storage/v1/object/'.length);
      const slash = rest.indexOf('/');
      const bucket = rest.slice(0, slash);
      const objectPath = rest.slice(slash + 1);
      return await handleStorageUpload(bucket, objectPath, req, res);
    }

    if (pathname.startsWith('/rest/v1/rpc/') && req.method === 'POST') {
      const name = pathname.slice('/rest/v1/rpc/'.length);
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      return await handleRpc(name, body, res);
    }

    if (pathname.startsWith('/auth/v1/') && req.method === 'POST') {
      const action = pathname.slice('/auth/v1/'.length);
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      if (action === 'login') return await handleAuthLogin(body, res);
      if (action === 'change-password') return await handleAuthChangePassword(body, res);
      return json(res, 404, { message: 'Not found' });
    }

    const m = pathname.match(/^\/rest\/v1\/([a-zA-Z0-9_]+)$/);
    if (m) {
      const table = m[1];
      const query = {};
      for (const key of url.searchParams.keys()) {
        const all = url.searchParams.getAll(key);
        query[key] = all.length > 1 ? all : all[0];
      }

      if (req.method === 'GET' || req.method === 'HEAD') return await handleTableGet(table, query, req, res);
      if (req.method === 'POST') {
        const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
        return await handleTablePost(table, query, body, req, res);
      }
      if (req.method === 'PATCH') {
        const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
        return await handleTablePatch(table, query, body, req, res);
      }
      if (req.method === 'DELETE') return await handleTableDelete(table, query, res);
    }

    if (pathname === '/' || pathname === '/health') {
      return json(res, 200, { ok: true, db: DB.database });
    }

    json(res, 404, { message: 'Not found' });
  } catch (e) {
    console.error(e);
    json(res, 500, { message: e.message || String(e) });
  }
});

await loadForeignKeys();
try {
  const migrated = await migratePlainPasswords(pool);
  if (migrated > 0) {
    console.log(`Password security: migrated ${migrated} plain password(s) to bcrypt.`);
  }
} catch (e) {
  console.warn('Password migration check failed:', e.message);
}
fs.mkdirSync(STORAGE_DIR, { recursive: true });
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Local API ready at http://127.0.0.1:${PORT}`);
  console.log(`Database: ${DB.database}@${DB.host}:${DB.port}`);
  console.log(`Storage: ${STORAGE_DIR}`);
  console.log('Auth: POST /auth/v1/login, POST /auth/v1/change-password');
});
