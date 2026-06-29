import { supabase } from '../supabaseClient';
import {
  CartableItem,
  User,
  UserRole,
  WorkflowAction,
  WorkflowConditionRule,
  WorkflowDefinition,
  WorkflowStep,
} from '../types';
import { generateId, getShamsiDate } from '../utils';
import { getActiveWorkflowForModuleKey, getWorkflowDefinitionById } from './workflowDefinitions';
import { getProcessModuleByKey } from './processModules';
import { clearCartableItemReads } from './cartableReads';

export interface ResolvedRoute {
  nextStepId: string | 'FINISH';
  assigneeRole?: UserRole | 'INITIATOR';
  assigneeUserId?: string;
}

const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
};

export const evaluateCondition = (rule: WorkflowConditionRule, data: Record<string, unknown>): boolean => {
  const raw = getNestedValue(data, rule.field);
  const left = raw == null ? '' : String(raw).trim();
  const right = String(rule.value ?? '').trim();

  switch (rule.operator) {
    case 'eq':
      return left.toLowerCase() === right.toLowerCase();
    case 'neq':
      return left.toLowerCase() !== right.toLowerCase();
    case 'contains':
      return left.toLowerCase().includes(right.toLowerCase());
    case 'in': {
      const parts = right.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      return parts.includes(left.toLowerCase());
    }
    case 'gt':
      return Number(left) > Number(right);
    case 'lt':
      return Number(left) < Number(right);
    case 'gte':
      return Number(left) >= Number(right);
    case 'lte':
      return Number(left) <= Number(right);
    default:
      return false;
  }
};

export const resolveActionRoute = (action: WorkflowAction, data: Record<string, unknown>): ResolvedRoute => {
  const conditions = action.conditions || [];
  for (const rule of conditions) {
    if (evaluateCondition(rule, data)) {
      return {
        nextStepId: rule.nextStepId,
        assigneeRole: rule.assigneeRole,
        assigneeUserId: rule.assigneeUserId,
      };
    }
  }
  return { nextStepId: action.nextStepId };
};

const mapDbRowToCartableItem = (row: Record<string, unknown>): CartableItem => ({
  id: String(row.id),
  workflowId: String(row.workflow_id),
  trackingCode: String(row.tracking_code || ''),
  module: String(row.module),
  title: String(row.title),
  description: String(row.description || ''),
  currentStepId: String(row.current_step_id),
  initiatorId: String(row.initiator_id),
  assigneeRole: row.assignee_role as UserRole | 'INITIATOR',
  assigneeId: row.assignee_id ? String(row.assignee_id) : undefined,
  status: row.status as CartableItem['status'],
  createdAt: row.created_at ? new Date(String(row.created_at)).toLocaleDateString('fa-IR') : getShamsiDate(),
  updatedAt: row.updated_at ? new Date(String(row.updated_at)).toLocaleDateString('fa-IR') : getShamsiDate(),
  data: (row.data as Record<string, unknown>) || {},
});

const resolveAssignee = (
  step: WorkflowStep,
  user: User,
  route: ResolvedRoute
): { assigneeRole: UserRole | 'INITIATOR'; assigneeId?: string } => {
  if (route.assigneeUserId) {
    return { assigneeRole: route.assigneeRole || step.assigneeRole, assigneeId: route.assigneeUserId };
  }
  if (step.assigneeUserId) {
    return { assigneeRole: step.assigneeRole, assigneeId: step.assigneeUserId };
  }
  const role = route.assigneeRole || step.assigneeRole;
  if (role === 'INITIATOR') {
    return { assigneeRole: user.role, assigneeId: user.id };
  }
  return { assigneeRole: role as UserRole };
};

const appendHistory = async (payload: {
  cartableItemId: string;
  stepId: string;
  stepTitle?: string;
  stepStatusCode?: string;
  actionId?: string;
  actionLabel?: string;
  actorId: string;
  actorName?: string;
  comment?: string;
  data?: Record<string, unknown>;
}) => {
  try {
    await supabase.from('workflow_history').insert([
      {
        cartable_item_id: payload.cartableItemId,
        step_id: payload.stepId,
        step_title: payload.stepTitle,
        step_status_code: payload.stepStatusCode,
        action_id: payload.actionId,
        action_label: payload.actionLabel,
        actor_id: payload.actorId,
        actor_name: payload.actorName,
        comment: payload.comment,
        payload: payload.data || {},
      },
    ]);
  } catch {
    // non-blocking
  }
};

const syncEntityStatus = async (
  entityTable: string | undefined,
  entityId: string | undefined,
  statusField: string,
  statusCode: string,
  data: Record<string, unknown>
) => {
  if (!entityTable || !entityId) return;
  try {
    await supabase.from(entityTable).update({ [statusField]: statusCode, ...data }).eq('id', entityId);
  } catch {
    // entity sync optional
  }
};

export const startWorkflow = async (
  moduleKey: string,
  data: Record<string, unknown>,
  user: User,
  trackingCode: string,
  title: string,
  entityId?: string
): Promise<CartableItem | null> => {
  const processModule = await getProcessModuleByKey(moduleKey);
  let workflow = await getActiveWorkflowForModuleKey(moduleKey);

  if (!workflow || !workflow.steps.length) {
    workflow = {
      id: `dummy-${moduleKey}`,
      module: moduleKey,
      title: 'فرآیند پیش‌فرض',
      isActive: true,
      steps: [{ id: 'step-start', title: 'ثبت شده', statusCode: 'REGISTERED', assigneeRole: 'INITIATOR', actions: [] }],
    };
  }

  const firstStep = workflow.steps.find(s => s.isStart) || workflow.steps[0];
  const statusCode = firstStep.statusCode || 'PENDING';
  const assignee = resolveAssignee(firstStep, user, { nextStepId: firstStep.id });

  const row = {
    id: generateId(),
    workflow_id: workflow.id,
    tracking_code: trackingCode,
    module: moduleKey,
    title,
    description: `ایجاد شده توسط ${user.fullName}`,
    current_step_id: firstStep.id,
    initiator_id: user.id,
    assignee_role: assignee.assigneeRole,
    assignee_id: assignee.assigneeId || null,
    status: 'PENDING',
    data: { ...data, status: statusCode, seen_by: [] },
    entity_id: entityId || null,
    entity_table: processModule?.entity_table || null,
  };

  try {
    const { data: inserted, error } = await supabase.from('cartable_items').insert([row]).select('*').single();
    if (error) throw error;

    await appendHistory({
      cartableItemId: String(inserted.id),
      stepId: firstStep.id,
      stepTitle: firstStep.title,
      stepStatusCode: statusCode,
      actionLabel: 'شروع فرآیند',
      actorId: user.id,
      actorName: user.fullName,
      data: row.data as Record<string, unknown>,
    });

    if (processModule?.entity_table && entityId) {
      await syncEntityStatus(processModule.entity_table, entityId, processModule.entity_status_field, statusCode, {});
    }

    return mapDbRowToCartableItem(inserted as Record<string, unknown>);
  } catch (err) {
    console.error('startWorkflow DB error:', err);
    return null;
  }
};

export const processWorkflowAction = async (
  itemId: string,
  actionId: string,
  user: User,
  comment?: string
): Promise<boolean> => {
  try {
    const { data: row, error } = await supabase.from('cartable_items').select('*').eq('id', itemId).single();
    if (error || !row) return false;

    const item = mapDbRowToCartableItem(row as Record<string, unknown>);
    let workflow: WorkflowDefinition | null = await getWorkflowDefinitionById(item.workflowId);
    if (!workflow) workflow = await getActiveWorkflowForModuleKey(item.module);
    if (!workflow) return false;

    const currentStep = workflow.steps.find(s => s.id === item.currentStepId);
    if (!currentStep) return false;

    const action = currentStep.actions.find(a => a.id === actionId);
    if (!action) return false;

    const route = resolveActionRoute(action, item.data as Record<string, unknown>);
    const processModule = await getProcessModuleByKey(item.module);

    let updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (route.nextStepId === 'FINISH') {
      updates = {
        ...updates,
        status: 'DONE',
        assignee_role: UserRole.ADMIN,
        description: `پایان فرآیند توسط ${user.fullName}`,
        data: { ...item.data, status: 'FINISHED' },
      };
    } else {
      const nextStep = workflow.steps.find(s => s.id === route.nextStepId);
      if (!nextStep) return false;

      if (nextStep.isFinish) {
        updates = {
          ...updates,
          status: 'DONE',
          current_step_id: nextStep.id,
          assignee_role: UserRole.ADMIN,
          description: `پایان فرآیند در «${nextStep.title}»`,
          data: { ...item.data, status: nextStep.statusCode || 'FINISHED' },
        };
      } else {
      const assignee = resolveAssignee(nextStep, user, route);
      const statusCode = nextStep.statusCode || String(item.data?.status || '');

      await clearCartableItemReads(itemId);

      updates = {
        ...updates,
        current_step_id: nextStep.id,
        assignee_role: assignee.assigneeRole,
        assignee_id: assignee.assigneeId || null,
        description: `ارجاع به «${nextStep.title}» توسط ${user.fullName}`,
        data: { ...item.data, status: statusCode },
      };

      await appendHistory({
        cartableItemId: itemId,
        stepId: nextStep.id,
        stepTitle: nextStep.title,
        stepStatusCode: statusCode,
        actionId: action.id,
        actionLabel: action.label,
        actorId: user.id,
        actorName: user.fullName,
        comment,
        data: updates.data as Record<string, unknown>,
      });

      if (processModule?.entity_table && row.entity_id) {
        await syncEntityStatus(
          processModule.entity_table,
          String(row.entity_id),
          processModule.entity_status_field,
          statusCode,
          {}
        );
      }
      }
    }

    const { error: updErr } = await supabase.from('cartable_items').update(updates).eq('id', itemId);
    if (updErr) return false;

    if (route.nextStepId === 'FINISH' && processModule?.entity_table && row.entity_id) {
      await syncEntityStatus(processModule.entity_table, String(row.entity_id), processModule.entity_status_field, 'FINISHED', {});
    }

    return true;
  } catch (err) {
    console.error('processWorkflowAction error:', err);
    return false;
  }
};

export const getWorkflowForCartableItem = async (item: CartableItem): Promise<WorkflowDefinition | null> => {
  let wf = await getWorkflowDefinitionById(item.workflowId);
  if (!wf) wf = await getActiveWorkflowForModuleKey(item.module);
  return wf;
};

export const getStepForCartableItem = async (item: CartableItem): Promise<WorkflowStep | undefined> => {
  const wf = await getWorkflowForCartableItem(item);
  return wf?.steps.find(s => s.id === item.currentStepId);
};

export const getActionsForCartableItem = async (item: CartableItem) => {
  const step = await getStepForCartableItem(item);
  return step?.actions || [];
};

export const postCartableComment = async (
  itemId: string,
  actor: User,
  comment: string
): Promise<boolean> => {
  if (!comment.trim()) return true;
  try {
    const { data: row } = await supabase.from('cartable_items').select('current_step_id, data').eq('id', itemId).single();
    if (!row) return false;
    await appendHistory({
      cartableItemId: itemId,
      stepId: String(row.current_step_id),
      actionLabel: 'یادداشت / ارسال',
      actorId: actor.id,
      actorName: actor.fullName,
      comment: comment.trim(),
      data: (row.data as Record<string, unknown>) || {},
    });
    return true;
  } catch {
    return false;
  }
};

/** ارجاع به کاربر دیگر در همان مرحله */
export const referCartableItem = async (
  itemId: string,
  targetUserId: string,
  targetUserName: string,
  targetRole: UserRole,
  actor: User,
  comment?: string
): Promise<boolean> => {
  try {
    const { data: row, error } = await supabase.from('cartable_items').select('*').eq('id', itemId).single();
    if (error || !row) return false;

    await clearCartableItemReads(itemId);

    const note = comment?.trim()
      ? `ارجاع به ${targetUserName} — ${comment.trim()}`
      : `ارجاع به ${targetUserName} توسط ${actor.fullName}`;

    const { error: updErr } = await supabase
      .from('cartable_items')
      .update({
        assignee_id: targetUserId,
        assignee_role: targetRole,
        description: note,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (updErr) return false;

    await appendHistory({
      cartableItemId: itemId,
      stepId: String(row.current_step_id),
      actionLabel: 'ارجاع',
      actorId: actor.id,
      actorName: actor.fullName,
      comment: note,
      data: { referred_to: targetUserId, referred_to_name: targetUserName },
    });

    return true;
  } catch (err) {
    console.error('referCartableItem error:', err);
    return false;
  }
};
