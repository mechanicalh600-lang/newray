import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { getShamsiDate, getTime, getPublicIp } from '../utils';
import { supabase } from '../supabaseClient';

export interface AppContextValue {
  user: User | null;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  snowMode: boolean;
  setSnowMode: (v: boolean) => void;
  showSplash: boolean;
  autoLogoutModal: { minutes: number } | null;
  setAutoLogoutModal: (v: { minutes: number } | null) => void;
  handleLogin: (newUser: User) => Promise<void>;
  handleLogout: (isAuto?: boolean) => Promise<void>;
  handleUpdateUser: (updatedUser: User) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [inactivityLimit, setInactivityLimit] = useState(300000);
  const [autoLogoutModal, setAutoLogoutModal] = useState<{ minutes: number } | null>(null);
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem('currentUser');
      return null;
    }
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('theme') === 'dark');
  const [snowMode, setSnowMode] = useState<boolean>(() => localStorage.getItem('snowMode') === 'true');
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeInsertSystemLog = useCallback(async (payload: Record<string, unknown>) => {
    try {
      const { error } = await supabase.from('system_logs').insert([payload]);
      if (!error) return;
      if (error.code === '23503') {
        const fallbackPayload = { ...payload };
        delete (fallbackPayload as Record<string, unknown>).user_id;
        await supabase.from('system_logs').insert([fallbackPayload]);
        return;
      }
      throw error;
    } catch (e) {
      console.warn('System log insert skipped:', e);
    }
  }, []);

  const fetchSessionTimeout = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('session_timeout_minutes, org_logo')
        .order('created_at', { ascending: true })
        .limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      if (row && row.session_timeout_minutes) {
        setInactivityLimit(row.session_timeout_minutes * 60000);
      }
      if (row?.org_logo && user && String(user.username || '').toLowerCase() === 'admin' && !user.avatar) {
        const next = { ...user, avatar: row.org_logo };
        setUser(next);
        localStorage.setItem('currentUser', JSON.stringify(next));
      }
    } catch {
      console.warn('Failed to fetch settings, using defaults.');
    }
  }, [user]);

  useEffect(() => {
    fetchSessionTimeout();
    const interval = setInterval(fetchSessionTimeout, 120000);
    return () => clearInterval(interval);
  }, [fetchSessionTimeout]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchSessionTimeout();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [fetchSessionTimeout]);

  const handleLogout = useCallback(async (isAuto = false) => {
    if (user) {
      const ip = await getPublicIp();
      await safeInsertSystemLog({
        user_id: user.id,
        user_name: user.fullName,
        personnel_code: user.personnelCode || '---',
        action: isAuto ? 'خروج خودکار (عدم فعالیت)' : 'خروج از سیستم',
        ip_address: ip,
        details: `Logout Time: ${getShamsiDate()} ${getTime()}`,
      });
      const theme = localStorage.getItem('theme');
      const snow = localStorage.getItem('snowMode');
      localStorage.clear();
      if (theme) localStorage.setItem('theme', theme);
      if (snow) localStorage.setItem('snowMode', snow);
    }
    setUser(null);
    if (isAuto) setAutoLogoutModal({ minutes: Math.round(inactivityLimit / 60000) });
  }, [user, inactivityLimit, safeInsertSystemLog]);

  const hasCheckedInitialLoadRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    if (!hasCheckedInitialLoadRef.current) {
      hasCheckedInitialLoadRef.current = true;
      // ورود تازه به صفحه (مثلاً تایپ آدرس و اینتر): زمان فعالیت را الان بگذار تا بلافاصله خروج خودکار نگیرد
      localStorage.setItem('lastActivityTime', Date.now().toString());
      return;
    }
    const lastActivity = localStorage.getItem('lastActivityTime');
    if (lastActivity) {
      const diff = Date.now() - parseInt(lastActivity, 10);
      if (diff > inactivityLimit) handleLogout(true);
    }
  }, [user, inactivityLimit, handleLogout]);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 6000);
    return () => clearTimeout(t);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (!user) return;
    localStorage.setItem('lastActivityTime', Date.now().toString());
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    logoutTimerRef.current = setTimeout(() => handleLogout(true), inactivityLimit);
  }, [user, handleLogout, inactivityLimit]);

  useEffect(() => {
    if (!user) return;
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    const handler = () => resetInactivityTimer();
    events.forEach((e) => document.addEventListener(e, handler));
    resetInactivityTimer();
    return () => {
      events.forEach((e) => document.removeEventListener(e, handler));
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [user, resetInactivityTimer]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogin = useCallback(async (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    localStorage.setItem('lastActivityTime', Date.now().toString());
    const ip = await getPublicIp();
    await safeInsertSystemLog({
      user_id: newUser.id,
      user_name: newUser.fullName,
      personnel_code: newUser.personnelCode || (newUser.username === 'admin' ? '9999' : '0000'),
      action: 'ورود به سیستم',
      ip_address: ip,
      details: `Role: ${newUser.role}`,
    });
  }, [safeInsertSystemLog]);

  const handleUpdateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  }, []);

  const value: AppContextValue = {
    user,
    darkMode,
    setDarkMode,
    snowMode,
    setSnowMode,
    showSplash,
    autoLogoutModal,
    setAutoLogoutModal,
    handleLogin,
    handleLogout,
    handleUpdateUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
