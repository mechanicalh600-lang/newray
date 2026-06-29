/** ماژول‌هایی که در کارتابل تب اختصاصی دارند */
export const WORKFLOW_INBOX_MODULE_KEYS = [
  'WORK_ORDER',
  'PART_REQUEST',
  'PURCHASE',
  'PROJECT',
  'SUGGESTION',
  'MEETING',
  'TECH_DOC',
  'PERFORMANCE',
  'MISSION',
  'FACTORY_EXIT',
] as const;

export type WorkflowInboxModuleKey = (typeof WORKFLOW_INBOX_MODULE_KEYS)[number];

export const isWorkflowInboxModule = (moduleKey: string): boolean =>
  (WORKFLOW_INBOX_MODULE_KEYS as readonly string[]).includes(moduleKey);
