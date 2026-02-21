
import { WorkflowDefinition, CartableItem, User, UserRole, WorkflowHistory, Message, Attachment } from './types';
import { generateId, getShamsiDate, getTime } from './utils';
import { supabase } from './supabaseClient';

// --- Local Storage Helpers ---
const loadWorkflows = (): WorkflowDefinition[] => {
  try {
    const saved = localStorage.getItem('workflows');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

const saveWorkflows = (workflows: WorkflowDefinition[]) => {
  localStorage.setItem('workflows', JSON.stringify(workflows));
};

const loadCartable = (): CartableItem[] => {
  try {
    const saved = localStorage.getItem('cartable');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

const saveCartable = (items: CartableItem[]) => {
  localStorage.setItem('cartable', JSON.stringify(items));
};

// --- Documents Specific Helpers ---
export interface DocumentItem {
    id: string;
    code: string;
    name: string;
    type: string;
    fileName?: string;
    createdAt: string;
}

const loadDocuments = (): DocumentItem[] => {
    try {
        const saved = localStorage.getItem('documents');
        return saved ? JSON.parse(saved) : [];
    } catch { return []; }
};

export const saveDocument = (doc: DocumentItem) => {
    const docs = loadDocuments();
    docs.push(doc);
    localStorage.setItem('documents', JSON.stringify(docs));
};

export const getAllDocuments = () => loadDocuments();

export const deleteDocument = (id: string) => {
    const docs = loadDocuments();
    const filtered = docs.filter(d => d.id !== id);
    localStorage.setItem('documents', JSON.stringify(filtered));
};

// --- Messaging Helpers (SUPABASE INTEGRATION) ---

// Get messages for a user (Received + Sent by user)
export const fetchUserMessages = async (userId: string, userRole: string): Promise<{ inbox: Message[], sent: Message[] }> => {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const allMsgs: any[] = data || [];
        
        // Map Supabase fields to Message interface
        const mappedMsgs: Message[] = allMsgs.map(m => ({
            id: m.id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            receiverId: m.receiver_id,
            receiverType: m.receiver_type as any,
            subject: m.subject,
            body: m.body,
            createdAt: m.created_at,
            readBy: m.read_by || [],
            attachments: m.attachments || [] // Map attachments
        }));

        // Filter Inbox
        const inbox = mappedMsgs.filter(m => {
            if (m.receiverType === 'USER' && m.receiverId === userId) return true;
            if (m.receiverType === 'ALL') return true;
            if (m.receiverType === 'GROUP' && m.receiverId === userRole) return true;
            return false;
        });

        // Filter Sent
        const sent = mappedMsgs.filter(m => m.senderId === userId);

        return { inbox, sent };

    } catch (err: any) {
        // Suppress network errors
        const errStr = JSON.stringify(err).toLowerCase();
        const msg = (err?.message || '').toLowerCase();
        if (!msg.includes('failed to fetch') && !msg.includes('network request failed') && !errStr.includes('failed to fetch')) {
             console.error("Error fetching messages:", err);
        }
        return { inbox: [], sent: [] };
    }
};

export const getUnreadMessageCount = async (userId: string, userRole: string): Promise<number> => {
    try {
        const { inbox } = await fetchUserMessages(userId, userRole);
        return inbox.filter(m => !m.readBy.includes(userId)).length;
    } catch (e) {
        return 0;
    }
};

export const sendMessageToDb = async (
    sender: User, 
    receiverIds: string | string[], 
    receiverType: 'USER' | 'GROUP' | 'ALL', 
    subject: string, 
    body: string,
    attachments: Attachment[] = []
) => {
    const timestamp = `${getShamsiDate()} ${getTime()}`;
    const messagesToInsert: any[] = [];

    if (receiverType === 'USER' && Array.isArray(receiverIds)) {
        receiverIds.forEach(recId => {
            messagesToInsert.push({
                sender_id: sender.id,
                sender_name: sender.fullName,
                receiver_id: recId,
                receiver_type: 'USER',
                subject,
                body,
                created_at: timestamp,
                read_by: [],
                attachments
            });
        });
    } else {
        const recId = Array.isArray(receiverIds) ? receiverIds[0] : receiverIds;
        messagesToInsert.push({
            sender_id: sender.id,
            sender_name: sender.fullName,
            receiver_id: recId,
            receiver_type: receiverType,
            subject,
            body,
            created_at: timestamp,
            read_by: [],
            attachments
        });
    }

    const { error } = await supabase.from('messages').insert(messagesToInsert);
    if (error) throw error;
};

export const markMessageReadInDb = async (msg: Message, userId: string) => {
    if (!msg.readBy.includes(userId)) {
        const newReadBy = [...msg.readBy, userId];
        await supabase
            .from('messages')
            .update({ read_by: newReadBy })
            .eq('id', msg.id);
    }
};

export const getMyMessages = (user: User): Message[] => { return []; }; 
export const getSentMessages = (userId: string): Message[] => { return []; };
export const markMessageAsRead = (msgId: string, userId: string) => {}; 

const PAGE_SIZE = 1000;
const fetchAllPages = async (table: string, columns: string = '*'): Promise<any[]> => {
    const all: any[] = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        const chunk = data || [];
        all.push(...chunk);
        if (chunk.length < PAGE_SIZE) return all;
        from += PAGE_SIZE;
    }
};

const PERSONNEL_CACHE_TTL_MS = 2 * 60 * 1000; // 2 دقیقه
let personnelCache: { data: any[]; ts: number } | null = null;

// --- Master Data Helper --- (pagination برای رفع محدودیت 1000 ردیف Supabase)
export const fetchMasterData = async (table: string) => {
    if (table === 'personnel') {
        const now = Date.now();
        if (personnelCache && now - personnelCache.ts < PERSONNEL_CACHE_TTL_MS) {
            return personnelCache.data;
        }
        try {
            const data = await fetchAllPages(table, 'id, full_name, personnel_code');
            personnelCache = { data: data || [], ts: now };
            return personnelCache.data;
        } catch (e) {
            if (personnelCache) return personnelCache.data;
            return [];
        }
    }

    try {
        const data = await fetchAllPages(table);
        if (table === 'measurement_units' && data.length === 0) {
            // Fall through to defaults
        } else {
            return data;
        }
    } catch (e) {
        // Silent fallback
    }

    if (table === 'measurement_units') {
        return [
            { id: '1', title: 'عدد' }, { id: '2', title: 'کیلوگرم' }, { id: '3', title: 'متر' },
            { id: '4', title: 'لیتر' }, { id: '5', title: 'دست' }, { id: '6', title: 'بسته' },
            { id: '7', title: 'شاخه' }, { id: '8', title: 'تن' }
        ];
    }
    return [];
};

/** مقدار کوئری برای سلول ماتریس (تعداد رکوردها یا جمع ستون) */
export const fetchMatrixCellQuery = async (table: string, op: 'count' | 'sum', column?: string): Promise<number> => {
    try {
        if (op === 'count') {
            const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
            if (error) throw error;
            return count ?? 0;
        }
        if (op === 'sum' && column) {
            const { data, error } = await supabase.from(table).select(column).limit(10000);
            if (error) throw error;
            const rows = Array.isArray(data) ? data : [];
            return rows.reduce((acc, r) => acc + (Number(r?.[column]) || 0), 0);
        }
    } catch (e) {
        console.warn('fetchMatrixCellQuery failed:', table, op, e);
    }
    return 0;
};

/** اجرای کوئری سفارشی برای سلول ماتریس (فقط SELECT، یک مقدار) */
export const fetchMatrixCellCustomSql = async (sql: string): Promise<string> => {
    try {
        if (!sql || !String(sql).trim()) return '';
        const { data, error } = await supabase.rpc('get_report_matrix_cell_value', { query_sql: String(sql).trim() });
        if (error) throw error;
        return data != null ? String(data) : '';
    } catch (e) {
        console.warn('fetchMatrixCellCustomSql failed:', e);
        return '';
    }
};

// --- Shift Reports Helpers (Direct DB Access) ---
export const fetchShiftReports = async () => {
    try {
        const { data, error } = await supabase
            .from('shift_reports')
            .select('id, tracking_code, shift_date, shift_name, shift_type, supervisor_name, total_production_a, total_production_b, full_data, created_at')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err: any) {
        const msg = (err?.message || '').toLowerCase();
        const errStr = JSON.stringify(err).toLowerCase();
        if (!msg.includes('failed to fetch') && !errStr.includes('failed to fetch')) {
            console.error("Error fetching shift reports:", err);
        }
        return [];
    }
};

export const saveShiftReport = async (reportData: any) => {
    try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let supId = reportData.shiftInfo.supervisor;
        
        if (!supId || !uuidRegex.test(supId)) {
            supId = null;
        }

        const payload = {
            tracking_code: reportData.code,
            shift_date: reportData.shiftInfo.date,
            shift_name: reportData.shiftInfo.name,
            shift_type: reportData.shiftInfo.type,
            shift_duration: reportData.shiftInfo.shiftDuration,
            supervisor_id: supId,
            supervisor_name: reportData.shiftInfo.supervisorName,
            total_production_a: reportData.totalA,
            total_production_b: reportData.totalB,
            full_data: reportData, 
        };

        const { error } = await supabase.from('shift_reports').insert([payload]);
        if (error) throw error;
        return true;
    } catch (err) {
        console.error("Error saving shift report:", err);
        throw err;
    }
};

// --- Tracking Code Generator ---
export const fetchNextTrackingCode = async (prefix: string): Promise<string> => {
    try {
        const { data, error } = await supabase.rpc('get_next_tracking_code', { prefix_input: prefix });
        if (error) {
            // console.error("RPC Error:", error); // Silent
            return prefix + Math.floor(Math.random() * 9000 + 1000); 
        }
        return data as string;
    } catch (e) {
        return prefix + Math.floor(Math.random() * 9000 + 1000);
    }
};

export const fetchNextWorkOrderCode = async (prefix: string): Promise<string> => {
    try {
        const { data, error } = await supabase
            .from('work_orders')
            .select('tracking_code')
            .ilike('tracking_code', `${prefix}%`)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            const lastCode = data[0].tracking_code;
            const numPart = lastCode.replace(prefix, '');
            const nextNum = parseInt(numPart, 10) + 1;
            if (!isNaN(nextNum)) {
                return prefix + String(nextNum).padStart(4, '0');
            }
        }
        return prefix + "0001";

    } catch (e) {
        return fetchNextTrackingCode(prefix);
    }
};

export const fetchNextShiftCode = async (prefix: string): Promise<string> => {
    try {
        const { data, error } = await supabase.rpc('get_next_shift_code_from_prefix', { prefix_input: prefix });
        if (error) {
            return prefix + Math.floor(Math.random() * 9000 + 1000); 
        }
        return data as string;
    } catch (e) {
        return prefix + Math.floor(Math.random() * 9000 + 1000);
    }
};

// --- Initialization Logic ---
const initDefaultWorkflow = () => {
    let workflows = loadWorkflows();
    if (!workflows.find(w => w.module === 'WORK_ORDER')) {
        const defaultWO: WorkflowDefinition = {
            id: 'default-wo-flow',
            module: 'WORK_ORDER',
            title: 'فرآیند استاندارد تعمیرات',
            isActive: true,
            steps: [
                {
                    id: 'step-request',
                    title: 'درخواست',
                    assigneeRole: 'INITIATOR',
                    description: 'ثبت درخواست توسط متقاضی',
                    actions: [
                        { id: 'act-submit', label: 'ارسال جهت انجام', nextStepId: 'step-inprogress', style: 'primary' }
                    ]
                },
                {
                    id: 'step-inprogress',
                    title: 'در حال انجام',
                    assigneeRole: UserRole.USER, 
                    description: 'دستور کار در کارتابل مجری',
                    actions: [
                        { id: 'act-finish', label: 'اتمام کار و ارسال به تایید', nextStepId: 'step-verify', style: 'success' }
                    ]
                },
                {
                    id: 'step-verify',
                    title: 'تایید',
                    assigneeRole: UserRole.MANAGER, 
                    description: 'بررسی کیفیت کار انجام شده',
                    actions: [
                        { id: 'act-approve', label: 'تایید نهایی', nextStepId: 'step-finish', style: 'success' },
                        { id: 'act-reject', label: 'عدم تایید (بازگشت به اجرا)', nextStepId: 'step-inprogress', style: 'danger' }
                    ]
                },
                {
                    id: 'step-finish',
                    title: 'اتمام',
                    assigneeRole: UserRole.ADMIN,
                    description: 'بایگانی درخواست',
                    actions: [
                        { id: 'act-close', label: 'بستن پرونده', nextStepId: 'FINISH', style: 'neutral' }
                    ]
                }
            ]
        };
        workflows.push(defaultWO);
        saveWorkflows(workflows);
    }
};

initDefaultWorkflow();

// --- Workflow Logic ---

export const getWorkflows = () => loadWorkflows();

export const saveWorkflowDefinition = (def: WorkflowDefinition) => {
  const workflows = loadWorkflows();
  const idx = workflows.findIndex(w => w.id === def.id);
  if (idx >= 0) {
    workflows[idx] = def;
  } else {
    workflows.push(def);
  }
  saveWorkflows(workflows);
};

export const startWorkflow = (
  module: string,
  data: any,
  user: User,
  trackingCode: string,
  title: string
): CartableItem | null => {
  const workflows = loadWorkflows();
  let workflow = workflows.find(w => w.module === module && w.isActive);
  
  if (!workflow) {
      workflow = {
          id: `dummy-${module}`,
          module,
          title: 'فرآیند پیش‌فرض',
          isActive: true,
          steps: [{ id: 'step-start', title: 'ثبت شده', assigneeRole: 'INITIATOR', actions: [] }]
      };
  }

  const firstStep = workflow.steps[0];

  const newItem: CartableItem = {
    id: generateId(),
    workflowId: workflow.id,
    trackingCode,
    module,
    title,
    description: `ایجاد شده توسط ${user.fullName}`,
    currentStepId: firstStep.id,
    initiatorId: user.id,
    assigneeRole: (firstStep.assigneeRole as string) === 'INITIATOR' ? user.role : (firstStep.assigneeRole as UserRole),
    status: 'PENDING',
    createdAt: getShamsiDate(),
    updatedAt: getShamsiDate(),
    data: { ...data, status: 'REQUEST' } 
  };

  const items = loadCartable();
  items.push(newItem);
  saveCartable(items);
  return newItem;
};

export const processWorkflowAction = (
  itemId: string,
  actionId: string,
  user: User,
  comment?: string
) => {
  const items = loadCartable();
  const itemIndex = items.findIndex(i => i.id === itemId);
  if (itemIndex === -1) return;

  const item = items[itemIndex];
  const workflows = loadWorkflows();
  const workflow = workflows.find(w => w.id === item.workflowId);
  if (!workflow) return;

  const currentStep = workflow.steps.find(s => s.id === item.currentStepId);
  if (!currentStep) return;

  const action = currentStep.actions.find(a => a.id === actionId);
  if (!action) return;

  if (action.nextStepId === 'FINISH') {
    item.status = 'DONE';
    item.assigneeRole = UserRole.ADMIN; 
    item.description = `پایان فرآیند توسط ${user.fullName}`;
    if (item.data) item.data.status = 'FINISHED'; 
  } else {
    const nextStep = workflow.steps.find(s => s.id === action.nextStepId);
    if (nextStep) {
      item.currentStepId = nextStep.id;
      
      const nextRole = nextStep.assigneeRole;
      if ((nextRole as string) === 'INITIATOR') {
          item.assigneeRole = UserRole.USER;
      } else {
          item.assigneeRole = nextRole as UserRole;
      }

      item.updatedAt = getShamsiDate();
      item.description = `ارجاع شده به ${nextStep.assigneeRole} توسط ${user.fullName}`;
      
      if (item.module === 'WORK_ORDER') {
          if (nextStep.title === 'درخواست') item.data.status = 'REQUEST';
          else if (nextStep.title === 'در حال انجام') item.data.status = 'IN_PROGRESS';
          else if (nextStep.title === 'تایید') item.data.status = 'VERIFICATION';
          else if (nextStep.title === 'اتمام') item.data.status = 'FINISHED';
      }
    }
  }

  items[itemIndex] = item;
  saveCartable(items);
};

export const getMyCartable = (user: User): CartableItem[] => {
  const items = loadCartable();
  return items.filter(item => 
    item.status === 'PENDING' && (
        item.assigneeRole === user.role || 
        ((item.assigneeRole as string) === 'INITIATOR' && item.initiatorId === user.id) ||
        item.assigneeId === user.id
    )
  );
};

export const getAllWorkOrders = (): CartableItem[] => {
    const items = loadCartable();
    return items.filter(item => item.module === 'WORK_ORDER');
};

export const getItemsByModule = (module: string): CartableItem[] => {
    const items = loadCartable();
    return items.filter(item => item.module === module);
};

// --- Cartable Unread Logic (Fixed Logging) ---
export const getUnreadCartableCount = async (userId: string, userRole: string): Promise<number> => {
    try {
        const { data, error } = await supabase
            .from('cartable_items')
            .select('module, assignee_role, initiator_id, assignee_id, data')
            .eq('status', 'PENDING');

        if (error) throw error;

        const myItems = (data || []).filter((item: any) => {
            let hasAccess = false;
            if (item.module === 'WORK_ORDER') {
                hasAccess = true;
            } else {
                const isMyRole = item.assignee_role === userRole;
                const isMeInitiator = item.assignee_role === 'INITIATOR' && item.initiator_id === userId;
                const isMeSpecific = item.assignee_id === userId;
                hasAccess = isMyRole || isMeInitiator || isMeSpecific;
            }

            if (!hasAccess) return false;

            const seenBy = item.data?.seen_by || [];
            return !seenBy.includes(userId);
        });

        return myItems.length;
    } catch (e: any) {
        // Suppress fetch/network errors during polling
        const msg = (e?.message || '').toLowerCase();
        const details = (e?.details || '').toLowerCase();
        const errStr = JSON.stringify(e).toLowerCase();
        
        if (
            msg.includes('failed to fetch') || 
            msg.includes('network request failed') || 
            msg.includes('networkerror') ||
            details.includes('failed to fetch') ||
            errStr.includes('failed to fetch')
        ) {
            return 0;
        }
        console.error("Error counting unread cartable:", JSON.stringify(e));
        return 0;
    }
};

export const markCartableItemSeen = async (itemId: string, userId: string) => {
    try {
        const { data, error } = await supabase
            .from('cartable_items')
            .select('data')
            .eq('id', itemId)
            .single();
        
        if (error || !data) return;

        const currentData = data.data || {};
        const currentSeenBy = currentData.seen_by || [];

        if (currentSeenBy.includes(userId)) return;

        const newSeenBy = [...currentSeenBy, userId];
        const newData = { ...currentData, seen_by: newSeenBy };

        await supabase
            .from('cartable_items')
            .update({ data: newData })
            .eq('id', itemId);
            
    } catch (e: any) {
        const msg = (e?.message || '').toLowerCase();
        const errStr = JSON.stringify(e).toLowerCase();
        if (!msg.includes('failed to fetch') && !errStr.includes('failed to fetch')) {
            console.error("Error marking item seen:", e?.message || e);
        }
    }
};
