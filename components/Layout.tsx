
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ChevronRight, LogOut, User as UserIcon, Moon, Sun, PanelRightClose, PanelRightOpen, ChevronDown, Bell, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { MENU_ITEMS } from '../constants';
import { User, Note } from '../types';
import { getUnreadMessageCount, getUnreadCartableCount } from '../workflowStore';
import { supabase } from '../supabaseClient';
import { compareShamsiDateTime, getShamsiDate, getTime } from '../utils';

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
  
  // Exit Confirmation State
  const [showExitModal, setShowExitModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const isLoginPage = location.pathname === '/login';

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

  // Automatically expand menus if current path is inside them
  useEffect(() => {
    MENU_ITEMS.forEach(item => {
      if (item.submenu) {
        const hasActiveChild = item.submenu.some(sub => sub.path === location.pathname);
        if (hasActiveChild && !expandedMenus.includes(item.id)) {
          setExpandedMenus(prev => [...prev, item.id]);
        }
      }
    });
  }, [location.pathname]);

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

    const checkReminders = async () => {
        try {
            // Fetch pending notes with reminders
            const { data } = await supabase
                .from('personal_notes')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_completed', false)
                .not('reminder_date', 'is', null)
                .not('reminder_time', 'is', null);

            if (data && data.length > 0) {
                const now = new Date();
                const currentDate = getShamsiDate();
                const currentTime = getTime();

                // Find a note that is due and not seen yet
                const dueNote = data.find((note: Note) => {
                    if (note.reminderSeen) return false;
                    
                    const isDatePast = note.reminderDate! < currentDate;
                    const isToday = note.reminderDate === currentDate;
                    const isTimePast = note.reminderTime! <= currentTime;

                    return isDatePast || (isToday && isTimePast);
                });

                if (dueNote) {
                    setActiveAlert(dueNote);
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.play().catch(() => {});
                }
            }
        } catch (e) {
            console.error("Reminder check failed", e);
        }
    };

    // Initial check
    checkUpdates();

    // Poll every 30 seconds
    const interval = setInterval(checkUpdates, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const dismissAlert = async () => {
      if (!activeAlert) return;
      setActiveAlert(null);
  };

  const completeFromAlert = async () => {
      if (!activeAlert) return;
      try {
          await supabase.from('personal_notes').update({ is_completed: true }).eq('id', activeAlert.id);
          setActiveAlert(null);
          alert('یادداشت انجام شد.');
      } catch (e) {
          console.error(e);
      }
  };

  const confirmLogout = () => {
      setShowExitModal(false);
      onLogout();
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  const getHierarchicalBackPath = (currentPath: string) => {
    if (currentPath === '/') return '/';

    // Dynamic/detail routes should go to their logical list page.
    if (currentPath.startsWith('/work-orders/')) return '/work-orders';
    if (currentPath.startsWith('/admin/')) return '/admin';
    if (currentPath.startsWith('/report-template-preview')) return '/';

    // If current page is a direct top-level menu item, go to dashboard.
    const directItem = MENU_ITEMS.find(item => !item.submenu && item.path === currentPath);
    if (directItem) return '/';

    // If current page is inside a group, go to that group's landing page.
    const parentGroup = MENU_ITEMS.find(item => item.submenu?.some(sub => sub.path === currentPath));
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
      {/* Alert Modal */}
      {activeAlert && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 border-t-4 border-red-500">
                  <div className="p-6">
                      <div className="flex items-center gap-3 text-red-500 mb-4">
                          <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full animate-bounce">
                              <Bell className="w-6 h-6" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 dark:text-white">یادآوری</h3>
                      </div>
                      <h4 className="font-bold text-lg mb-2">{activeAlert.title}</h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
                          {activeAlert.content || 'زمان انجام این کار فرا رسیده است.'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{activeAlert.reminderTime} - {activeAlert.reminderDate}</span>
                      </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 flex gap-3">
                      <button 
                        onClick={dismissAlert} 
                        className="flex-1 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                      >
                          بعدا یادآوری کن
                      </button>
                      <button 
                        onClick={completeFromAlert} 
                        className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                      >
                          <CheckCircle className="w-4 h-4" /> انجام شد
                      </button>
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
            {!isCollapsed && <h2 className="text-xl font-bold text-primary dark:text-red-400 whitespace-nowrap">رای‌نو</h2>}
            
            {/* Mobile Close */}
            <button onClick={() => setSidebarOpen(false)} className="md:hidden">
              <X className="w-6 h-6" />
            </button>

            {/* Desktop Collapse Toggle */}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)} 
              className="hidden md:block p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              title={isCollapsed ? "باز کردن منو" : "بستن منو"}
            >
              {isCollapsed ? <PanelRightOpen className="w-5 h-5" /> : <PanelRightClose className="w-5 h-5" />}
            </button>
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
            <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-primary text-white flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-primary transition-all shadow-sm">
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
            {MENU_ITEMS.map((item) => {
              if (item.id === 'settings') return null;
              if (item.role && user?.role !== item.role && user?.role !== 'ADMIN') return null;
              
              const hasSubmenu = !!item.submenu;
              const isExpanded = expandedMenus.includes(item.id);
              
              // Check if parent is active (if any child is active)
              const isParentActive = hasSubmenu && item.submenu?.some(sub => sub.path === location.pathname);
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
                              )
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
                {MENU_ITEMS.flatMap(m => m.submenu ? m.submenu : m).find(m => m.path === location.pathname)?.title || (location.pathname === '/settings' ? 'تنظیمات' : 'رای‌نو')}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
             {/* Header Actions can go here */}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar pb-20 md:pb-6 relative">
          {children}
        </main>
      </div>
    </div>
  );
};
