
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { APP_VERSION } from '../../constants';
import { Lock, User as UserIcon, Eye, EyeOff, LogIn, AlertCircle, Database, Copy, X, Check, Loader2, ShieldCheck, CheckCircle, HelpCircle, AlertTriangle } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { supabase } from '../../supabaseClient';
import { DB_SETUP_SQL } from '../../dbSchema';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [isResetMode, setIsResetMode] = useState(false);
  const [tempUser, setTempUser] = useState<User | null>(null);
  const [resetCurrentPass, setResetCurrentPass] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [connectionMsg, setConnectionMsg] = useState('');
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('count', { count: 'exact', head: true });

      if (error) throw error;
      setConnectionStatus('connected');
      setConnectionMsg('ارتباط با سرور برقرار است');
    } catch (err: any) {
      console.error("Supabase Connection Error:", err);
      setConnectionStatus('error');
      let msg = "خطای ناشناخته در اتصال";
      if (typeof err === 'string') msg = err;
      else if (err?.code === '42P01') msg = "جداول دیتابیس ساخته نشده‌اند";
      else if (err?.message) msg = err.message;
      setConnectionMsg(msg);
    }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(DB_SETUP_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const adminUser: User = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    username: 'admin',
    fullName: 'مدیر سیستم',
    role: UserRole.ADMIN,
    passwordHash: '12381',
    isDefaultPassword: false 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (username.toLowerCase() === 'admin' && password === '12381') {
      if (adminUser.isDefaultPassword) {
        setIsResetMode(true);
        setTempUser(adminUser);
        setLoading(false);
        return;
      }
      onLogin(adminUser);
      setLoading(false);
      return;
    }

    try {
        const { data, error } = await supabase
            .from('app_users')
            .select('*, personnel(full_name, personnel_code, profile_picture, unit)')
            .eq('username', username)
            .single();

        if (error || !data || data.password !== password) throw new Error('نام کاربری یا رمز عبور اشتباه است');

        const dbUser: User = {
            id: data.id,
            username: data.username,
            fullName: data.personnel?.full_name || data.username,
            role: data.role as UserRole,
            passwordHash: '***',
            isDefaultPassword: data.is_default_password,
            personnelCode: data.personnel?.personnel_code,
            avatar: data.avatar || data.personnel?.profile_picture
        };

        if (dbUser.isDefaultPassword) {
            setIsResetMode(true);
            setTempUser(dbUser);
            setLoading(false);
            return;
        }

        onLogin(dbUser);

    } catch (err: any) {
        console.warn('Login Failed:', err.message);
        setError('نام کاربری یا رمز عبور اشتباه است');
    } finally {
        setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      if (resetNewPass !== resetConfirmPass) { setError('تکرار رمز عبور مطابقت ندارد'); return; }
      if (resetCurrentPass !== password) { setError('رمز عبور فعلی اشتباه است'); return; }
      if (resetNewPass === password) { setError('رمز عبور جدید نمی‌تواند مشابه رمز فعلی باشد'); return; }

      setLoading(true);
      setError('');

      try {
          if (tempUser?.username === 'admin') {
               // Admin mock reset
          } else if (tempUser) {
              const { error } = await supabase.from('app_users').update({ password: resetNewPass, is_default_password: false }).eq('id', tempUser.id);
              if (error) throw error;
          }
          setResetSuccess(true);
          setTimeout(() => { setIsResetMode(false); setResetSuccess(false); setResetCurrentPass(''); setResetNewPass(''); setResetConfirmPass(''); setPassword(''); }, 2000);
      } catch (err: any) {
          setError('خطا در تغییر رمز عبور: ' + err.message);
      } finally {
          setLoading(false);
      }
  };

  const passwordsMatch = resetNewPass && resetConfirmPass && resetNewPass === resetConfirmPass;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-[#800020]/5 blur-3xl"></div>
          <div className="absolute top-[40%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-500/5 blur-3xl"></div>
      </div>
      <div className="w-full max-w-sm z-10">
        <div className="text-center mb-6 space-y-2 animate-fadeIn">
             <h1 className="text-xl font-black text-[#800020] dark:text-red-400 tracking-tight drop-shadow-sm leading-tight">شرکت توسعه معدنی و صنعتی صبانور</h1>
             <p className="text-base font-bold text-gray-600 dark:text-gray-300 tracking-wide">سامانه هوشمند نگهداری و تعمیرات</p>
        </div>
        <div className="flex justify-center items-center mb-6 relative z-20 animate-fadeIn delay-100">
             <div className="w-40 h-40 flex items-center justify-center transform hover:scale-105 transition duration-700">
                <Logo className="w-full h-full drop-shadow-2xl" />
             </div>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-[2rem] p-6 shadow-2xl relative animate-slideUp">
            <div className="absolute top-4 right-4">
                {connectionStatus === 'checking' && <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>}
                {connectionStatus === 'connected' && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                {connectionStatus === 'error' && (
                    <button onClick={() => setShowSql(true)} className="text-red-500 hover:text-red-700 transition" title={connectionMsg}><HelpCircle className="w-5 h-5" /></button>
                )}
            </div>
            {isResetMode ? (
                 <form onSubmit={handlePasswordChange} className="space-y-4">
                    {resetSuccess ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-fadeIn">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2"><CheckCircle className="w-10 h-10 text-green-600" /></div>
                            <h3 className="text-lg font-bold text-green-700">تغییر رمز موفقیت‌آمیز بود</h3>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-2"><h2 className="text-base font-bold text-gray-800 dark:text-white">تغییر اجباری رمز عبور</h2></div>
                            <div className="space-y-3">
                                <input type="text" placeholder="رمز فعلی..." value={resetCurrentPass} onChange={(e) => setResetCurrentPass(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-gray-700" required />
                                <input type="password" placeholder="رمز جدید..." value={resetNewPass} onChange={(e) => setResetNewPass(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-gray-700" required />
                                <input type="password" placeholder="تکرار رمز جدید..." value={resetConfirmPass} onChange={(e) => setResetConfirmPass(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-gray-700" required />
                            </div>
                            {error && <div className="text-red-500 text-xs text-center">{error}</div>}
                            <button type="submit" disabled={loading || !passwordsMatch} className="w-full bg-[#b91c1c] text-white h-10 rounded-2xl font-bold text-sm">{loading ? '...' : 'ذخیره'}</button>
                        </>
                    )}
                 </form>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="text-center mb-6"><h2 className="text-xl font-black text-gray-800 dark:text-white mb-2">ورود به حساب کاربری</h2></div>
                    <div className="space-y-4">
                        <div className="relative group"><UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="نام کاربری" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pr-10 pl-4 h-12 bg-gray-50 dark:bg-gray-900/50 border rounded-2xl" required /></div>
                        <div className="relative group"><Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type={showPassword ? 'text' : 'password'} placeholder="رمز عبور" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pr-10 pl-10 h-12 bg-gray-50 dark:bg-gray-900/50 border rounded-2xl" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-3 text-gray-400">{showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}</button></div>
                    </div>
                    {error && <div className="text-red-500 text-xs text-center flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}
                    <button type="submit" disabled={loading} className="w-full bg-[#b91c1c] hover:bg-[#991b1b] text-white h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">{loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <span>ورود به سیستم</span>}</button>
                </form>
            )}
        </div>
        <div className="text-center space-y-1 pb-4 mt-6">
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-light opacity-80">نسخه {APP_VERSION}</div>
            <p className="text-gray-400 dark:text-gray-500 text-[10px] font-medium tracking-widest uppercase opacity-80">DESIGNED & DEVELOPED BY H.PARSA</p>
        </div>
      {showSql && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                      <h3 className="font-bold flex items-center gap-2 text-gray-700 dark:text-gray-200"><Database className="w-5 h-5 text-blue-600" />اسکریپت ساخت دیتابیس</h3>
                      <button onClick={() => setShowSql(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="flex-1 overflow-auto p-4 bg-gray-900 text-gray-300 font-mono text-xs relative">
                      <pre>{DB_SETUP_SQL}</pre>
                      <button onClick={copyToClipboard} className="absolute top-4 left-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? 'کپی شد' : 'کپی کد'}</button>
                  </div>
              </div>
          </div>
      )}
    </div>
    </div>
  );
};

export default Login;
