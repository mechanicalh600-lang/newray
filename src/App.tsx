
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SnowEffect } from './components/SnowEffect';
import { ChatAssistant } from './components/ChatAssistant'; 
import { SplashScreen } from './components/SplashScreen'; 
import { User, UserRole } from './types';
import { getShamsiDate, getTime, getPublicIp } from './utils';
import { supabase } from './supabaseClient';
import { Loader2 } from 'lucide-react';
import { getRoutes } from './routes';

// Loading Fallback Component
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center h-full w-full min-h-[400px]">
    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
    <span className="text-gray-500 text-sm">در حال بارگذاری...</span>
  </div>
);

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [inactivityLimit, setInactivityLimit] = useState(300000); // Default 5 mins
  
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      localStorage.removeItem('currentUser');
      return null;
    }
  });
  
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [snowMode, setSnowMode] = useState<boolean>(() => {
    return localStorage.getItem('snowMode') === 'true';
  });

  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
      const fetchSettings = async () => {
          try {
              const { data } = await supabase.from('app_settings').select('session_timeout_minutes').single();
              if (data && data.session_timeout_minutes) {
                  setInactivityLimit(data.session_timeout_minutes * 60000);
              }
          } catch (e) {
              console.warn("Failed to fetch settings, using defaults.");
          }
      };
      fetchSettings();
  }, []);

  useEffect(() => {
      const lastActivity = localStorage.getItem('lastActivityTime');
      if (lastActivity && user) {
        const diff = Date.now() - parseInt(lastActivity, 10);
        if (diff > inactivityLimit) {
          handleLogout(true);
        }
      }
  }, [user, inactivityLimit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = useCallback(async (isAuto = false) => {
    if (user) {
        const ip = await getPublicIp();
        try {
            await supabase.from('system_logs').insert([{
                user_id: user.id,
                user_name: user.fullName,
                personnel_code: user.personnelCode || '---',
                action: isAuto ? 'خروج خودکار (عدم فعالیت)' : 'خروج از سیستم',
                ip_address: ip,
                details: `Logout Time: ${getShamsiDate()} ${getTime()}`
            }]);
        } catch (error) {}
        const theme = localStorage.getItem('theme');
        const snow = localStorage.getItem('snowMode');
        localStorage.clear();
        if (theme) localStorage.setItem('theme', theme);
        if (snow) localStorage.setItem('snowMode', snow);
    }
    setUser(null);
    if (isAuto) alert(`کاربر گرامی، به دلیل عدم فعالیت بیش از ${Math.round(inactivityLimit/60000)} دقیقه، جهت امنیت از سیستم خارج شدید.`);
  }, [user, inactivityLimit]);

  const resetInactivityTimer = useCallback(() => {
    if (!user) return;
    localStorage.setItem('lastActivityTime', Date.now().toString());
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }
    logoutTimerRef.current = setTimeout(() => {
      handleLogout(true);
    }, inactivityLimit);
  }, [user, handleLogout, inactivityLimit]);

  useEffect(() => {
    if (!user) return;
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    const activityHandler = () => resetInactivityTimer();
    events.forEach(event => document.addEventListener(event, activityHandler));
    resetInactivityTimer();
    return () => {
      events.forEach(event => document.removeEventListener(event, activityHandler));
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

  const handleLogin = async (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    localStorage.setItem('lastActivityTime', Date.now().toString());
    try {
        const ip = await getPublicIp();
        await supabase.from('system_logs').insert([{
            user_id: newUser.id,
            user_name: newUser.fullName,
            personnel_code: newUser.personnelCode || (newUser.username === 'admin' ? '9999' : '0000'),
            action: 'ورود به سیستم',
            ip_address: ip,
            details: `Role: ${newUser.role}`
        }]);
    } catch (error) {}
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  };

  if (showSplash) {
    return <SplashScreen />;
  }

  const routes = getRoutes(user, handleLogin, handleUpdateUser, snowMode, setSnowMode);

  return (
    <HashRouter>
      <SnowEffect enabled={snowMode} />
      {user && <ChatAssistant user={user} />}
      <Layout 
        user={user} 
        onLogout={() => handleLogout(false)}
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode(!darkMode)}
      >
          <Suspense fallback={<PageLoader />}>
            <Routes>
                {routes.map((route, index) => {
                  if (route.protected && !user) {
                    return <Route key={index} path={route.path} element={<Navigate to="/login" />} />;
                  }
                  if (route.adminOnly && user?.role !== UserRole.ADMIN) {
                    return <Route key={index} path={route.path} element={<Navigate to="/" />} />;
                  }
                  return <Route key={index} path={route.path} element={route.element} />;
                })}
                <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
            </Routes>
          </Suspense>
      </Layout>
    </HashRouter>
  );
};

export default App;
