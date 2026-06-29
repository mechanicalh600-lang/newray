/**
 * Password hashing utilities (bcrypt) — used by local API and migration scripts.
 */
import bcrypt from 'bcryptjs';

const ROUNDS = 12;
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$/;

export function isPasswordHash(value) {
  return typeof value === 'string' && BCRYPT_RE.test(value);
}

export async function hashPassword(plain) {
  if (plain == null || String(plain).length === 0) {
    throw new Error('Password cannot be empty');
  }
  return bcrypt.hash(String(plain), ROUNDS);
}

export async function verifyPassword(plain, row) {
  if (plain == null) return false;
  const text = String(plain);

  if (row.password_hash && isPasswordHash(row.password_hash)) {
    return bcrypt.compare(text, row.password_hash);
  }

  // Legacy plain-text column (migrate on successful verify)
  if (row.password != null && row.password !== '') {
    return text === String(row.password);
  }

  return false;
}

/** Hash plain passwords and clear legacy column. Returns number of rows updated. */
export async function migratePlainPasswords(pool) {
  const { rows } = await pool.query(
    `SELECT id, username, password, password_hash FROM app_users
     WHERE password IS NOT NULL AND password <> ''
        OR (password_hash IS NOT NULL AND password_hash <> '' AND password_hash !~ '^\\$2[aby]\\$')`
  );

  let updated = 0;
  for (const row of rows) {
    const plain = row.password;
    if (!plain) continue;

    const passwordHash = await hashPassword(plain);
    await pool.query(
      `UPDATE app_users SET password_hash = $1, password = NULL WHERE id = $2`,
      [passwordHash, row.id]
    );
    updated += 1;
  }
  return updated;
}

export async function upgradePasswordOnLogin(pool, userId, plain) {
  const passwordHash = await hashPassword(plain);
  await pool.query(
    `UPDATE app_users SET password_hash = $1, password = NULL WHERE id = $2`,
    [passwordHash, userId]
  );
}
