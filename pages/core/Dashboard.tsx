
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getShamsiDate, getShiftRotation, getPersianDayName, toPersianDigits } from '../../utils';
import {
  Sun, Moon, Coffee, CalendarRange, Wrench, ClipboardCheck, Package, AlertTriangle,
  ArrowUpLeft, Inbox, MessageSquare, ShoppingCart, Clock, Settings2, X, Check,
  FileSignature, ChevronLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useApp } from '../../contexts/AppContext';
import { UserRole } from '../../types';
import { getUnreadCartableCount, getUnreadMessageCount } from '../../workflowStore';
import {
  DEFAULT_QUICK_ACCESS_IDS,
  DASHBOARD_QUICK_ACCESS_PAGE_KEY,
  flattenMenuForQuickAccess,
  resolveQuickAccessItems,
  type QuickAccessItem,
} from '../../config/dashboardQuickAccess';
import {
  fetchUserColumnPreferences,
  saveUserColumnPreferences,
} from '../../services/userColumnPreferences';

interface WorkOrderRow {
  id: string;
  tracking_code?: string;
  equipment_name?: string;
  priority?: string;
  status?: string;
  request_date?: string;
  created_at?: string;
}

interface CartableRow {
  id: string;
  title?: string;
  module?: string;
  created_at?: string;
}

interface RequestRow {
  id: string;
  requester_name?: string;
  request_date?: string;
  status?: string;
}

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: 'بحرانی',
  URGENT: 'فوری',
  NORMAL: 'عادی',
  LOW: 'کم',
};

const MODULE_LABELS: Record<string, string> = {
  WORK_ORDER: 'دستور کار',
  PART_REQUEST: 'درخواست قطعه',
  PURCHASE: 'درخواست خرید',
  PERMIT: 'مجوز کار',
  MESSAGE: 'پیام',
};

function formatDateTime(value?: string) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    const time = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString('fa-IR');
    return `${time} · ${date}`;
  } catch {
    return value;
  }
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const today = getShamsiDate();
  const dayName = getPersianDayName(today);
  const rotations = getShiftRotation(today);
  const isAdmin = user?.role === UserRole.ADMIN;

  const [stats, setStats] = useState({
    openWorkOrders: 0,
    inspections: 0,
    partRequests: 0,
    emergency: 0,
    unreadCartable: 0,
    unreadMessages: 0,
    pendingPurchases: 0,
    pendingPermits: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [recentWorkOrders, setRecentWorkOrders] = useState<WorkOrderRow[]>([]);
  const [cartableItems, setCartableItems] = useState<CartableRow[]>([]);
  const [pendingPartRequests, setPendingPartRequests] = useState<RequestRow[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<RequestRow[]>([]);
  const [loadingWidgets, setLoadingWidgets] = useState(true);

  const [quickLinkIds, setQuickLinkIds] = useState<string[]>(DEFAULT_QUICK_ACCESS_IDS);
  const [editQuickLinks, setEditQuickLinks] = useState(false);
  const [draftQuickLinkIds, setDraftQuickLinkIds] = useState<string[]>(DEFAULT_QUICK_ACCESS_IDS);
  const [savingQuickLinks, setSavingQuickLinks] = useState(false);

  const quickAccessCatalog = useMemo(
    () => flattenMenuForQuickAccess(Boolean(isAdmin)),
    [isAdmin]
  );

  const quickAccessItems = useMemo(
    () => resolveQuickAccessItems(quickLinkIds, Boolean(isAdmin)),
    [quickLinkIds, isAdmin]
  );

  const loadQuickLinks = useCallback(async () => {
    if (!user?.id) return;
    const saved = await fetchUserColumnPreferences(user.id, DASHBOARD_QUICK_ACCESS_PAGE_KEY);
    if (saved.length > 0) {
      setQuickLinkIds(saved);
      setDraftQuickLinkIds(saved);
    }
  }, [user?.id]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoadingStats(true);
    setLoadingWidgets(true);
    try {
      const [
        woCountRes,
        prCountRes,
        emCountRes,
        pmCountRes,
        purchaseCountRes,
        permitCountRes,
        recentWoRes,
        cartableRes,
        partReqRes,
        purchaseReqRes,
      ] = await Promise.all([
        supabase.from('work_orders').select('id', { count: 'exact', head: true }).neq('status', 'FINISHED'),
        supabase.from('part_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase
          .from('work_orders')
          .select('id', { count: 'exact', head: true })
          .eq('work_type', 'REPAIR')
          .in('priority', ['URGENT', 'CRITICAL'])
          .neq('status', 'FINISHED'),
        supabase.from('pm_plans').select('id', { count: 'exact', head: true }).like('next_run_date', `%${today}%`),
        supabase.from('purchase_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase.from('work_permits').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase
          .from('work_orders')
          .select('id, tracking_code, equipment_name, priority, status, request_date, created_at')
          .neq('status', 'FINISHED')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('cartable_items')
          .select('id, title, module, created_at, assignee_role, assignee_id, initiator_id, status')
          .eq('status', 'PENDING')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('part_requests')
          .select('id, requester_name, request_date, status')
          .eq('status', 'PENDING')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('purchase_requests')
          .select('id, requester_name, request_date, status')
          .eq('status', 'PENDING')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const [unreadCartable, unreadMessages] = await Promise.all([
        getUnreadCartableCount(user.id, user.role),
        getUnreadMessageCount(user.id, user.role),
      ]);

      setStats({
        openWorkOrders: woCountRes.count || 0,
        partRequests: prCountRes.count || 0,
        emergency: emCountRes.count || 0,
        inspections: pmCountRes.count || 0,
        unreadCartable,
        unreadMessages,
        pendingPurchases: purchaseCountRes.count || 0,
        pendingPermits: permitCountRes.count || 0,
      });

      setRecentWorkOrders(recentWoRes.data || []);

      const myCartable = (cartableRes.data || []).filter((item: any) => {
        if (item.module === 'WORK_ORDER') return true;
        const isMyRole = item.assignee_role === user.role;
        const isMeInitiator = item.assignee_role === 'INITIATOR' && item.initiator_id === user.id;
        const isMeSpecific = item.assignee_id === user.id;
        return isMyRole || isMeInitiator || isMeSpecific;
      });
      setCartableItems(myCartable.slice(0, 5));

      setPendingPartRequests(partReqRes.data || []);
      setPendingPurchases(purchaseReqRes.data || []);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoadingStats(false);
      setLoadingWidgets(false);
    }
  }, [today, user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    loadQuickLinks();
  }, [loadQuickLinks]);

  const quickStats = [
    {
      label: 'دستورکارهای باز',
      val: stats.openWorkOrders,
      gradient: 'bg-gradient-to-br from-orange-400 to-orange-500',
      shadow: 'shadow-orange-500/20',
      icon: Wrench,
      path: '/work-orders?status=OPEN',
    },
    {
      label: 'برنامه نت امروز',
      val: stats.inspections,
      gradient: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
      shadow: 'shadow-cyan-500/20',
      icon: ClipboardCheck,
      path: '/pm-scheduler',
    },
    {
      label: 'درخواست قطعه باز',
      val: stats.partRequests,
      gradient: 'bg-gradient-to-br from-emerald-400 to-emerald-500',
      shadow: 'shadow-emerald-500/20',
      icon: Package,
      path: '/part-requests',
    },
    {
      label: 'خرابی‌های اضطراری',
      val: stats.emergency,
      gradient: 'bg-gradient-to-br from-rose-400 to-red-500',
      shadow: 'shadow-rose-500/20',
      icon: AlertTriangle,
      path: '/work-orders?priority=CRITICAL',
    },
  ];

  const summaryTiles = [
    { label: 'کارتابل جدید', val: stats.unreadCartable, icon: Inbox, path: '/inbox', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'پیام خوانده‌نشده', val: stats.unreadMessages, icon: MessageSquare, path: '/messages', color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/20' },
    { label: 'درخواست خرید', val: stats.pendingPurchases, icon: ShoppingCart, path: '/purchases', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { label: 'مجوز کار باز', val: stats.pendingPermits, icon: FileSignature, path: '/permits', color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
  ];

  const toggleDraftLink = (id: string) => {
    setDraftQuickLinkIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 10) return prev;
      return [...prev, id];
    });
  };

  const saveQuickLinks = async () => {
    if (!user?.id || draftQuickLinkIds.length === 0) return;
    setSavingQuickLinks(true);
    try {
      await saveUserColumnPreferences(user.id, DASHBOARD_QUICK_ACCESS_PAGE_KEY, draftQuickLinkIds);
      setQuickLinkIds(draftQuickLinkIds);
      setEditQuickLinks(false);
    } finally {
      setSavingQuickLinks(false);
    }
  };

  const EmptyState = ({ text }: { text: string }) => (
    <div className="py-8 text-center text-sm text-gray-400">{text}</div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white mb-1">داشبورد مدیریتی</h1>
          <p className="text-sm text-gray-500">خلاصه وضعیت عملیات کارخانه در یک نگاه</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        <div className="w-full lg:w-96 flex-shrink-0">
          <div
            onClick={() => navigate('/work-calendar')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/work-calendar')}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col group transition-all hover:shadow-md h-full cursor-pointer"
          >
            <div className="theme-gradient-br p-6 text-white flex justify-center items-center relative overflow-hidden">
              <div className="absolute -right-4 -top-9 opacity-10 transform rotate-12 transition-transform duration-500 group-hover:scale-110">
                <CalendarRange className="w-40 h-40" />
              </div>
              <div className="relative z-10 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 shadow-inner">
                    <CalendarRange className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-2xl font-black">{dayName}</h3>
                </div>
                <p className="text-xl font-bold opacity-90 tracking-wide">{toPersianDigits(today)}</p>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-evenly gap-3">
              {['A', 'B', 'C'].map((s) => {
                const shift = rotations[s];
                const type = shift?.type || '';
                let config = {
                  icon: Coffee,
                  style: 'bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100',
                };
                if (type.startsWith('DAY')) {
                  config = {
                    icon: Sun,
                    style: 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100',
                  };
                } else if (type.startsWith('NIGHT')) {
                  config = {
                    icon: Moon,
                    style: 'bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/40 dark:to-indigo-900/10 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100',
                  };
                }
                const Icon = config.icon;
                return (
                  <div key={s} className={`relative overflow-hidden p-3 rounded-2xl border transition-all hover:scale-[1.02] hover:shadow-md ${config.style}`}>
                    <div className="relative z-10 flex items-center justify-center gap-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="p-1.5 rounded-lg bg-white/30 dark:bg-white/10 backdrop-blur-md border border-white/50 dark:border-white/20 shadow-sm">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-bold opacity-80 uppercase tracking-wider">شیفت {s}</span>
                        </div>
                        <span className="text-lg font-black tracking-tight leading-none">{shift?.label}</span>
                      </div>
                    </div>
                    <div className="absolute top-2 -right-0 opacity-40 transform rotate-12 pointer-events-none">
                      <Icon className="w-16 h-16 text-white" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          {quickStats.map((stat, idx) => (
            <div
              key={idx}
              onClick={() => navigate(stat.path)}
              className={`relative overflow-hidden p-5 rounded-2xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer ${stat.gradient} ${stat.shadow} group`}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 shadow-inner">
                      <stat.icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm text-white/90 font-bold opacity-90">{stat.label}</p>
                  </div>
                  <div className="bg-white/20 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpLeft className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-4xl font-black text-white tracking-tight">
                  {loadingStats ? '...' : toPersianDigits(stat.val)}
                </p>
              </div>
              <div className="absolute top-2 -left-4 opacity-10 rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                <stat.icon className="w-32 h-32 text-white" />
              </div>
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 blur-3xl rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryTiles.map((tile) => (
          <button
            key={tile.label}
            type="button"
            onClick={() => navigate(tile.path)}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-right hover:shadow-md transition-all flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-xs text-gray-500 mb-1">{tile.label}</p>
              <p className="text-2xl font-black text-gray-800 dark:text-white">
                {loadingStats ? '…' : toPersianDigits(tile.val)}
              </p>
            </div>
            <div className={`p-2.5 rounded-xl ${tile.color}`}>
              <tile.icon className="w-5 h-5" />
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white">آخرین دستورکارهای باز</h3>
            <button type="button" onClick={() => navigate('/work-orders?status=OPEN')} className="text-xs text-primary hover:underline flex items-center gap-1">
              همه <ChevronLeft className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {loadingWidgets ? (
              <EmptyState text="در حال بارگذاری..." />
            ) : recentWorkOrders.length === 0 ? (
              <EmptyState text="دستورکار بازی ثبت نشده" />
            ) : (
              recentWorkOrders.map((wo) => (
                <button
                  key={wo.id}
                  type="button"
                  onClick={() => navigate('/work-orders')}
                  className="w-full px-5 py-3 text-right hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">
                        {wo.tracking_code || '—'} · {wo.equipment_name || 'بدون تجهیز'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {wo.request_date || formatDateTime(wo.created_at)}
                      </p>
                    </div>
                    {wo.priority && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 shrink-0">
                        {PRIORITY_LABELS[wo.priority] || wo.priority}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white">کارتابل من</h3>
            <button type="button" onClick={() => navigate('/inbox')} className="text-xs text-primary hover:underline flex items-center gap-1">
              همه <ChevronLeft className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {loadingWidgets ? (
              <EmptyState text="در حال بارگذاری..." />
            ) : cartableItems.length === 0 ? (
              <EmptyState text="آیتم در انتظاری در کارتابل نیست" />
            ) : (
              cartableItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate('/inbox')}
                  className="w-full px-5 py-3 text-right hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                >
                  <p className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{item.title || 'بدون عنوان'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {MODULE_LABELS[item.module || ''] || item.module} · {formatDateTime(item.created_at)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white">درخواست‌های در انتظار</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {loadingWidgets ? (
              <EmptyState text="در حال بارگذاری..." />
            ) : pendingPartRequests.length === 0 && pendingPurchases.length === 0 ? (
              <EmptyState text="درخواست در انتظاری نیست" />
            ) : (
              <>
                {pendingPartRequests.map((req) => (
                  <button
                    key={`part-${req.id}`}
                    type="button"
                    onClick={() => navigate('/part-requests')}
                    className="w-full px-5 py-3 text-right hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">درخواست قطعه</p>
                        <p className="text-xs text-gray-500 mt-1">{req.requester_name || '—'} · {req.request_date || '—'}</p>
                      </div>
                      <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                    </div>
                  </button>
                ))}
                {pendingPurchases.map((req) => (
                  <button
                    key={`pur-${req.id}`}
                    type="button"
                    onClick={() => navigate('/purchases')}
                    className="w-full px-5 py-3 text-right hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">درخواست خرید</p>
                        <p className="text-xs text-gray-500 mt-1">{req.requester_name || '—'} · {req.request_date || '—'}</p>
                      </div>
                      <ShoppingCart className="w-4 h-4 text-amber-600 shrink-0" />
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-white">دسترسی سریع</h3>
            <p className="text-xs text-gray-500 mt-1">میانبرهای پرکاربرد — قابل شخصی‌سازی</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDraftQuickLinkIds(quickLinkIds);
              setEditQuickLinks(true);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            ویرایش
          </button>
        </div>

        {quickAccessItems.length === 0 ? (
          <EmptyState text="میانبری انتخاب نشده — روی ویرایش بزنید" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {quickAccessItems.map((item: QuickAccessItem) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-primary group-hover:scale-105 transition-transform">
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 text-center leading-tight">{item.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {editQuickLinks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-white">انتخاب دسترسی سریع</h3>
              <button type="button" onClick={() => setEditQuickLinks(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-1">
              <p className="text-xs text-gray-500 mb-3">حداکثر ۱۰ مورد — {toPersianDigits(draftQuickLinkIds.length)} مورد انتخاب شده</p>
              {quickAccessCatalog.map((item) => {
                const selected = draftQuickLinkIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleDraftLink(item.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-right transition-colors ${
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <item.icon className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{item.title}</p>
                        {item.group && <p className="text-[10px] text-gray-400 truncate">{item.group}</p>}
                      </div>
                    </div>
                    {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setEditQuickLinks(false)}
                className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={savingQuickLinks || draftQuickLinkIds.length === 0}
                onClick={saveQuickLinks}
                className="px-4 py-2 text-sm rounded-xl bg-primary text-white font-bold disabled:opacity-50"
              >
                {savingQuickLinks ? 'ذخیره...' : 'ذخیره'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
