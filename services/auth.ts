import { UserRole } from '../types';

export interface AuthLoginResponse {
  id: string;
  username: string;
  role: UserRole;
  isDefaultPassword: boolean;
  fullName: string;
  personnelCode?: string;
  avatar?: string;
}

function authBaseUrl(): string {
  const url = (import.meta.env.VITE_SUPABASE_URL || '').trim()
    || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${url.replace(/\/$/, '')}/auth/v1`;
}

async function parseAuthError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.message || 'خطا در ارتباط با سرور';
  } catch {
    return 'خطا در ارتباط با سرور';
  }
}

export async function loginWithPassword(
  username: string,
  password: string
): Promise<AuthLoginResponse> {
  const res = await fetch(`${authBaseUrl()}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(await parseAuthError(res));
  }
  return res.json();
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(`${authBaseUrl()}/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (!res.ok) {
    throw new Error(await parseAuthError(res));
  }
}
