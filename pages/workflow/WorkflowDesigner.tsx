
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { WorkflowDefinition, WorkflowStep, UserRole } from '../../types';
import {
  activateWorkflowDefinition,
  getWorkflowsForProcessSlug,
  saveWorkflowDefinition as saveWorkflowDefinitionDb,
  seedDefaultWorkflowsIfEmpty,
} from '../../services/workflowDefinitions';
import {
  findProcessOptionBySlug,
  loadProcessDesignOptions,
  ProcessDesignOption,
} from '../../services/processDesignRegistry';
import { refreshWorkflowsCache, fetchMasterData } from '../../workflowStore';
import { Plus, Save, GitMerge, Settings } from 'lucide-react';
import { generateId } from '../../utils';
import WorkflowFlowCanvas, { StatusOption } from '../../components/workflow/WorkflowFlowCanvas';

const FALLBACK_WO_STATUSES: StatusOption[] = [
  { code: 'REQUEST', name: 'درخواست' },
  { code: 'IN_PROGRESS', name: 'در حال انجام' },
  { code: 'VERIFICATION', name: 'تایید' },
  { code: 'FINISHED', name: 'اتمام' },
  { code: 'PENDING', name: 'در انتظار' },
  { code: 'APPROVED', name: 'تایید شده' },
  { code: 'REJECTED', name: 'رد شده' },
];

const blankStep = (statusCode: string): WorkflowStep => ({
  id: generateId(),
  title: 'استیت جدید',
  statusCode,
  assigneeRole: UserRole.USER,
  layout: { x: 120, y: 120 },
  isStart: false,
  isFinish: false,
  recipientUserIds: [],
  ccUserIds: [],
  actions: [],
});

export const WorkflowDesigner: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [processOptions, setProcessOptions] = useState<ProcessDesignOption[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [selectedProcessSlug, setSelectedProcessSlug] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>(FALLBACK_WO_STATUSES);
  const [workTypes, setWorkTypes] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);

  const selectedProcess = useMemo(
    () => findProcessOptionBySlug(processOptions, selectedProcessSlug),
    [processOptions, selectedProcessSlug]
  );

  const conditionFieldOptions = useMemo(() => {
    const base = selectedProcess?.conditionFields || [];
    return [
      ...base,
      { key: 'work_type', label: 'نوع کار' },
      { key: 'priority', label: 'اولویت' },
      { key: 'status', label: 'وضعیت' },
    ];
  }, [selectedProcess]);

  const loadMasterLookups = async (moduleKey?: string) => {
    const [statusRows, types, people] = await Promise.all([
      fetchMasterData('work_order_status'),
      fetchMasterData('work_types'),
      fetchMasterData('personnel'),
    ]);

    const mappedStatus: StatusOption[] = (statusRows || [])
      .map((r: any) => ({
        code: String(r.code || r.name || '').trim(),
        name: String(r.name || r.title || r.code || '').trim(),
      }))
      .filter(s => s.code);

    setStatusOptions(
      mappedStatus.length
        ? mappedStatus
        : moduleKey === 'WORK_ORDER'
          ? FALLBACK_WO_STATUSES
          : FALLBACK_WO_STATUSES
    );
    setWorkTypes(types || []);
    setPersonnel(
      (people || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name ?? p.fullName ?? p.name,
      }))
    );
  };

  const loadProcessOptions = async () => {
    const opts = await loadProcessDesignOptions();
    setProcessOptions(opts);
    return opts;
  };

  const loadWorkflowsForProcess = async (slug: string) => {
    if (!slug) {
      setWorkflows([]);
      return;
    }
    setLoading(true);
    try {
      await seedDefaultWorkflowsIfEmpty();
      const rows = await getWorkflowsForProcessSlug(slug);
      setWorkflows(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const opts = await loadProcessOptions();
      const slugParam = searchParams.get('slug');
      if (slugParam) {
        const opt = findProcessOptionBySlug(opts, slugParam);
        if (opt) {
          setSelectedProcessSlug(opt.slug);
          await loadMasterLookups(opt.moduleKey);
          await loadWorkflowsForProcess(opt.slug);
        }
        setSearchParams({}, { replace: true });
      }
    };
    init();
    const onChanged = () => {
      if (selectedProcessSlug) loadWorkflowsForProcess(selectedProcessSlug);
    };
    window.addEventListener('process-modules-changed', onChanged);
    window.addEventListener('workflow-definitions-changed', onChanged);
    return () => {
      window.removeEventListener('process-modules-changed', onChanged);
      window.removeEventListener('workflow-definitions-changed', onChanged);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedProcessSlug) {
      const opt = findProcessOptionBySlug(processOptions, selectedProcessSlug);
      loadMasterLookups(opt?.moduleKey);
      loadWorkflowsForProcess(selectedProcessSlug);
    }
  }, [selectedProcessSlug, processOptions]);

  const handleCreateWorkflow = () => {
    if (!selectedProcess) {
      alert('ابتدا فرآیند را انتخاب کنید.');
      return;
    }
    setSelectedWorkflow({
      id: `new-${generateId()}`,
      title: `گردش کار ${selectedProcess.title}`,
      module: selectedProcess.moduleKey,
      processModuleSlug: selectedProcess.slug,
      isActive: false,
      steps: [blankStep(statusOptions[0]?.code || 'REQUEST')].map((s, i) => ({
        ...s,
        isStart: i === 0,
        layout: { x: 200, y: 200 },
      })),
    });
  };

  const handleSave = async () => {
    if (!selectedWorkflow || !selectedProcess) return;
    if (!selectedWorkflow.title.trim()) {
      alert('عنوان گردش کار را وارد کنید.');
      return;
    }
    if (!selectedWorkflow.steps.length) {
      alert('حداقل یک مرحله تعریف کنید.');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveWorkflowDefinitionDb(
        { ...selectedWorkflow, module: selectedProcess.moduleKey, processModuleSlug: selectedProcess.slug },
        selectedProcess.slug
      );
      if (selectedWorkflow.isActive) {
        await activateWorkflowDefinition(saved.id, selectedProcess.slug);
      }
      await refreshWorkflowsCache();
      await loadWorkflowsForProcess(selectedProcess.slug);
      setSelectedWorkflow(saved);
      alert('گردش کار ذخیره شد.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (wf: WorkflowDefinition) => {
    if (!selectedProcess) return;
    await activateWorkflowDefinition(wf.id, selectedProcess.slug);
    await refreshWorkflowsCache();
    await loadWorkflowsForProcess(selectedProcess.slug);
    alert(`گردش کار «${wf.title}» فعال شد.`);
  };

  if (!selectedWorkflow) {
    return (
      <div className="w-full max-w-full space-y-6 pb-20">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitMerge className="text-primary" /> طراحی گردش کار
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              className="p-2 border rounded-lg bg-white dark:bg-gray-800 min-w-[220px]"
              value={selectedProcessSlug}
              onChange={e => setSelectedProcessSlug(e.target.value)}
            >
              <option value="">انتخاب فرآیند — مثال: دستور کار</option>
              {processOptions.map(o => (
                <option key={o.slug} value={o.slug}>{o.title}</option>
              ))}
            </select>
            <Link to="/process-design" className="text-sm text-primary hover:underline">
              مدیریت فرآیندها
            </Link>
            <button
              onClick={handleCreateWorkflow}
              disabled={!selectedProcessSlug}
              className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> گردش کار جدید
            </button>
          </div>
        </div>

        {!selectedProcessSlug && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            ابتدا فرآیند را انتخاب کنید — مثلاً «دستور کار» یا «درخواست قطعه». فرآیند جدید از{' '}
            <Link to="/process-design" className="font-bold underline">طراحی فرآیند</Link>.
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-center py-8">در حال بارگذاری...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map(wf => (
              <div key={wf.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                    <Settings className="w-6 h-6" />
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${wf.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {wf.isActive ? 'فعال' : 'پیش‌نویس'}
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-1">{wf.title}</h3>
                <p className="text-sm text-gray-500 mb-1">نسخه {wf.version || 1}</p>
                <p className="text-xs text-gray-400 mb-4">{wf.steps.length} مرحله</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedWorkflow(wf)}
                    className="flex-1 py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition text-sm"
                  >
                    ویرایش
                  </button>
                  {!wf.isActive && (
                    <button
                      onClick={() => handleActivate(wf)}
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                    >
                      فعال‌سازی
                    </button>
                  )}
                </div>
              </div>
            ))}
            {selectedProcessSlug && !workflows.length && (
              <div className="col-span-full text-center text-gray-500 py-12 border border-dashed rounded-xl">
                هنوز گردش کاری برای «{selectedProcess?.title}» نیست. «گردش کار جدید» را بزنید.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-full pb-20 flex flex-col gap-4">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <button type="button" onClick={() => setSelectedWorkflow(null)} className="text-gray-500 hover:text-gray-800">
            بازگشت
          </button>
          <div className="h-8 w-px bg-gray-300 hidden sm:block" />
          <div>
            <label className="text-xs text-gray-500 block">فرآیند</label>
            <span className="font-bold text-sm">{selectedProcess?.title || selectedWorkflow.module}</span>
          </div>
          <div>
            <label className="text-xs text-gray-500 block">نام گردش کار</label>
            <input
              value={selectedWorkflow.title}
              onChange={e => setSelectedWorkflow({ ...selectedWorkflow, title: e.target.value })}
              className="font-bold bg-transparent outline-none border-b border-dashed border-gray-300 focus:border-primary min-w-[200px]"
              placeholder="مثال: گردش کار تعمیرات برق و مکانیک"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={selectedWorkflow.isActive}
              onChange={e => setSelectedWorkflow({ ...selectedWorkflow, isActive: e.target.checked })}
              className="w-4 h-4 text-primary rounded"
            />
            فعال پس از ذخیره
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 shadow disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {saving ? 'ذخیره...' : 'ذخیره'}
          </button>
        </div>
      </div>

      <WorkflowFlowCanvas
        workflow={selectedWorkflow}
        statusOptions={statusOptions}
        workTypes={workTypes}
        personnel={personnel}
        conditionFieldOptions={conditionFieldOptions}
        onChange={setSelectedWorkflow}
      />
    </div>
  );
};

export default WorkflowDesigner;
