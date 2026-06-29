/** تنظیمات runtime هر فرم عملیاتی */
export interface EntityFormModuleConfig {
  slug: string;
  moduleKey?: string;
  trackingPrefix?: string;
  startWorkflow?: boolean;
  /** فیلد عنوان برای کارتابل */
  titleField?: string;
  /** فیلدهای سیستمی هنگام ثبت */
  onCreate?: (user: { id: string; fullName?: string }) => Record<string, unknown>;
}

export const ENTITY_FORM_MODULES: EntityFormModuleConfig[] = [
  {
    slug: 'work-order',
    moduleKey: 'WORK_ORDER',
    trackingPrefix: 'WO',
    startWorkflow: true,
    titleField: 'equipment_name',
    onCreate: (u) => ({ requester_id: u.id, requester_name: u.fullName || '', status: 'REQUEST' }),
  },
  {
    slug: 'pm-plan',
    moduleKey: 'PM_PLAN',
    onCreate: () => ({ is_active: true }),
  },
  {
    slug: 'service-repair',
    moduleKey: 'SERVICE_REPAIR',
    trackingPrefix: 'SRV',
    startWorkflow: true,
    titleField: 'equipment_name',
    onCreate: (u) => ({ requester_id: u.id, requester_name: u.fullName || '', status: 'PENDING' }),
  },
  {
    slug: 'permit',
    moduleKey: 'PERMIT',
    trackingPrefix: 'PTW',
    startWorkflow: true,
    titleField: 'permit_type',
    onCreate: (u) => ({ requester_id: u.id, status: 'PENDING' }),
  },
  {
    slug: 'project',
    moduleKey: 'PROJECT',
    trackingPrefix: 'PROJ',
    startWorkflow: true,
    titleField: 'title',
    onCreate: () => ({ status: 'PLANNED', progress: 0 }),
  },
  {
    slug: 'tech-doc',
    moduleKey: 'TECH_DOC',
    trackingPrefix: 'DOC',
    startWorkflow: true,
    titleField: 'title',
    onCreate: (u) => ({ requester_id: u.id, requester_name: u.fullName || '', status: 'PENDING' }),
  },
  {
    slug: 'suggestion',
    moduleKey: 'SUGGESTION',
    trackingPrefix: 'SUG',
    startWorkflow: true,
    titleField: 'description',
    onCreate: (u) => ({ user_id: u.id, user_name: u.fullName || '', status: 'PENDING', attachments: [] }),
  },
  {
    slug: 'meeting',
    moduleKey: 'MEETING',
    trackingPrefix: 'MT',
    startWorkflow: true,
    titleField: 'subject',
    onCreate: () => ({ status: 'DRAFT', attendees: [] }),
  },
  {
    slug: 'part-request',
    moduleKey: 'PART_REQUEST',
    trackingPrefix: 'PR',
    startWorkflow: true,
    titleField: 'description',
    onCreate: (u) => ({ requester_id: u.id, requester_name: u.fullName || '', status: 'PENDING', items: [] }),
  },
  {
    slug: 'purchase',
    moduleKey: 'PURCHASE',
    trackingPrefix: 'PUR',
    startWorkflow: true,
    titleField: 'description',
    onCreate: (u) => ({ requester_id: u.id, requester_name: u.fullName || '', status: 'PENDING', attachments: [] }),
  },
  {
    slug: 'factory-exit',
    moduleKey: 'FACTORY_EXIT',
    trackingPrefix: 'FEX',
    startWorkflow: true,
    titleField: 'description',
    onCreate: (u) => ({ requester_id: u.id, requester_name: u.fullName || '', status: 'PENDING', line_items: [] }),
  },
  {
    slug: 'training-course',
    moduleKey: 'TRAINING_COURSE',
    onCreate: () => ({}),
  },
  {
    slug: 'personnel-skill',
    moduleKey: 'PERSONNEL_SKILL',
    onCreate: () => ({}),
  },
  {
    slug: 'performance',
    moduleKey: 'PERFORMANCE',
    startWorkflow: true,
    titleField: 'personnel_name',
    onCreate: () => ({ status: 'DRAFT', criteria_scores: [] }),
  },
  {
    slug: 'mission',
    moduleKey: 'MISSION',
    trackingPrefix: 'MIS',
    startWorkflow: true,
    titleField: 'destination',
    onCreate: (u) => ({ requester_id: u.id, requester_name: u.fullName || '', status: 'PENDING' }),
  },
];

export const getEntityFormConfig = (slug: string) =>
  ENTITY_FORM_MODULES.find(m => m.slug === slug);
