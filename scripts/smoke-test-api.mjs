/**
 * Smoke test local API + PostgreSQL newray
 * Usage: node scripts/smoke-test-api.mjs
 */
const BASE = process.env.LOCAL_API_URL || 'http://127.0.0.1:3000';

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, json, headers: res.headers };
}

test('health', async () => {
  const r = await req('GET', '/health');
  if (r.status !== 200 || !r.json?.ok) throw new Error('health failed');
});

test('app_users select', async () => {
  const r = await req('GET', '/rest/v1/app_users?select=id,username&limit=1');
  if (r.status !== 200 || !Array.isArray(r.json)) throw new Error('app_users select failed');
});

test('app_users redacts password fields', async () => {
  const r = await req('GET', '/rest/v1/app_users?select=*&limit=1');
  if (r.status !== 200 || !r.json?.[0]) throw new Error('app_users select * failed');
  const row = r.json[0];
  if ('password' in row || 'password_hash' in row) {
    throw new Error('password fields must not be returned from API');
  }
});

test('auth login rejects invalid credentials', async () => {
  const r = await req('POST', '/auth/v1/login', { username: '__no_such_user__', password: 'wrong' });
  if (r.status !== 401) throw new Error(`expected 401, got ${r.status}`);
});

test('auth login accepts valid user', async () => {
  const users = await req('GET', '/rest/v1/app_users?select=username&limit=1');
  const username = users.json?.[0]?.username;
  if (!username) throw new Error('no users in db');
  const bad = await req('POST', '/auth/v1/login', { username, password: '__wrong__' });
  if (bad.status !== 401) throw new Error('wrong password should return 401');
});

test('personnel embed', async () => {
  const r = await req('GET', '/rest/v1/app_users?select=id,personnel(full_name)&limit=1');
  if (r.status !== 200) throw new Error(`embed failed: ${JSON.stringify(r.json)}`);
});

test('head count app_users', async () => {
  const res = await fetch(`${BASE}/rest/v1/app_users?select=id`, { method: 'HEAD' });
  if (res.status !== 200 || !res.headers.get('content-range')) throw new Error('head count failed');
});

test('rpc get_next_tracking_code', async () => {
  const r = await req('POST', '/rest/v1/rpc/get_next_tracking_code', { prefix_input: 'MIS' });
  if (r.status !== 200 || !r.json) throw new Error('rpc tracking failed');
});

test('control_room_reports CRUD', async () => {
  const ins = await req('POST', '/rest/v1/control_room_reports', {
    tracking_code: 'SMK-CR-TEST',
    report_date: '1403/01/01',
    shift: 'A',
    operator_name: 'smoke',
    status: 'DRAFT',
    full_data: { smoke: true },
  });
  if (ins.status !== 201) throw new Error(`insert failed: ${JSON.stringify(ins.json)}`);
  const id = ins.json?.id;
  const sel = await req('GET', `/rest/v1/control_room_reports?select=id&tracking_code=eq.SMK-CR-TEST`);
  if (sel.status !== 200 || !sel.json?.length) throw new Error('select after insert failed');
  const del = await req('DELETE', `/rest/v1/control_room_reports?id=eq.${id}`);
  if (del.status !== 200) throw new Error('delete failed');
});

test('production_reports like filter', async () => {
  const r = await req('GET', '/rest/v1/control_room_reports?select=id&report_date=like.1403%2F%25&limit=1');
  if (r.status !== 200) throw new Error(`like filter failed: ${JSON.stringify(r.json)}`);
});

test('not.is.null filter', async () => {
  const r = await req('GET', '/rest/v1/shift_reports?select=id&full_data=not.is.null&limit=1');
  if (r.status !== 200) throw new Error(`not.is.null failed: ${JSON.stringify(r.json)}`);
});

test('messages or+not cs count head', async () => {
  const uid = '00000000-0000-0000-0000-000000000001';
  const or = encodeURIComponent('(receiver_type.eq.ALL)');
  const res = await fetch(
    `${BASE}/rest/v1/messages?select=id&or=${or}&read_by=not.cs.%7B${uid}%7D`,
    { method: 'HEAD' }
  );
  if (res.status !== 200) throw new Error(`messages head failed: ${res.status}`);
});

test('personnel_missions table', async () => {
  const r = await req('GET', '/rest/v1/personnel_missions?select=id&limit=1');
  if (r.status !== 200 || !Array.isArray(r.json)) throw new Error('personnel_missions failed');
});

test('factory_goods_exits table', async () => {
  const r = await req('GET', '/rest/v1/factory_goods_exits?select=id&limit=1');
  if (r.status !== 200 || !Array.isArray(r.json)) throw new Error('factory_goods_exits failed');
});

test('service_repair_requests table', async () => {
  const r = await req('GET', '/rest/v1/service_repair_requests?select=id&limit=1');
  if (r.status !== 200 || !Array.isArray(r.json)) throw new Error('service_repair_requests failed');
});

test('parts count', async () => {
  const r = await req('GET', '/rest/v1/parts?select=id&limit=1');
  if (r.status !== 200 || !Array.isArray(r.json)) throw new Error('parts failed');
});

test('composite on_conflict upsert', async () => {
  const settings = await req('GET', '/rest/v1/app_settings?select=id&limit=1');
  const users = await req('GET', '/rest/v1/app_users?select=id&limit=1');
  if (!settings.json?.[0]?.id || !users.json?.[0]?.id) throw new Error('missing seed data');
  const r = await fetch(`${BASE}/rest/v1/announcement_acknowledgments?on_conflict=user_id,app_settings_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      user_id: users.json[0].id,
      app_settings_id: settings.json[0].id,
      acknowledged_version: 1,
      acknowledged_at: new Date().toISOString(),
    }),
  });
  if (r.status !== 201 && r.status !== 204) {
    const text = await r.text();
    throw new Error(`composite upsert failed: ${r.status} ${text}`);
  }
});

async function main() {
  console.log(`Smoke test -> ${BASE}\n`);
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  OK  ${t.name}`);
    } catch (e) {
      failed++;
      console.log(`  FAIL ${t.name}: ${e.message}`);
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
