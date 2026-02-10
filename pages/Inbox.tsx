
import React, { useState, useEffect } from 'react';
import { User, CartableItem, Message } from '../types';
import { processWorkflowAction, getWorkflows, markCartableItemSeen } from '../workflowStore';
import { 
    Inbox as InboxIcon, CheckCircle, Clock, ArrowLeft, FileText, 
    Briefcase, Award, Package, ClipboardCheck, Archive, FileSignature, 
    Lightbulb, ShoppingCart, MessageSquare, Send, Plus, RefreshCw, AlertCircle
} from 'lucide-react';
import { WorkOrders } from './WorkOrders';
import { supabase } from '../supabaseClient';

export const Inbox: React.FC<{ user: User }> = ({ user }) => {
  // State
  const [activeTab, setActiveTab] = useState<string>('WORK_ORDER');
  const [items, setItems] = useState<CartableItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<CartableItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Data from Database
  const fetchInboxItems = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
          // Fetch pending items from cartable_items table
          // Logic: Status is PENDING
          const { data, error } = await supabase
              .from('cartable_items')
              .select('*')
              .eq('status', 'PENDING')
              .order('created_at', { ascending: false });

          if (error) throw error;

          // Filter Logic
          const myItems = (data || []).filter((item: any) => {
              // 1. Show ALL Work Orders to ALL users (Shared Inbox for Maintenance)
              if (item.module === 'WORK_ORDER') {
                  return true;
              }

              // 2. For other modules, strict assignment logic applies
              const isMyRole = item.assignee_role === user.role;
              const isMeInitiator = item.assignee_role === 'INITIATOR' && item.initiator_id === user.id;
              const isMeSpecific = item.assignee_id === user.id;
              
              return isMyRole || isMeInitiator || isMeSpecific;
          });

          // Map to CartableItem type
          const mappedItems: CartableItem[] = myItems.map((row: any) => ({
              id: row.id,
              workflowId: row.workflow_id,
              trackingCode: row.tracking_code,
              module: row.module,
              title: row.title,
              description: row.description,
              currentStepId: row.current_step_id,
              initiatorId: row.initiator_id,
              assigneeRole: row.assignee_role,
              assigneeId: row.assignee_id,
              status: row.status,
              createdAt: new Date(row.created_at).toLocaleDateString('fa-IR'),
              updatedAt: new Date(row.updated_at).toLocaleDateString('fa-IR'),
              data: row.data || {}
          }));

          setItems(mappedItems);
      } catch (err: any) {
          console.error("Error fetching inbox:", err);
          setErrorMsg("خطا در دریافت اطلاعات کارتابل.");
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    fetchInboxItems();
  }, [user]);

  // Actions
  const handleAction = async (actionId: string, comment: string) => {
    if (selectedItem) {
      await processWorkflowAction(selectedItem.id, actionId, user, comment);
      setSelectedItem(null);
      fetchInboxItems(); // Refresh list after action
    }
  };

  const handleWorkOrderComplete = async (updatedData: any) => {
      const actions = getWorkflowActions(selectedItem!);
      // Typically the "Finish" action
      const primaryAction = actions.find(a => a.style === 'primary' || a.style === 'success');
      
      if (primaryAction && selectedItem) {
          // Update DB data before processing action
          const { error } = await supabase
            .from('cartable_items')
            .update({ data: { ...selectedItem.data, ...updatedData } })
            .eq('id', selectedItem.id);
            
          if (!error) {
              await handleAction(primaryAction.id, "دستور کار تکمیل شد");
          } else {
              alert("خطا در بروزرسانی اطلاعات.");
          }
      } else {
          alert("عملیاتی برای تکمیل این مرحله یافت نشد.");
      }
  };

  const handleOpenItem = async (item: CartableItem) => {
      setSelectedItem(item);
      // Mark as read in DB if not already seen
      if (!item.data?.seen_by?.includes(user.id)) {
          // Optimistically update UI
          const newItems = items.map(i => {
              if (i.id === item.id) {
                  return { ...i, data: { ...i.data, seen_by: [...(i.data.seen_by || []), user.id] } };
              }
              return i;
          });
          setItems(newItems);
          
          await markCartableItemSeen(item.id, user.id);
          // Re-fetch to sync exact state eventually, or just rely on optimistic update
          // fetchInboxItems(); 
      }
  };

  // Helpers
  const getWorkflowActions = (item: CartableItem) => {
    const workflows = getWorkflows();
    const wf = workflows.find(w => w.id === item.workflowId);
    if (!wf) return [];
    const step = wf.steps.find(s => s.id === item.currentStepId);
    return step ? step.actions : [];
  };

  const getStepTitle = (item: CartableItem) => {
    const workflows = getWorkflows();
    const wf = workflows.find(w => w.id === item.workflowId);
    const step = wf?.steps.find(s => s.id === item.currentStepId);
    return step?.title || 'نامشخص';
  };

  const getCount = (module: string) => items.filter(i => i.module === module).length;
  const getUnreadCount = (module: string) => items.filter(i => i.module === module && !i.data?.seen_by?.includes(user.id)).length;

  // Sidebar Menu Items
  const CATEGORIES = [
      { id: 'WORK_ORDER', label: 'دستور کارها', icon: FileText },
      { id: 'PROJECT', label: 'پروژه‌ها', icon: Briefcase },
      { id: 'PERFORMANCE', label: 'امتیاز عملکرد', icon: Award },
      { id: 'PART_REQUEST', label: 'درخواست قطعه', icon: Package },
      { id: 'INSPECTION', label: 'برنامه نت', icon: ClipboardCheck }, 
      { id: 'DOCUMENT', label: 'اسناد فنی', icon: Archive },
      { id: 'MEETING', label: 'صورتجلسات', icon: FileSignature },
      { id: 'SUGGESTION', label: 'پیشنهادات', icon: Lightbulb },
      { id: 'PURCHASE', label: 'درخواست خرید', icon: ShoppingCart },
  ];

  // Render Component for Task Details
  const ItemDetail = ({ item }: { item: CartableItem }) => {
    const actions = getWorkflowActions(item);
    const [comment, setComment] = useState('');

    if (item.module === 'WORK_ORDER') {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 h-full flex flex-col overflow-hidden animate-fadeIn">
                <div className="bg-gray-50 dark:bg-gray-900 p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <div>
                         <h2 className="font-bold text-lg flex items-center gap-2">
                             <FileText className="w-5 h-5 text-primary"/> 
                             {item.title}
                         </h2>
                         <span className="text-xs text-gray-500">{item.trackingCode}</span>
                    </div>
                    <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                        <ArrowLeft className="w-5 h-5"/>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                     <WorkOrders initialData={item.data} onProcessComplete={handleWorkOrderComplete} />
                </div>
            </div>
        );
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 h-full flex flex-col animate-fadeIn">
        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">{item.module}</span>
              <span className="text-gray-400 text-xs">{item.trackingCode}</span>
            </div>
            <h2 className="text-xl font-bold">{item.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
          </div>
          <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-5 h-5"/></button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-6">
            <h3 className="font-bold border-r-4 border-primary pr-3 mb-3">جزئیات درخواست</h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg text-sm space-y-2">
                {Object.entries(item.data).map(([key, val]) => {
                    if (typeof val === 'object' || Array.isArray(val) || key === 'id' || key === 'seen_by') return null;
                    return (
                    <div key={key} className="flex justify-between border-b border-gray-200 dark:border-gray-600 pb-1 last:border-0">
                        <span className="text-gray-500">{key}:</span>
                        <span className="font-medium">{String(val)}</span>
                    </div>
                    );
                })}
            </div>
          </div>
          
          <div className="mb-4">
             <label className="block text-sm font-bold mb-2">توضیحات / دستور (اختیاری):</label>
             <textarea 
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="w-full p-3 border rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-primary outline-none"
                placeholder="یادداشت خود را اینجا بنویسید..."
                rows={3}
             ></textarea>
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 flex gap-3 flex-wrap">
           {actions.map(action => {
             const styleClass = 
                action.style === 'primary' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                action.style === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                action.style === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' :
                'bg-gray-200 hover:bg-gray-300 text-gray-800';

             return (
               <button 
                  key={action.id}
                  onClick={() => handleAction(action.id, comment)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold shadow-md transition transform active:scale-95 ${styleClass}`}
               >
                 {action.label}
               </button>
             )
           })}
        </div>
      </div>
    );
  };

  // Main Render
  if (selectedItem) {
    return <div className="max-w-7xl mx-auto h-[calc(100vh-100px)] p-4"><ItemDetail item={selectedItem} /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 p-4">
        
        {/* Sidebar / Categories */}
        <div className="w-full md:w-64 flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                <h2 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <InboxIcon className="w-5 h-5"/> کارتابل من
                </h2>
                <button onClick={fetchInboxItems} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" title="بروزرسانی">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => { setActiveTab(cat.id); }}
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
                        ) : getCount(cat.id) > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === cat.id ? 'bg-white text-primary' : 'bg-gray-200 text-gray-700'}`}>
                                {getCount(cat.id)}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="flex flex-col h-full">
                <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <h3 className="font-bold">لیست وظایف: {CATEGORIES.find(c => c.id === activeTab)?.label}</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                            <RefreshCw className="w-10 h-10 mb-3 animate-spin"/>
                            <p>در حال دریافت اطلاعات...</p>
                        </div>
                    ) : items.filter(i => i.module === activeTab).length === 0 ? (
                        <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                            <CheckCircle className="w-12 h-12 mb-3 opacity-20"/>
                            <p>هیچ کار فعالی در این بخش وجود ندارد.</p>
                        </div>
                    ) : (
                        items.filter(i => i.module === activeTab).map(item => {
                            const isUnread = !item.data?.seen_by?.includes(user.id);
                            return (
                                <div 
                                    key={item.id} 
                                    onClick={() => handleOpenItem(item)}
                                    className={`bg-white dark:bg-gray-800 p-4 rounded-xl border hover:shadow-md transition cursor-pointer group animate-slideUp relative overflow-hidden
                                        ${isUnread 
                                            ? 'border-l-4 border-l-red-500 border-t border-r border-b border-gray-200 shadow-sm' 
                                            : 'border-gray-200 dark:border-gray-700'}
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className={`text-base transition ${isUnread ? 'font-black text-gray-900 dark:text-white' : 'font-bold text-gray-700 dark:text-gray-300'}`}>
                                                {item.title}
                                            </h4>
                                            <p className={`text-sm mt-1 ${isUnread ? 'font-medium text-gray-800 dark:text-gray-300' : 'text-gray-500'}`}>{item.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded font-bold">{getStepTitle(item)}</span>
                                            <div className="text-xs text-gray-400 mt-2 flex items-center gap-1 justify-end">
                                                <Clock className="w-3 h-3"/> {item.updatedAt}
                                            </div>
                                        </div>
                                    </div>
                                    {isUnread && <div className="absolute top-2 left-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default Inbox;
