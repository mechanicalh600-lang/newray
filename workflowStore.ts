
import { WorkflowDefinition, CartableItem, User, UserRole, WorkflowHistory, Message, Attachment } from './types';
import { generateId, getShamsiDate, getTime } from './utils';
import { supabase } from './supabaseClient';
import {
  getAllWorkflowDefinitions,
  saveWorkflowDefinition as saveWorkflowDefinitionDb,
  seedDefaultWorkflowsIfEmpty,
} from './services/workflowDefinitions';
import { clearCartableItemReads, markCartableItemRead, fetchReadCartableIds } from './services/cartableReads';
import {
  startWorkflow as startWorkflowEngine,
  processWorkflowAction as processWorkflowActionEngine,
  getActionsForCartableItem,
  getStepForCartableItem,
} from './services/workflowEngine';

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
        const orFilter = [
            `and(receiver_type.eq.USER,receiver_id.eq.${userId})`,
            'receiver_type.eq.ALL',
            `and(receiver_type.eq.GROUP,receiver_id.eq.${userRole})`,
        ].join(',');

        const { count, error } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .or(orFilter)
            .not('read_by', 'cs', `{${userId}}`);

        if (error) throw error;
        return count ?? 0;
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

// --- Workflow Logic (DB-backed via services) ---

let workflowsCache: WorkflowDefinition[] = [];
let workflowsCachePromise: Promise<WorkflowDefinition[]> | null = null;

export const refreshWorkflowsCache = async (): Promise<WorkflowDefinition[]> => {
  if (!workflowsCachePromise) {
    workflowsCachePromise = (async () => {
      await seedDefaultWorkflowsIfEmpty();
      workflowsCache = await getAllWorkflowDefinitions();
      // sync legacy localStorage for offline fallback
      saveWorkflows(workflowsCache);
      return workflowsCache;
    })().finally(() => {
      workflowsCachePromise = null;
    });
  }
  return workflowsCachePromise;
};

if (typeof window !== 'undefined') {
  void refreshWorkflowsCache();
  window.addEventListener('workflow-definitions-changed', () => {
    void refreshWorkflowsCache();
  });
}

export const getWorkflows = (): WorkflowDefinition[] =>
  workflowsCache.length ? workflowsCache : loadWorkflows();

export const saveWorkflowDefinition = (def: WorkflowDefinition) => {
  // legacy sync API — prefer saveWorkflowDefinitionDb from services
  const workflows = loadWorkflows();
  const idx = workflows.findIndex(w => w.id === def.id);
  if (idx >= 0) workflows[idx] = def;
  else workflows.push(def);
  saveWorkflows(workflows);
  workflowsCache = workflows;
};

export { saveWorkflowDefinitionDb };
export {
  getActionsForCartableItem,
  getStepForCartableItem,
  postCartableComment,
  referCartableItem,
} from './services/workflowEngine';

export const startWorkflow = async (
  module: string,
  data: any,
  user: User,
  trackingCode: string,
  title: string,
  entityId?: string
): Promise<CartableItem | null> => {
  await refreshWorkflowsCache();
  return startWorkflowEngine(module, data, user, trackingCode, title, entityId);
};

export const processWorkflowAction = async (
  itemId: string,
  actionId: string,
  user: User,
  comment?: string
): Promise<boolean> => {
  await refreshWorkflowsCache();
  return processWorkflowActionEngine(itemId, actionId, user, comment);
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
        const orFilter = [
            `assignee_role.eq.${userRole}`,
            `assignee_id.eq.${userId}`,
            `and(assignee_role.eq.INITIATOR,initiator_id.eq.${userId})`,
            'module.eq.WORK_ORDER',
        ].join(',');

        const { data, error } = await supabase
            .from('cartable_items')
            .select('id, data')
            .eq('status', 'PENDING')
            .or(orFilter);

        if (error) throw error;

        const rows = data || [];
        const ids = rows.map((r: { id: string }) => r.id);
        const readIds = await fetchReadCartableIds(userId, ids);

        return rows.filter((item: { id: string; data?: { seen_by?: string[] } }) => {
            const legacySeen = item.data?.seen_by || [];
            return !readIds.has(item.id) && !legacySeen.includes(userId);
        }).length;
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
    await markCartableItemRead(itemId, userId);
};

export const CARTABLE_UNREAD_CHANGED = 'cartable-unread-changed';
export const MESSAGES_UNREAD_CHANGED = 'messages-unread-changed';

export const notifyCartableUnreadChanged = (delta?: number) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(CARTABLE_UNREAD_CHANGED, { detail: { delta } }));
};

export const notifyMessagesUnreadChanged = (delta?: number) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(MESSAGES_UNREAD_CHANGED, { detail: { delta } }));
};

export { fetchReadCartableIds, markCartableItemRead, clearCartableItemReads } from './services/cartableReads';
