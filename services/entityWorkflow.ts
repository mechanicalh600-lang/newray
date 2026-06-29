import { User } from '../types';
import { startWorkflow } from '../workflowStore';

/** پس از ثبت رکورد entity در دیتابیس، گردش کار را در کارتابل آغاز می‌کند */
export const startEntityWorkflow = async (
  moduleKey: string,
  user: User,
  opts: {
    entityId: string;
    trackingCode: string;
    title: string;
    data: Record<string, unknown>;
  }
): Promise<boolean> => {
  const item = await startWorkflow(
    moduleKey,
    opts.data,
    user,
    opts.trackingCode,
    opts.title,
    opts.entityId
  );
  return !!item;
};
