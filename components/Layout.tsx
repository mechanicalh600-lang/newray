
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ChevronRight, ChevronUp, LogOut, User as UserIcon, Moon, Sun, PanelRightClose, PanelRightOpen, ChevronDown, Bell, CheckCircle, Clock, AlertTriangle, FileText, MessageSquare, ArrowRight } from 'lucide-react';
import { MENU_ITEMS } from '../constants';
import { UserProvider } from '../contexts/UserContext';
import { User, Note } from '../types';
import { getUnreadMessageCount, getUnreadCartableCount } from '../workflowStore';
import { supabase } from '../supabaseClient';
import { compareShamsiDateTime, getShamsiDate, getTime, gregorianToJalali } from '../utils';
import { getActiveReportDefinitions } from '../services/reportDefinitions';
import { ShamsiDatePicker } from './ShamsiDatePicker';
import { ClockTimePicker } from './ClockTimePicker';
import { Logo } from './Logo';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, darkMode, toggleDarkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile state
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop state
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]); // Track expanded groups
  const [unreadCount, setUnreadCount] = useState(0);
  const [cartableUnreadCount, setCartableUnreadCount] = useState(0); // New State
  const [activeAlert, setActiveAlert] = useState<Note | null>(null);
  const [showSnoozePicker, setShowSnoozePicker] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState('');
  const [snoozeTime, setSnoozeTime] = useState('');
  const [dynamicReportSubmenu, setDynamicReportSubmenu] = useState<any[]>([]);
  
  // Exit Confirmation State
  const [showExitModal, setShowExitModal] = useState(false);

  // اعلان سراسری
  const [announcementModal, setAnnouncementModal] = useState<{ message: string; settingsId: string; version: number } | null>(null);

  const navigate = useNavigate();

  // درخواست مجوز نوتیفیکیشن مرورگر هنگام ورود کاربر
  useEffect(() => {
    if (!user) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);
  const location = useLocation();

  const isLoginPage = location.pathname === '/login';

  useEffect(() => {
    const loadDynamicReports = async () => {
      const defs = await getActiveReportDefinitions();
      const existingPaths = new Set(
        MENU_ITEMS.flatMap((m: any) => (m.submenu || []).map((s: any) => s.path))
      );
      const items = defs
        .filter(def => {
          const p = (def.template_schema as any)?.modulePath;
          return !p || !existingPaths.has('/' + String(p).replace(/^\/+/, ''));
        })
        .map(def => ({
          id: `dyn-${def.slug}`,
          title: def.title,
          icon: FileText,
          path: `/reports/${def.slug}`,
        }));
      setDynamicReportSubmenu(items);
    };

    const handleReportDefsChanged = () => {
      loadDynamicReports();
    };

    loadDynamicReports();
    window.addEventListener('report-definitions-changed', handleReportDefsChanged as EventListener);
    return () => window.removeEventListener('report-definitions-changed', handleReportDefsChanged as EventListener);
  }, []);

  const menuItems = useMemo(() => {
    return MENU_ITEMS.map(item => {
      if (item.id !== 'reports-group' || !item.submenu) return item;
      const existingPaths = new Set(item.submenu.map((sub: any) => sub.path));
      const merged = [
        ...item.submenu,
        ...dynamicReportSubmenu.filter(sub => !existingPaths.has(sub.path)),
      ];
      return { ...item, submenu: merged };
    });
  }, [dynamicReportSubmenu]);

  const flattenMenuByPath = (items: any[]): { path: string; title: string }[] => {
    const out: { path: string; title: string }[] = [];
    for (const m of items) {
      if (m.path && m.path !== '#') out.push({ path: m.path, title: m.title });
      if (m.submenu) out.push(...flattenMenuByPath(m.submenu));
    }
    return out;
  };

  // Reset sidebar state when user logs out or logs in
  useEffect(() => {
    setExpandedMenus([]);
    setSidebarOpen(false);
  }, [user]);

  // Handle Mobile Back Button on Dashboard to confirm exit
  useEffect(() => {
    if (location.pathname === '/' && user) {
        // Push a dummy state to history to trap the back action
        window.history.pushState(null, '', window.location.href);

        const onPopState = () => {
            // When back button is pressed, push state again to stay on page and show modal
            window.history.pushState(null, '', window.location.href);
            setShowExitModal(true);
        };

        window.addEventListener('popstate', onPopState);

        return () => {
            window.removeEventListener('popstate', onPopState);
        };
    }
  }, [location.pathname, user]);

  const hasPathInSubmenu = (subs: any[], path: string): boolean => {
    if (!subs) return false;
    for (const sub of subs) {
      if (sub.path === path) return true;
      if (sub.submenu && hasPathInSubmenu(sub.submenu, path)) return true;
    }
    return false;
  };

  // Automatically expand menus if current path is inside them
  useEffect(() => {
    const toExpand: string[] = [];
    menuItems.forEach(item => {
      if (item.submenu) {
        if (hasPathInSubmenu(item.submenu, location.pathname) && !expandedMenus.includes(item.id)) {
          toExpand.push(item.id);
        }
        item.submenu?.forEach((sub: any) => {
          if (sub.submenu && hasPathInSubmenu(sub.submenu, location.pathname) && !expandedMenus.includes(sub.id)) {
            toExpand.push(sub.id);
          }
        });
      }
    });
    if (toExpand.length > 0) {
      setExpandedMenus(prev => [...new Set([...prev, ...toExpand])]);
    }
  }, [location.pathname, menuItems]);

  // Poll for unread messages/cartable and Check Reminders
  useEffect(() => {
    if (!user) return;

    const checkUpdates = async () => {
      // 1. Messages
      const msgCount = await getUnreadMessageCount(user.id, user.role);
      setUnreadCount(msgCount);

      // 2. Cartable Items (New)
      const cartCount = await getUnreadCartableCount(user.id, user.role);
      setCartableUnreadCount(cartCount);

      // 3. Reminder Check
      checkReminders();
    };

    const playReminderBeep = async () => {
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            if (!Ctx) return;
            const audioContext = new Ctx();
            if (audioContext.state === 'suspended') await audioContext.resume();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.15);
            oscillator.frequency.setValueAtTime(1320, audioContext.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.35, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch {
            try { new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + 'tv'.repeat(100)).play(); } catch { /* fallback silent */ }
        }
    };

    const showReminderNotification = (note: any) => {
        const title = note.title || 'یادآوری';
        const body = (note.content || 'زمان انجام این کار فرا رسیده است.').slice(0, 100);
        const dateStr = [note.reminder_date, note.reminder_time].filter(Boolean).join(' - ');
        if ('Notification' in window && Notification.permission === 'granted') {
            const n = new Notification('🔔 ' + title, {
                body: dateStr ? `${body}\n⏰ ${dateStr}` : body,
                icon: '/favicon.ico',
                tag: 'note-' + note.id,
                requireInteraction: true,
            });
            n.onclick = () => { window.focus(); n.close(); };
        }
    };

    const checkReminders = async () => {
        try {
            const { data, error } = await supabase
                .from('personal_notes')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_completed', false)
                .not('reminder_date', 'is', null);

            if (error) throw error;
            if (!data || data.length === 0) return;

            const currentDate = getShamsiDate();
            const currentTime = getTime();

            const dueNote = data.find((n: any) => {
                if (n.reminder_dismissed === true) return false;
                const rd = (n.reminder_date || '').trim();
                const rt = (n.reminder_time || '00:00').trim();
                if (!rd) return false;
                const cmp = compareShamsiDateTime(rd, rt, currentDate, currentTime);
                return cmp <= 0;
            });

            if (dueNote) {
                const mapped: Note = {
                    id: dueNote.id,
                    userId: dueNote.user_id,
                    title: dueNote.title,
                    content: dueNote.content,
                    tags: dueNote.tags || [],
                    reminderDate: dueNote.reminder_date,
                    reminderTime: dueNote.reminder_time,
                    isCompleted: dueNote.is_completed,
                    createdAt: dueNote.created_at,
                    reminderSeen: false,
                };
                setActiveAlert(mapped);
                playReminderBeep();
                showReminderNotification(dueNote);
                try { window.focus(); } catch { /* ignore */ }
            }
        } catch (e) {
            console.error("Reminder check failed", e);
        }
    };

    checkUpdates();
    checkReminders(); // بررسی فوری هنگام لود
    const interval = setInterval(checkUpdates, 30000);
    const reminderInterval = setInterval(checkReminders, 5000); // هر ۵ ثانیه
    const onNotesSaved = () => checkReminders();
    window.addEventListener('notes-reminder-saved', onNotesSaved);
    return () => {
      clearInterval(interval);
      clearInterval(reminderInterval);
      window.removeEventListener('notes-reminder-saved', onNotesSaved);
    };
  }, [user]);

  // اعلان سراسری: بررسی و نمایش به کاربرانی که هنوز «متوجه شدم» نزده‌اند
  useEffect(() => {
    if (!user) return;

    const checkAnnouncement = async () => {
      try {
        const { data: settingsRows } = await supabase
          .from('app_settings')
          .select('id, announcement_active, announcement_message, announcement_version')
          .order('created_at', { ascending: true })
          .limit(1);
        const row = Array.isArray(settingsRows) ? settingsRows[0] : null;
        if (!row || !row.announcement_active || !row.announcement_message?.trim()) return;

        const currentVersion = row.announcement_version ?? 1;

        const { data: ackRows } = await supabase
          .from('announcement_acknowledgments')
          .select('acknowledged_version')
          .eq('user_id', user.id)
          .eq('app_settings_id', row.id)
          .limit(1);
        const ack = Array.isArray(ackRows) ? ackRows[0] : null;
        const userVersion = ack?.acknowledged_version ?? 0;

        if (currentVersion > userVersion) {
          setAnnouncementModal({
            message: row.announcement_message.trim(),
            settingsId: row.id,
            version: currentVersion,
          });
        }
      } catch (e) {
        console.error('Announcement check failed', e);
      }
    };

    checkAnnouncement();
  }, [user]);

  const handleAnnouncementAck = async () => {
    if (!announcementModal || !user) return;
    try {
      await supabase.from('announcement_acknowledgments').upsert(
        {
          user_id: user.id,
          app_settings_id: announcementModal.settingsId,
          acknowledged_version: announcementModal.version,
          acknowledged_at: new Date().toISOString(),
        },
        { onConflict: ['user_id', 'app_settings_id'] }
      );
    } catch (e) {
      console.error('Announcement ack failed', e);
      alert('خطا در ثبت. لطفاً دوباره تلاش کنید.');
    }
    setAnnouncementModal(null);
  };

  const openSnoozePicker = () => {
      if (!activeAlert) return;
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const { jy, jm, jd } = gregorianToJalali(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate());
      setSnoozeDate(`${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`);
      setSnoozeTime(activeAlert.reminderTime || getTime());
      setShowSnoozePicker(true);
  };

  const cancelSnooze = () => {
      setShowSnoozePicker(false);
      setActiveAlert(null);
  };

  const handleGotIt = async () => {
      if (!activeAlert) return;
      try {
          await supabase.from('personal_notes').update({ reminder_dismissed: true }).eq('id', activeAlert.id);
          setActiveAlert(null);
          setShowSnoozePicker(false);
      } catch (e) {
          console.error(e);
      }
  };

  const confirmSnooze = async () => {
      if (!activeAlert || !snoozeDate || !snoozeTime) {
          alert('لطفاً تاریخ و ساعت را انتخاب کنید.');
          return;
      }
      try {
          await supabase.from('personal_notes').update({ reminder_date: snoozeDate, reminder_time: snoozeTime, reminder_dismissed: false }).eq('id', activeAlert.id);
          setShowSnoozePicker(false);
          setActiveAlert(null);
      } catch (e) {
          console.error(e);
          alert('خطا در بروزرسانی یادآوری.');
      }
  };

  const dismissAlert = () => {
      if (!activeAlert) return;
      setActiveAlert(null);
      setShowSnoozePicker(false);
  };

  const completeFromAlert = async () => {
      if (!activeAlert) return;
      try {
          await supabase.from('personal_notes').update({ is_completed: true }).eq('id', activeAlert.id);
          setActiveAlert(null);
          setShowSnoozePicker(false);
          alert('یادداشت انجام شد.');
      } catch (e) {
          console.error(e);
      }
  };

  const confirmLogout = () => {
      setShowExitModal(false);
      onLogout();
  };

  const allExpandableIds = useMemo(() => {
    const ids: string[] = [];
    menuItems.forEach(item => {
      if (item.submenu) {
        ids.push(item.id);
        item.submenu?.forEach((sub: any) => {
          if (sub.submenu) ids.push(sub.id);
        });
      }
    });
    return ids;
  }, [menuItems]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const getHierarchicalBackPath = (currentPath: string) => {
    if (currentPath === '/') return '/';

    // Dynamic/detail routes should go to their logical list page.
    if (currentPath.startsWith('/work-orders/')) return '/work-orders';
    if (currentPath.startsWith('/admin/')) return '/admin';
    if (currentPath.startsWith('/reports/')) return '/reports';
    if (currentPath.startsWith('/report-template-preview')) return '/';

    // If current page is a direct top-level menu item, go to dashboard.
    const directItem = menuItems.find(item => !item.submenu && item.path === currentPath);
    if (directItem) return '/';

    // If current page is inside a group, go to that group's landing page.
    const parentGroup = menuItems.find(item => item.submenu && hasPathInSubmenu(item.submenu, currentPath));
    if (parentGroup) {
      const groupLandingById: Record<string, string> = {
        'reports-group': '/',
        'base-info': '/admin',
        'system-settings': '/system-config',
      };

      if (groupLandingById[parentGroup.id]) {
        return groupLandingById[parentGroup.id];
      }
    }

    return '/';
  };

  const handleBack = () => {
    // در صفحه طراحی فرم گزارش، بازگشت = برگشت به لیست رکوردها (همان صفحه)
    if (location.pathname === '/report-form-design') {
      window.dispatchEvent(new CustomEvent('report-form-design-back-to-list'));
      return;
    }
    // در صفحه طراحی قالب گزارش، بازگشت = برگشت به لیست رکوردها (همان صفحه)
    if (location.pathname === '/report-template-design') {
      window.dispatchEvent(new CustomEvent('report-template-design-back-to-list'));
      return;
    }
    const targetPath = getHierarchicalBackPath(location.pathname);
    navigate(targetPath);
  };

  const isHome = location.pathname === '/';

  const toggleSubMenu = (id: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setExpandedMenus([id]);
    } else {
      setExpandedMenus(prev => 
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
    }
  };

  const handleExpandAll = () => setExpandedMenus(allExpandableIds);
  const handleCollapseAll = () => setExpandedMenus([]);

  const handleItemClick = (item: any) => {
    if (item.submenu) {
      toggleSubMenu(item.id);
    } else {
      navigate(item.path);
      setSidebarOpen(false); // Close mobile sidebar on navigation
    }
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {/* اعلان سراسری */}
      {announcementModal && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-t-4 border-yellow-500">
            <div className="p-6">
              <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-400 mb-4">
                <div className="bg-yellow-100 dark:bg-yellow-900/20 p-3 rounded-full">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">اعلان سراسری</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                {announcementModal.message}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4">
              <button
                onClick={handleAnnouncementAck}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {activeAlert && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto">
              <div className={`bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-950/30 dark:via-gray-800 dark:to-orange-950/20 rounded-3xl shadow-2xl w-full border border-amber-200/60 dark:border-amber-700/40 ring-4 ring-amber-400/20 dark:ring-amber-500/10 my-8 ${showSnoozePicker ? 'max-w-2xl min-h-[420px] overflow-visible' : 'max-w-lg overflow-hidden'}`}>
                  <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  <div className="relative p-6 overflow-visible">
                      {showSnoozePicker ? (
                          <>
                              <h3 className="font-bold text-xl text-gray-800 dark:text-white mb-6">چه زمانی دوباره یادآوری کنم؟</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                  <div className="min-w-0">
                                      <ShamsiDatePicker label="تاریخ یادآوری" value={snoozeDate} onChange={setSnoozeDate} disableFuture={false} />
                                  </div>
                                  <div className="min-w-0">
                                      <ClockTimePicker label="ساعت" value={snoozeTime} onChange={setSnoozeTime} />
                                  </div>
                              </div>
                          </>
                      ) : (
                          <>
                              <div className="flex items-start gap-4">
                                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse">
                                      <Bell className="w-7 h-7 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <span className="text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">یادآوری</span>
                                      <h4 className="font-black text-xl text-gray-900 dark:text-white mt-1 mb-2 leading-tight">{activeAlert.title}</h4>
                                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-3 line-clamp-3">
                                          {activeAlert.content || 'زمان انجام این کار فرا رسیده است.'}
                                      </p>
                                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium bg-amber-100/50 dark:bg-amber-900/20 rounded-xl px-3 py-2 w-fit">
                                          <Clock className="w-4 h-4" />
                                          {activeAlert.reminderTime && activeAlert.reminderDate ? `${activeAlert.reminderTime} - ${activeAlert.reminderDate}` : activeAlert.reminderDate || activeAlert.reminderTime || ''}
                                      </div>
                                  </div>
                              </div>
                          </>
                      )}
                  </div>
                  <div className="p-4 flex flex-wrap gap-3 bg-gradient-to-r from-gray-50/80 to-amber-50/50 dark:from-gray-900/50 dark:to-amber-950/20 border-t border-amber-100 dark:border-amber-900/30">
                      {showSnoozePicker ? (
                          <>
                              <button onClick={() => setShowSnoozePicker(false)} className="py-3 px-4 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-bold text-sm transition-all flex items-center gap-1">
                                  <ArrowRight className="w-4 h-4" /> برگشت
                              </button>
                              <button onClick={cancelSnooze} className="flex-1 py-3 px-4 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-bold text-sm transition-all">
                                  انصراف
                              </button>
                              <button onClick={confirmSnooze} className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                                  <CheckCircle className="w-5 h-5" /> تأیید
                              </button>
                          </>
                      ) : (
                          <>
                              <button 
                                onClick={handleGotIt} 
                                className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                              >
                                  متوجه شدم
                              </button>
                              <button 
                                onClick={completeFromAlert} 
                                className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                              >
                                  <CheckCircle className="w-5 h-5" /> انجام شد
                              </button>
                              <button 
                                onClick={openSnoozePicker} 
                                className="flex-1 py-3 px-4 text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/30 hover:bg-amber-200/80 dark:hover:bg-amber-800/40 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                              >
                                  بعدا یادآوری کن
                              </button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Exit/Logout Confirmation Modal */}
      {showExitModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden transform transition-all scale-100">
                  <div className="p-6 text-center">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <LogOut className="w-8 h-8 text-red-600" />
                      </div>
                      <h3 className="text-lg font-black text-gray-800 dark:text-white mb-2">خروج از حساب کاربری</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                          آیا مطمئن هستید که می‌خواهید از برنامه خارج شوید؟
                      </p>
                      <div className="flex gap-3">
                          <button 
                              onClick={() => setShowExitModal(false)} 
                              className="flex-1 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition"
                          >
                              انصراف
                          </button>
                          <button 
                              onClick={confirmLogout} 
                              className="flex-1 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-900/20 transition"
                          >
                              بله، خروج
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 right-0 z-50 h-full bg-white dark:bg-gray-800 shadow-xl transition-all duration-300 ease-in-out border-l dark:border-gray-700
        ${sidebarOpen ? 'translate-x-0 w-64' : 'translate-x-full w-64'}
        md:relative md:translate-x-0 md:flex-shrink-0
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div className="transition-transform duration-300 hover:scale-110 hover:rotate-12 cursor-default">
                  <Logo className="w-9 h-9 object-contain flex-shrink-0" />
                </div>
                <h2 className="text-xl font-bold text-primary dark:text-red-400 whitespace-nowrap">رای‌نو</h2>
              </div>
            )}
            
            {/* Mobile Close */}
            <button onClick={() => setSidebarOpen(false)} className="md:hidden">
              <X className="w-6 h-6" />
            </button>

            <div className="hidden md:flex items-center gap-1">
              {/* Expand/Collapse Submenus */}
              {!isCollapsed && allExpandableIds.length > 0 && (
                <button
                  onClick={() => expandedMenus.length >= allExpandableIds.length ? handleCollapseAll() : handleExpandAll()}
                  title={expandedMenus.length >= allExpandableIds.length ? 'بستن همه' : 'باز کردن همه'}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                  {expandedMenus.length >= allExpandableIds.length ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              )}
              {/* Sidebar Collapse Toggle */}
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)} 
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                title={isCollapsed ? "باز کردن منو" : "بستن منو"}
              >
                {isCollapsed ? <PanelRightOpen className="w-5 h-5" /> : <PanelRightClose className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          {/* User Profile Summary */}
          <div 
            onClick={() => {
              navigate('/settings');
              setSidebarOpen(false);
            }}
            className={`
              p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group relative flex items-center gap-3
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? user?.fullName : "تنظیمات کاربری"}
          >
            <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-600 group-hover:border-primary transition-all shadow-sm">
               {user?.avatar ? <img src={user.avatar} alt="User" className="w-full h-full object-cover"/> : <UserIcon className="w-5 h-5" />}
            </div>
            
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className="font-medium truncate text-sm group-hover:text-primary transition-colors">{user?.fullName}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user?.role}</p>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-4 overflow-x-hidden no-scrollbar">
            {menuItems.map((item) => {
              if (item.id === 'settings') return null;
              if (item.role && user?.role !== item.role && user?.role !== 'ADMIN') return null;
              
              const hasSubmenu = !!item.submenu;
              const isExpanded = expandedMenus.includes(item.id);
              
              // Check if parent is active (if any child is active, including nested)
              const isParentActive = hasSubmenu && hasPathInSubmenu(item.submenu || [], location.pathname);
              const isActive = !hasSubmenu && location.pathname === item.path;
              
              // Notification Logic
              const hasMsgNotification = item.id === 'messages' && unreadCount > 0;
              const hasCartableNotification = item.id === 'inbox' && cartableUnreadCount > 0;
              
              const showBadge = hasMsgNotification || hasCartableNotification;
              const badgeCount = item.id === 'messages' ? unreadCount : cartableUnreadCount;

              return (
                <div key={item.id}>
                  <button
                    onClick={() => handleItemClick(item)}
                    title={isCollapsed ? item.title : ''}
                    className={`
                      w-full flex items-center gap-3 py-3 transition-colors relative group
                      ${isCollapsed ? 'justify-center px-2' : 'px-6 text-right justify-between'}
                      ${(isActive || isParentActive)
                        ? 'text-primary dark:text-red-400 bg-primary/5 dark:bg-primary/10' 
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                    `}
                  >
                    <div className="flex items-center gap-3 relative">
                        <div className="relative">
                            <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform ${showBadge ? 'animate-pulse' : ''} ${(isActive || isParentActive) && !isCollapsed ? 'scale-110' : ''}`} />
                            {showBadge && isCollapsed && (
                                <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                            )}
                        </div>
                        
                        {!isCollapsed && (
                          <div className="flex items-center gap-2">
                              {/* Bold text for active item instead of side line */}
                              <span className={`text-sm truncate ${(isActive || isParentActive) ? 'font-bold' : 'font-medium'}`}>{item.title}</span>
                              {showBadge && (
                                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-bounce">
                                      {badgeCount}
                                  </span>
                              )}
                          </div>
                        )}
                    </div>

                    {!isCollapsed && hasSubmenu && (
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    )}

                    {/* Tooltip for Collapsed Mode */}
                    {isCollapsed && (
                      <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg flex items-center gap-2">
                        {item.title}
                        {showBadge && <span className="bg-red-500 text-white px-1.5 rounded-full text-[9px]">{badgeCount}</span>}
                      </div>
                    )}
                  </button>

                  {/* Submenu Items */}
                  {!isCollapsed && hasSubmenu && isExpanded && (
                      <div className="bg-gray-50 dark:bg-black/20 overflow-hidden transition-all">
                          {item.submenu?.map(sub => {
                              if (sub.submenu) {
                                  const isSubExpanded = expandedMenus.includes(sub.id);
                                  const isSubFolderActive = hasPathInSubmenu(sub.submenu, location.pathname);
                                  return (
                                    <div key={sub.id}>
                                      <button
                                        onClick={() => {
                                          setExpandedMenus(prev =>
                                            prev.includes(sub.id) ? prev.filter(x => x !== sub.id) : [...prev, sub.id]
                                          );
                                        }}
                                        className={`
                                          w-full flex items-center gap-3 py-2.5 px-6 pr-12 text-right transition-colors justify-between
                                          ${isSubFolderActive ? 'text-primary dark:text-red-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}
                                        `}
                                      >
                                        <div className="flex items-center gap-3">
                                          <sub.icon className="w-4 h-4" />
                                          <span className="text-xs font-medium">{sub.title}</span>
                                        </div>
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSubExpanded ? 'rotate-180' : ''}`} />
                                      </button>
                                      {isSubExpanded && (
                                        <div className="pr-4 border-r-2 border-gray-200 dark:border-gray-600 mr-2">
                                          {sub.submenu.map((nested: any) => {
                                            const isNestedActive = location.pathname === nested.path;
                                            return (
                                              <button
                                                key={nested.id}
                                                onClick={() => { navigate(nested.path); setSidebarOpen(false); }}
                                                className={`
                                                  w-full flex items-center gap-3 py-2 px-6 pr-8 text-right transition-colors
                                                  ${isNestedActive ? 'text-primary dark:text-red-400 font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}
                                                `}
                                              >
                                                <nested.icon className="w-3.5 h-3.5" />
                                                <span className="text-xs">{nested.title}</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                              }
                              const isSubActive = location.pathname === sub.path;
                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => { navigate(sub.path); setSidebarOpen(false); }}
                                  className={`
                                    w-full flex items-center gap-3 py-2.5 px-6 pr-12 text-right transition-colors
                                    ${isSubActive 
                                      ? 'text-primary dark:text-red-400 font-bold' 
                                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}
                                  `}
                                >
                                    <sub.icon className="w-4 h-4" />
                                    <span className="text-xs">{sub.title}</span>
                                </button>
                              );
                          })}
                      </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
             <button
              onClick={toggleDarkMode}
              title={isCollapsed ? (darkMode ? 'تم روشن' : 'تم تیره') : ''}
              className={`w-full flex items-center gap-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${isCollapsed ? 'justify-center px-2' : 'px-4'}`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {!isCollapsed && <span className="text-sm">{darkMode ? 'تم روشن' : 'تم تیره'}</span>}
            </button>

            <button
              onClick={() => setShowExitModal(true)}
              title={isCollapsed ? 'خروج' : ''}
              className={`w-full flex items-center gap-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ${isCollapsed ? 'justify-center px-2' : 'px-4'}`}
            >
              <LogOut className="w-5 h-5" />
              {!isCollapsed && <span className="text-sm">خروج</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-gray-900 transition-all duration-300">
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10 px-4 h-16 flex items-center justify-between flex-shrink-0 transition-all">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-gray-600 dark:text-gray-300">
              <Menu className="w-6 h-6" />
            </button>
            {!isHome && (
              <button onClick={handleBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <ChevronRight className="w-6 h-6 text-gray-500" />
              </button>
            )}
            <h1 className="text-lg font-bold text-gray-800 dark:text-white truncate">
                {flattenMenuByPath(menuItems).find(m => m.path === location.pathname)?.title || (location.pathname === '/settings' ? 'تنظیمات' : 'رای‌نو')}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
             {/* Header Actions can go here */}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-2 md:px-3 py-4 md:py-6 no-scrollbar pb-20 md:pb-6 relative">
          <UserProvider value={user}>{children}</UserProvider>
        </main>
      </div>
    </div>
  );
};
