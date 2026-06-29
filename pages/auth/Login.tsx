
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { APP_VERSION } from '../../config/appMeta';
import { Lock, User as UserIcon, Eye, EyeOff, LogIn, AlertCircle, Loader2, ShieldCheck, CheckCircle, AlertTriangle, X, Check } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { supabase } from '../../supabaseClient';
import { loginWithPassword, changePassword } from '../../services/auth';
import { formatDbError } from '../../utils/formatDbError';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Reset Password State
  const [isResetMode, setIsResetMode] = useState(false);
  const [tempUser, setTempUser] = useState<User | null>(null);
  const [resetCurrentPass, setResetCurrentPass] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  
  // Connection status: checking | connected | error
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [connectionError, setConnectionError] = useState('');
  
  const [orgLogo, setOrgLogo] = useState<string>('');
  const [orgName, setOrgName] = useState<string>('نرم افزار هوشمند رای‌نو');
  const [loginBackground, setLoginBackground] = useState<string>('');

  useEffect(() => {
    checkConnection();
    loadOrgSettings();
  }, []);

  const loadOrgSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('org_name, org_logo, login_background')
        .order('created_at', { ascending: true })
        .limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      setOrgName(row?.org_name?.trim() || 'نرم افزار هوشمند رای‌نو');
      setOrgLogo(row?.org_logo || '');
      setLoginBackground(row?.login_background || '');
    } catch {
      setOrgLogo('');
    }
  };

  const checkConnection = async () => {
    setConnectionStatus('checking');
    setConnectionError('');
    try {
      const { error } = await supabase
        .from('app_users')
        .select('count', { count: 'exact', head: true });

      if (error) throw error;
      
      setConnectionStatus('connected');
    } catch (err: unknown) {
      console.error('Supabase Connection Error:', err);
      setConnectionStatus('error');
      setConnectionError(formatDbError(err));
    }
  };

  const connectionIndicator = {
    checking: { color: 'bg-yellow-400', pulse: true, title: 'در حال اتصال' },
    connected: { color: 'bg-green-500', pulse: false, title: 'متصل' },
    error: { color: 'bg-red-500', pulse: false, title: 'عدم اتصال' },
  }[connectionStatus];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        const authUser = await loginWithPassword(username, password);

        const dbUser: User = {
            id: authUser.id,
            username: authUser.username,
            fullName: authUser.fullName,
            role: authUser.role,
            isDefaultPassword: authUser.isDefaultPassword,
            personnelCode: authUser.personnelCode,
            avatar:
              authUser.avatar ||
              (String(authUser.username || '').toLowerCase() === 'admin' ? orgLogo || undefined : undefined),
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
        setError(err.message || 'نام کاربری یا رمز عبور اشتباه است');
    } finally {
        setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validation
      if (resetNewPass !== resetConfirmPass) {
          setError('تکرار رمز عبور مطابقت ندارد');
          return;
      }
      if (resetCurrentPass !== password) {
          setError('رمز عبور فعلی اشتباه است');
          return;
      }
      if (resetNewPass === password) {
          setError('رمز عبور جدید نمی‌تواند مشابه رمز فعلی (پیش‌فرض) باشد');
          return;
      }

      setLoading(true);
      setError('');

      if (!tempUser) return;

      try {
          await changePassword(tempUser.id, resetCurrentPass, resetNewPass);

          setResetSuccess(true);
          setTimeout(() => {
              setIsResetMode(false);
              setResetSuccess(false);
              setResetCurrentPass('');
              setResetNewPass('');
              setResetConfirmPass('');
              setPassword('');
          }, 2000);

      } catch (err: any) {
          setError(err.message || 'خطا در تغییر رمز عبور');
      } finally {
          setLoading(false);
      }
  };

  const passwordsMatch = resetNewPass && resetConfirmPass && resetNewPass === resetConfirmPass;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6 relative overflow-hidden font-sans">
      
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {loginBackground ? (
              <>
                  <img
                      src={loginBackground}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 w-full h-full object-cover"
                      decoding="async"
                  />
                  <div className="absolute inset-0 bg-white/15 dark:bg-gray-900/25" />
              </>
          ) : (
              <>
                  <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-primary/5 blur-3xl" />
                  <div className="absolute top-[40%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-500/5 blur-3xl" />
              </>
          )}
      </div>
      
      <div className="w-full max-w-sm z-10">
        
        {/* Branding Section (Title) */}
        <div className="text-center mb-6 space-y-2 animate-fadeIn">
             <h1 className="text-xl font-black text-primary dark:text-primary-accent tracking-tight drop-shadow-sm leading-tight">
                {orgName}
             </h1>
             <p className="text-base font-bold text-gray-600 dark:text-gray-300 tracking-wide">
                سامانه هوشمند نگهداری و تعمیرات
             </p>
        </div>

        {/* Logo Container */}
        <div className="flex flex-col justify-center items-center mb-6 relative z-20 animate-fadeIn delay-100">
             <div className="w-40 h-40 flex items-center justify-center transform hover:scale-105 transition duration-700">
                <Logo className="w-full h-full drop-shadow-2xl" />
             </div>
             <p className="mt-3 text-2xl font-black text-primary dark:text-primary-accent tracking-wide drop-shadow-sm">
                رای‌نو
             </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-[2rem] p-6 shadow-2xl relative animate-slideUp">
            
            {/* وضعیت اتصال DB */}
            <div className="absolute top-4 right-4 flex items-center gap-2 max-w-[calc(100%-2rem)]">
                <div
                    className={`w-2.5 h-2.5 shrink-0 rounded-full ${connectionIndicator.color} ${connectionIndicator.pulse ? 'animate-pulse' : ''}`}
                    title={connectionIndicator.title}
                    aria-label={connectionIndicator.title}
                    role="status"
                />
                {connectionStatus === 'error' && (
                  <button
                    type="button"
                    onClick={checkConnection}
                    className="text-[10px] leading-tight text-red-600 dark:text-red-400 text-right hover:underline"
                    title={connectionError}
                  >
                    عدم اتصال — تلاش مجدد
                  </button>
                )}
            </div>
            {connectionStatus === 'error' && connectionError && (
              <div className="mb-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-300 leading-relaxed">
                {connectionError}
              </div>
            )}

            {isResetMode ? (
                 <form onSubmit={handlePasswordChange} className="space-y-4">
                    {resetSuccess ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-fadeIn">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-green-700">تغییر رمز موفقیت‌آمیز بود</h3>
                            <p className="text-xs text-gray-500">در حال انتقال به صفحه ورود...</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-2">
                                <div className="mx-auto w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <h2 className="text-base font-bold text-gray-800 dark:text-white">تغییر اجباری رمز عبور</h2>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 mr-1">رمز عبور فعلی</label>
                                    <div className="relative">
                                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="password"
                                            placeholder="●●●●●"
                                            value={resetCurrentPass}
                                            onChange={(e) => setResetCurrentPass(e.target.value)}
                                            className="w-full pr-9 pl-4 h-10 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm transition-all tracking-wider"
                                            style={{ fontFamily: 'Verdana, sans-serif' }}
                                            required
                                            autoComplete="current-password"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 mr-1">رمز عبور جدید</label>
                                    <div className="relative">
                                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="password"
                                            placeholder="رمز جدید..."
                                            value={resetNewPass}
                                            onChange={(e) => setResetNewPass(e.target.value)}
                                            className="w-full pr-9 pl-4 h-10 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 mr-1">تکرار رمز عبور جدید</label>
                                    <div className="relative">
                                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="password"
                                            placeholder="تکرار رمز جدید..."
                                            value={resetConfirmPass}
                                            onChange={(e) => setResetConfirmPass(e.target.value)}
                                            className={`w-full pr-9 pl-4 h-10 bg-gray-50 dark:bg-gray-900/50 border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm transition-all ${resetConfirmPass && !passwordsMatch ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                                            required
                                        />
                                        {resetConfirmPass && (
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                                {passwordsMatch ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" />}
                                            </div>
                                        )}
                                    </div>
                                    {resetConfirmPass && !passwordsMatch && (
                                        <p className="text-[10px] text-red-500 mr-1 animate-pulse">تکرار رمز عبور مطابقت ندارد</p>
                                    )}
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-500 text-xs text-center bg-red-50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100 flex items-center justify-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {error}
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={loading || !passwordsMatch || !resetNewPass}
                                className="w-full bg-primary hover-primary-dark text-white h-10 rounded-2xl font-bold text-sm transition-all transform active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'ذخیره و ورود'}
                            </button>
                        </>
                    )}
                 </form>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Added Header to Login Box */}
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-black text-gray-800 dark:text-white mb-2">ورود به حساب کاربری</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">لطفا نام کاربری و رمز عبور خود را وارد کنید</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-300 mr-1">نام کاربری</label>
                            <div className="relative group">
                                <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="نام کاربری خود را وارد کنید"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pr-10 pl-4 h-12 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-gray-800 dark:text-gray-100 text-sm"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-300 mr-1">رمز عبور</label>
                            <div className="relative group">
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="●●●●●"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pr-10 pl-10 h-12 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-gray-800 dark:text-gray-100 tracking-wider text-sm"
                                    style={{ fontFamily: showPassword ? 'inherit' : 'Verdana, sans-serif' }}
                                    required
                                    autoComplete="current-password"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-0 top-0 bottom-0 px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center justify-center"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && (
                    <div className="text-red-500 text-xs text-center bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/20 flex items-center justify-center gap-2 animate-shake font-bold">
                         <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover-primary-dark text-white h-12 rounded-2xl font-bold text-sm transition-all transform active:scale-[0.98] shadow-xl shadow-primary/20 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-wait"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : (
                            <>
                                <span>ورود به سیستم</span>
                                <LogIn className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>
            )}
        </div>

        <div className="text-center space-y-1 pb-4 mt-6">
            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 font-light opacity-80">
                <span>نسخه {APP_VERSION}</span>
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-[10px] font-medium tracking-widest uppercase opacity-80">
                DESIGNED & DEVELOPED BY H.PARSA
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
