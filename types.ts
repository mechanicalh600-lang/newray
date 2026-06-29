
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  STOREKEEPER = 'STOREKEEPER',
  INSPECTOR = 'INSPECTOR',
  MANAGER = 'MANAGER', // Added Manager
  EXPERT = 'EXPERT'    // Added Expert
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  /** @deprecated Not stored client-side; auth is server-side only */
  passwordHash?: string;
  isDefaultPassword?: boolean;
  avatar?: string;
  personnelCode?: string;
}

export interface LogEntry {
  id: string;
  userId: string;
  action: 'LOGIN' | 'LOGOUT';
  timestamp: string;
  ip: string;
}

export interface SystemLog {
  id: string;
  userName: string;
  personnelCode: string;
  action: string;
  date: string;
  time: string;
  ip: string;
  details?: string;
}

// --- Workflow Types ---

export type WorkflowConditionOperator = 'eq' | 'neq' | 'contains' | 'in' | 'gt' | 'lt' | 'gte' | 'lte';

/** شرط مسیریابی — اولین شرط برقرار، مسیر بعدی را تعیین می‌کند */
export interface WorkflowConditionRule {
  id: string;
  field: string;
  operator: WorkflowConditionOperator;
  value: string;
  nextStepId: string | 'FINISH';
  /** تخصیص اختیاری در این شاخه */
  assigneeRole?: UserRole | 'INITIATOR';
  assigneeUserId?: string;
  /** رنگ خط این شاخه */
  lineColor?: string;
}

export interface WorkflowAction {
  id: string;
  label: string;
  /** مسیر پیش‌فرض وقتی هیچ شرطی برقرار نباشد */
  nextStepId: string | 'FINISH';
  style: 'primary' | 'danger' | 'success' | 'neutral';
  requiredRole?: UserRole;
  /** رنگ خط اتصال به مرحله بعد */
  lineColor?: string;
  /** شرط‌های مسیریابی — ارزیابی به ترتیب، اولین match */
  conditions?: WorkflowConditionRule[];
}

export interface WorkflowStepLayout {
  x: number;
  y: number;
}

export interface WorkflowStep {
  id: string;
  title: string;
  /** کد وضعیت موجودیت (مثلاً IN_PROGRESS) — در جدول entity ذخیره می‌شود */
  statusCode: string;
  assigneeRole: UserRole | 'INITIATOR';
  /** تخصیص به کاربر مشخص (اختیاری — اولویت بر نقش) */
  assigneeUserId?: string;
  /** گیرندگان (چند کاربر) */
  recipientUserIds?: string[];
  /** رونوشت (CC) */
  ccUserIds?: string[];
  /** موقعیت روی بوم طراحی */
  layout?: WorkflowStepLayout;
  /** استیت آغازین گردش کار */
  isStart?: boolean;
  /** استیت پایانی گردش کار */
  isFinish?: boolean;
  description?: string;
  actions: WorkflowAction[];
}

export interface WorkflowDefinition {
  id: string;
  module: string; // module_key e.g. WORK_ORDER
  processModuleSlug?: string;
  title: string;
  steps: WorkflowStep[];
  isActive: boolean;
  version?: number;
  isPublished?: boolean;
}

export interface ProcessModule {
  id: string;
  slug: string;
  module_key: string;
  title: string;
  icon: string;
  entity_table: string;
  entity_status_field: string;
  form_route: string;
  description: string;
  sort_order: number;
  is_builtin: boolean;
  is_active: boolean;
  active_workflow_id?: string | null;
  condition_fields?: { key: string; label: string }[];
  form_schema?: { tabs?: unknown[]; fields?: unknown[]; groups?: unknown[]; sections?: unknown[] };
  list_schema?: { columns?: { key: string; label: string; visible?: boolean }[] };
  use_dynamic_form?: boolean;
  form_version?: number;
  published_form_version?: number;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CartableItem {
  id: string;
  workflowId: string;
  trackingCode: string;
  module: string;
  title: string;
  description: string;
  currentStepId: string;
  initiatorId: string;
  assigneeRole: UserRole | 'INITIATOR';
  assigneeId?: string; // Optional: specific user assignment
  status: 'PENDING' | 'DONE' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  data: any; // The actual entity data (WorkOrder, Project, etc.)
}

export interface WorkflowHistory {
  id: string;
  cartableItemId: string;
  stepId: string;
  actorId: string;
  actionTaken: string;
  comment?: string;
  timestamp: string;
}

// --- Internal Messaging ---
export interface Attachment {
    name: string;
    size: number;
    type: string;
    data: string; // Base64 string
}

export interface Message {
    id: string;
    senderId: string;
    senderName: string;
    receiverId: string; // Could be userId, role name, or 'ALL'
    receiverType: 'USER' | 'GROUP' | 'ALL'; // Added to distinguish target
    subject: string;
    body: string;
    createdAt: string;
    readBy: string[]; // Array of user IDs who read the message
    attachments?: Attachment[]; // New field for files
}

// --- Entity Types ---

export interface Location {
  id: string;
  code: string;
  name: string;
  parentId?: string;
}

export interface Equipment {
  id: string;
  code: string;
  name: string;
  localName: string;
  locationId: string;
  description?: string;
}

export interface Project {
  id: string;
  title: string;
  manager: string;
  budget: number;
  startDate: string;
  endDate: string;
  progress: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'HALTED';
  description: string;
}

export interface PerformanceScore {
  id: string;
  personnelId: string;
  period: string; // e.g., "1403-01"
  score: number; // 0-100
  criteria: { label: string; score: number; max: number }[];
  evaluatorId: string;
  notes?: string;
}

// Updated Statuses based on user request
export type WorkOrderStatus = 'REQUEST' | 'IN_PROGRESS' | 'VERIFICATION' | 'FINISHED';

export interface WorkOrder {
  id: string;
  trackingCode: string; 
  equipmentId: string;
  requestDate: string; 
  requesterId: string;
  failureDescription: string;
  actionTaken?: string;
  startTime?: string;
  endTime?: string;
  downtime?: number; 
  status: WorkOrderStatus; // Updated
  attachments: string[];
  [key: string]: any; // Allow flexibility for workflow data
}

// --- NEW NOTE INTERFACE ---
export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  reminderDate?: string; // Shamsi date
  reminderTime?: string; // HH:MM
  isCompleted: boolean;
  attachments?: Attachment[];
  createdAt: string;
  reminderSeen?: boolean; // To prevent multiple alerts
}

export interface PartRequest {
  id: string;
  tracking_code?: string;
  requester_id?: string;
  requester_name?: string;
  request_date?: string;
  description?: string;
  work_order_code?: string;
  status?: string;
  items?: unknown[];
  created_at?: string;
}

export interface ChecklistItem {
  id: string;
  activityCardId: string;
  order: number;
  description: string;
}

export interface InspectionResult {
  id: string;
  activity_card_id?: string;
  equipment_id?: string;
  result?: string;
  notes?: string;
  inspected_at?: string;
  inspector_id?: string;
  [key: string]: unknown;
}

export interface DashboardStat {
  name: string;
  value: number;
  color: string;
}

export interface TechnicalDocument {
  id: string;
  code?: string;
  title: string;
  type?: string;
  file_url?: string;
  description?: string;
  created_at?: string;
}

export interface MeetingMinutes {
  id: string;
  tracking_code?: string;
  subject: string;
  location?: string;
  meeting_date?: string;
  start_time?: string;
  end_time?: string;
  attendees?: unknown[];
  status?: string;
  created_at?: string;
}

export interface TechnicalSuggestion {
  id: string;
  tracking_code?: string;
  user_id?: string;
  user_name: string;
  description: string;
  status?: string;
  attachments?: unknown[];
  created_at?: string;
}

export interface PurchaseRequest {
  id: string;
  request_number?: string;
  requester_id?: string;
  requester_name?: string;
  request_date?: string;
  description?: string;
  qty?: number;
  unit?: string;
  location?: string;
  priority?: string;
  status?: string;
  attachments?: unknown[];
  created_at?: string;
}
