-- Password security: store bcrypt hashes in password_hash; legacy password column cleared by migrate script.
-- Run: npm run db:hash-passwords

COMMENT ON COLUMN public.app_users.password_hash IS 'bcrypt hash of user password; never expose via API';
COMMENT ON COLUMN public.app_users.password IS 'DEPRECATED — plain text; cleared after migration';

-- Ensure index exists for username lookups during login
CREATE INDEX IF NOT EXISTS idx_app_users_username_lower ON public.app_users (lower(username));
