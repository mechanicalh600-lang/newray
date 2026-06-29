

import React, { useState, useEffect } from 'react';

import { User, CartableItem, UserRole } from '../../types';

import {

  processWorkflowAction,

  getActionsForCartableItem,

  getStepForCartableItem,

  markCartableItemSeen,

  refreshWorkflowsCache,

  fetchReadCartableIds,

  getUnreadMessageCount,

  notifyCartableUnreadChanged,

  notifyMessagesUnreadChanged,

  postCartableComment,

  referCartableItem,

} from '../../workflowStore';

import { loadInboxProcessOptions, ProcessDesignOption } from '../../services/processDesignRegistry';

import { WorkflowAction } from '../../types';

import {

  Inbox as InboxIcon, CheckCircle, Clock, X, FileText,

  Briefcase, Award, Package, Lightbulb, ShoppingCart, MessageSquare,

  RefreshCw, FileSignature, MapPin, Truck, Archive, Wrench,

} from 'lucide-react';

import { WorkOrders } from '../maintenance/WorkOrders';

import { Messages } from './Messages';

import { CartableItemListCard } from '../../components/workflow/CartableItemListCard';

import { CartableItemDetailPanel } from '../../components/workflow/CartableItemDetailPanel';

import { getCartableTheme } from '../../config/cartableFieldLabels';

import { supabase } from '../../supabaseClient';

import { isItemUnread } from '../../services/cartableReads';



const MESSAGES_TAB = 'MESSAGES';



export const Inbox: React.FC<{ user: User }> = ({ user }) => {

  const [activeTab, setActiveTab] = useState<string>('WORK_ORDER');

  const [processCategories, setProcessCategories] = useState<ProcessDesignOption[]>([]);

  const [itemActions, setItemActions] = useState<WorkflowAction[]>([]);

  const [currentStepTitle, setCurrentStepTitle] = useState('');

  const [items, setItems] = useState<CartableItem[]>([]);

  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const [selectedItem, setSelectedItem] = useState<CartableItem | null>(null);

  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [messageUnreadCount, setMessageUnreadCount] = useState(0);



  const fetchInboxItems = async () => {

    setLoading(true);

    setErrorMsg(null);

    try {

      const { data, error } = await supabase

        .from('cartable_items')

        .select('*')

        .eq('status', 'PENDING')

        .order('created_at', { ascending: false });



      if (error) throw error;



      const myItems = (data || []).filter((item: { module: string; assignee_role: string; assignee_id?: string; initiator_id: string }) => {

        if (item.module === 'WORK_ORDER') return true;

        const isMyRole = item.assignee_role === user.role;

        const isMeInitiator = item.assignee_role === 'INITIATOR' && item.initiator_id === user.id;

        const isMeSpecific = item.assignee_id === user.id;

        return isMyRole || isMeInitiator || isMeSpecific;

      });



      const mappedItems: CartableItem[] = myItems.map((row: Record<string, unknown>) => ({

        id: String(row.id),

        workflowId: String(row.workflow_id),

        trackingCode: String(row.tracking_code || ''),

        module: String(row.module),

        title: String(row.title),

        description: String(row.description || ''),

        currentStepId: String(row.current_step_id),

        initiatorId: String(row.initiator_id),

        assigneeRole: row.assignee_role as CartableItem['assigneeRole'],

        assigneeId: row.assignee_id ? String(row.assignee_id) : undefined,

        status: row.status as CartableItem['status'],

        createdAt: row.created_at ? new Date(String(row.created_at)).toLocaleDateString('fa-IR') : '',

        updatedAt: row.updated_at ? new Date(String(row.updated_at)).toLocaleDateString('fa-IR') : '',

        data: (row.data as Record<string, unknown>) || {},

      }));



      const ids = mappedItems.map(i => i.id);

      const reads = await fetchReadCartableIds(user.id, ids);



      setReadIds(reads);

      setItems(mappedItems);

    } catch (err: unknown) {

      console.error('Error fetching inbox:', err);

      setErrorMsg('خطا در دریافت اطلاعات کارتابل.');

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    refreshWorkflowsCache();

    loadInboxProcessOptions().then(opts => {

      setProcessCategories(opts);

      if (opts.length && activeTab !== MESSAGES_TAB && !opts.some(o => o.moduleKey === activeTab)) {

        setActiveTab(opts[0].moduleKey);

      }

    });

    fetchInboxItems();

    getUnreadMessageCount(user.id, user.role).then(setMessageUnreadCount);

    const syncMessageUnread = () => {
      getUnreadMessageCount(user.id, user.role).then(setMessageUnreadCount);
    };

    window.addEventListener('messages-unread-changed', syncMessageUnread);

    return () => window.removeEventListener('messages-unread-changed', syncMessageUnread);

  }, [user]);



  useEffect(() => {

    if (!selectedItem) {

      setItemActions([]);

      setCurrentStepTitle('');

      return;

    }

    getActionsForCartableItem(selectedItem).then(setItemActions);

    getStepForCartableItem(selectedItem).then(step => setCurrentStepTitle(step?.title || ''));

  }, [selectedItem?.id, selectedItem?.currentStepId]);



  const handleAction = async (actionId: string, comment: string) => {

    if (selectedItem) {

      const ok = await processWorkflowAction(selectedItem.id, actionId, user, comment);

      if (!ok) {

        alert('خطا در انجام عملیات گردش کار.');

        return;

      }

      setSelectedItem(null);

      fetchInboxItems();

    }

  };



  const handleWorkOrderComplete = async (updatedData: Record<string, unknown>) => {

    const actions = itemActions.length ? itemActions : await getActionsForCartableItem(selectedItem!);

    const primaryAction = actions.find(a => a.style === 'primary' || a.style === 'success');



    if (primaryAction && selectedItem) {

      const { error } = await supabase

        .from('cartable_items')

        .update({ data: { ...selectedItem.data, ...updatedData } })

        .eq('id', selectedItem.id);



      if (!error) {

        await handleAction(primaryAction.id, 'دستور کار تکمیل شد');

      } else {

        alert('خطا در بروزرسانی اطلاعات.');

      }

    } else {

      alert('عملیاتی برای تکمیل این مرحله یافت نشد.');

    }

  };



  const handleOpenItem = async (item: CartableItem) => {

    setSelectedItem(item);

    const legacySeen = Array.isArray(item.data?.seen_by) ? (item.data.seen_by as string[]) : [];

    if (isItemUnread(item.id, user.id, readIds, legacySeen)) {

      setReadIds(prev => new Set([...prev, item.id]));

      setItems(prev => prev.map(i => {

        if (i.id !== item.id) return i;

        const seen = Array.isArray(i.data?.seen_by) ? (i.data.seen_by as string[]) : [];

        return { ...i, data: { ...i.data, seen_by: seen.includes(user.id) ? seen : [...seen, user.id] } };

      }));

      notifyCartableUnreadChanged(-1);

      await markCartableItemSeen(item.id, user.id);

    }

  };



  const getModuleIcon = (moduleKey: string) => {

    const icons: Record<string, typeof FileText> = {

      WORK_ORDER: Wrench,

      PROJECT: Briefcase,

      PERFORMANCE: Award,

      PART_REQUEST: Package,

      SUGGESTION: Lightbulb,

      PURCHASE: ShoppingCart,

      MEETING: FileSignature,

      TECH_DOC: Archive,

      MISSION: MapPin,

      FACTORY_EXIT: Truck,

    };

    return icons[moduleKey] || FileText;

  };



  const CATEGORIES = processCategories.map(o => ({

    id: o.moduleKey,

    label: o.title,

    icon: getModuleIcon(o.moduleKey),

  }));



  const itemIsUnread = (item: CartableItem) => {

    const legacySeen = Array.isArray(item.data?.seen_by) ? (item.data.seen_by as string[]) : [];

    return isItemUnread(item.id, user.id, readIds, legacySeen);

  };



  const getCount = (module: string) => items.filter(i => i.module === module).length;

  const getUnreadCount = (module: string) => items.filter(i => i.module === module && itemIsUnread(i)).length;

  const totalCartableUnread = items.filter(i => itemIsUnread(i)).length;

  const handleMessageUnreadChange = (delta: number) => {

    setMessageUnreadCount(c => Math.max(0, c + delta));

    notifyMessagesUnreadChanged(delta);

  };



  const handleRefer = async (targetUserId: string, targetUserName: string, targetRole: string, comment: string) => {
    if (!selectedItem) return;
    const ok = await referCartableItem(
      selectedItem.id,
      targetUserId,
      targetUserName,
      targetRole as UserRole,
      user,
      comment
    );
    if (!ok) {
      alert('خطا در ارجاع.');
      return;
    }
    closeDetail();
    fetchInboxItems();
  };

  const handleSendComment = async (comment: string) => {
    if (!selectedItem) return;
    await postCartableComment(selectedItem.id, user, comment);
  };

  const closeDetail = () => setSelectedItem(null);

  const ItemDetail = ({ item, onClose }: { item: CartableItem; onClose: () => void }) => {
    const actions = itemActions;
    const categoryLabel = CATEGORIES.find(c => c.id === item.module)?.label || item.module;
    const theme = getCartableTheme(item.module);

    if (item.module === 'WORK_ORDER') {
      return (
        <div className="h-full flex flex-col overflow-hidden animate-fadeIn bg-white dark:bg-gray-800">
          <div className={`shrink-0 bg-gradient-to-l ${theme.gradient} text-white px-5 py-4 flex justify-between items-center`}>
            <div className="text-right min-w-0" dir="rtl">
              <p className="text-[11px] font-bold bg-white/20 inline-block px-2 py-0.5 rounded-full mb-1">{categoryLabel}</p>
              <h2 className="font-bold text-lg truncate">{item.title}</h2>
              <span className="text-xs text-white/80 font-mono">{item.trackingCode}</span>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-full bg-white/15 hover:bg-white/25 shrink-0" title="بستن">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <WorkOrders initialData={item.data} onProcessComplete={handleWorkOrderComplete} embeddedInCartable onClose={onClose} />
          </div>
        </div>
      );
    }

    return (
      <CartableItemDetailPanel
        item={item}
        user={user}
        categoryLabel={categoryLabel}
        stepTitle={currentStepTitle}
        actions={actions}
        onClose={onClose}
        onWorkflowAction={async (actionId, comment) => {
          await handleAction(actionId, comment);
        }}
        onSendComment={handleSendComment}
        onRefer={handleRefer}
      />
    );
  };



  if (selectedItem) {

    return (

      <div className="w-full max-w-full h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 p-4">

        <Sidebar

          activeTab={activeTab}

          setActiveTab={tab => { closeDetail(); setActiveTab(tab); }}

          categories={CATEGORIES}

          loading={loading}

          onRefresh={fetchInboxItems}

          getCount={getCount}

          getUnreadCount={getUnreadCount}

          totalUnread={totalCartableUnread}

          messageUnreadCount={messageUnreadCount}

        />

        <div className="flex-1 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">

          <ItemDetail item={selectedItem} onClose={closeDetail} />

        </div>

      </div>

    );

  }



  if (activeTab === MESSAGES_TAB) {

    return (

      <div className="w-full max-w-full h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 p-4">

        <Sidebar

          activeTab={activeTab}

          setActiveTab={setActiveTab}

          categories={CATEGORIES}

          loading={loading}

          onRefresh={fetchInboxItems}

          getCount={getCount}

          getUnreadCount={getUnreadCount}

          totalUnread={totalCartableUnread}

          messageUnreadCount={messageUnreadCount}

        />

        <div className="flex-1 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">

          <Messages user={user} inboxOnly embedded onUnreadChange={handleMessageUnreadChange} />

        </div>

      </div>

    );

  }



  return (

    <div className="w-full max-w-full h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 p-4">

      <Sidebar

        activeTab={activeTab}

        setActiveTab={tab => { setSelectedItem(null); setActiveTab(tab); }}

        categories={CATEGORIES}

        loading={loading}

        onRefresh={fetchInboxItems}

        getCount={getCount}

        getUnreadCount={getUnreadCount}

        totalUnread={totalCartableUnread}

        messageUnreadCount={messageUnreadCount}

      />



      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">

        {errorMsg && (

          <div className="p-3 bg-red-50 text-red-700 text-sm border-b">{errorMsg}</div>

        )}

        <div className="flex flex-col h-full">

          <div className="p-4 border-b dark:border-gray-700 bg-gradient-to-l from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">

            <h3 className="font-bold text-gray-800 dark:text-gray-100">

              {CATEGORIES.find(c => c.id === activeTab)?.label}

            </h3>

            <p className="text-xs text-gray-500 mt-1">

              {items.filter(i => i.module === activeTab).length} مورد فعال

              {getUnreadCount(activeTab) > 0 && (

                <span className="text-red-500 font-bold mr-2"> · {getUnreadCount(activeTab)} نخوانده</span>

              )}

            </p>

          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/20">

            {loading ? (

              <div className="text-center py-20 text-gray-400 flex flex-col items-center">

                <RefreshCw className="w-10 h-10 mb-3 animate-spin" />

                <p>در حال دریافت اطلاعات...</p>

              </div>

            ) : items.filter(i => i.module === activeTab).length === 0 ? (

              <div className="text-center py-20 text-gray-400 flex flex-col items-center">

                <CheckCircle className="w-12 h-12 mb-3 opacity-20" />

                <p>هیچ کار فعالی در این بخش وجود ندارد.</p>

              </div>

            ) : (

              items.filter(i => i.module === activeTab).map(item => (

                <CartableItemListCard

                  key={item.id}

                  item={item}

                  categoryLabel={CATEGORIES.find(c => c.id === item.module)?.label || item.module}

                  isUnread={itemIsUnread(item)}

                  onOpen={() => handleOpenItem(item)}

                />

              ))

            )}

          </div>

        </div>

      </div>

    </div>

  );

};



const Sidebar: React.FC<{

  activeTab: string;

  setActiveTab: (tab: string) => void;

  categories: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[];

  loading: boolean;

  onRefresh: () => void;

  getCount: (module: string) => number;

  getUnreadCount: (module: string) => number;

  totalUnread: number;

  messageUnreadCount: number;

}> = ({ activeTab, setActiveTab, categories, loading, onRefresh, getCount, getUnreadCount, totalUnread, messageUnreadCount }) => (

  <div className="w-full md:w-64 flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">

    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">

      <h2 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">

        <InboxIcon className="w-5 h-5" /> کارتابل من

        {totalUnread > 0 && (

          <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold min-w-[1.25rem] text-center">

            {totalUnread}

          </span>

        )}

      </h2>

      <button onClick={onRefresh} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" title="بروزرسانی">

        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />

      </button>

    </div>

    <div className="flex-1 overflow-y-auto p-2 space-y-1">

      {categories.map(cat => (

        <button

          key={cat.id}

          onClick={() => setActiveTab(cat.id)}

          className={`w-full flex items-center justify-between p-3 rounded-lg text-sm transition-colors ${activeTab === cat.id ? 'bg-primary text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}

        >

          <div className="flex items-center gap-2">

            <cat.icon className="w-4 h-4" />

            <span>{cat.label}</span>

          </div>

          {getUnreadCount(cat.id) > 0 ? (

            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs animate-pulse">

              {getUnreadCount(cat.id)}

            </span>

          ) : getCount(cat.id) > 0 ? (

            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === cat.id ? 'bg-white text-primary' : 'bg-gray-200 text-gray-700'}`}>

              {getCount(cat.id)}

            </span>

          ) : null}

        </button>

      ))}

      <div className="border-t dark:border-gray-700 my-2 pt-2">

        <button

          onClick={() => setActiveTab(MESSAGES_TAB)}

          className={`w-full flex items-center justify-between p-3 rounded-lg text-sm transition-colors ${activeTab === MESSAGES_TAB ? 'bg-primary text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}

        >

          <div className="flex items-center gap-2">

            <MessageSquare className="w-4 h-4" />

            <span>پیام‌ها</span>

          </div>

          {messageUnreadCount > 0 && (

            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === MESSAGES_TAB ? 'bg-white text-primary' : 'bg-red-500 text-white'}`}>

              {messageUnreadCount}

            </span>

          )}

        </button>

      </div>

    </div>

  </div>

);



export default Inbox;


