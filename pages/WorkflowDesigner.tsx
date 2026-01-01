
import React, { useState, useEffect } from 'react';
import { WorkflowDefinition, WorkflowStep, WorkflowAction, UserRole } from '../types';
import { getWorkflows, saveWorkflowDefinition } from '../workflowStore';
import { Plus, Trash2, Save, ArrowRight, GitMerge, Settings, Play } from 'lucide-react';
import { generateId } from '../utils';

export const WorkflowDesigner: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);

  useEffect(() => {
    setWorkflows(getWorkflows());
  }, []);

  const handleCreateWorkflow = () => {
    const newWorkflow: WorkflowDefinition = {
      id: generateId(),
      title: 'فرآیند جدید',
      module: 'WORK_ORDER',
      isActive: false,
      steps: []
    };
    setSelectedWorkflow(newWorkflow);
  };

  const handleSave = () => {
    if (selectedWorkflow) {
      saveWorkflowDefinition(selectedWorkflow);
      setWorkflows(getWorkflows());
      alert('فرآیند با موفقیت ذخیره شد.');
    }
  };

  const addStep = () => {
    if (!selectedWorkflow) return;
    const newStep: WorkflowStep = {
      id: generateId(),
      title: 'مرحله جدید',
      assigneeRole: UserRole.ADMIN,
      actions: []
    };
    setSelectedWorkflow({
      ...selectedWorkflow,
      steps: [...selectedWorkflow.steps, newStep]
    });
  };

  const addAction = (stepId: string) => {
    if (!selectedWorkflow) return;
    const newAction: WorkflowAction = {
      id: generateId(),
      label: 'تایید و ادامه',
      nextStepId: 'FINISH',
      style: 'primary'
    };
    
    setSelectedWorkflow({
      ...selectedWorkflow,
      steps: selectedWorkflow.steps.map(s => {
        if (s.id !== stepId) return s;
        return { ...s, actions: [...s.actions, newAction] };
      })
    });
  };

  if (!selectedWorkflow) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitMerge className="text-primary" /> طراحی فرآیندهای کاری
          </h1>
          <button onClick={handleCreateWorkflow} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Plus className="w-4 h-4" /> فرآیند جدید
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map(wf => (
            <div key={wf.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                  <Settings className="w-6 h-6" />
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${wf.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {wf.isActive ? 'فعال' : 'پیش‌نویس'}
                </span>
              </div>
              <h3 className="font-bold text-lg mb-1">{wf.title}</h3>
              <p className="text-sm text-gray-500 mb-4">ماژول: {wf.module}</p>
              <p className="text-xs text-gray-400 mb-4">{wf.steps.length} مرحله تعریف شده</p>
              <button 
                onClick={() => setSelectedWorkflow(wf)}
                className="w-full py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition"
              >
                ویرایش فرآیند
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedWorkflow(null)} className="text-gray-500 hover:text-gray-800">بازگشت</button>
          <div className="h-8 w-px bg-gray-300"></div>
          <div>
            <label className="text-xs text-gray-500 block">نام فرآیند</label>
            <input 
              value={selectedWorkflow.title}
              onChange={e => setSelectedWorkflow({...selectedWorkflow, title: e.target.value})}
              className="font-bold bg-transparent outline-none border-b border-dashed border-gray-300 focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block">ماژول هدف</label>
            <select 
              value={selectedWorkflow.module}
              onChange={e => setSelectedWorkflow({...selectedWorkflow, module: e.target.value})}
              className="bg-gray-50 dark:bg-gray-700 rounded p-1 text-sm outline-none"
            >
              <option value="WORK_ORDER">دستور کار (Work Order)</option>
              <option value="PROJECT">پروژه‌ها (Project)</option>
              <option value="PART_REQUEST">درخواست قطعه</option>
              <option value="PURCHASE">درخواست خرید</option>
              <option value="PERFORMANCE">امتیاز عملکرد</option>
              <option value="MEETING">صورتجلسات</option>
              <option value="SUGGESTION">پیشنهادات</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input 
              type="checkbox" 
              checked={selectedWorkflow.isActive}
              onChange={e => setSelectedWorkflow({...selectedWorkflow, isActive: e.target.checked})}
              className="w-4 h-4 text-primary rounded"
            />
            فعال سازی
          </label>
          <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 shadow">
            <Save className="w-4 h-4" /> ذخیره تغییرات
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto bg-gray-100 dark:bg-gray-900 rounded-xl p-6 border border-dashed border-gray-300 relative">
        <div className="flex gap-8 min-w-max">
          {/* Start Node */}
          <div className="w-16 flex flex-col items-center justify-center pt-20 opacity-50">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg mb-2">
              <Play className="w-6 h-6 ml-1" />
            </div>
            <span className="text-xs font-bold">شروع</span>
          </div>

          <ArrowRight className="w-8 h-8 text-gray-300 self-center mt-8" />

          {/* Steps */}
          {selectedWorkflow.steps.map((step, index) => (
            <div key={step.id} className="flex gap-4 items-center">
              <div className="w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-t-4 border-primary flex flex-col">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-start">
                  <div>
                    <input 
                      value={step.title}
                      onChange={(e) => {
                        const newSteps = [...selectedWorkflow.steps];
                        newSteps[index].title = e.target.value;
                        setSelectedWorkflow({...selectedWorkflow, steps: newSteps});
                      }}
                      className="font-bold text-gray-800 dark:text-white bg-transparent outline-none w-full"
                      placeholder="عنوان مرحله"
                    />
                    <div className="mt-2">
                       <label className="text-xs text-gray-500">مسئول انجام:</label>
                       <select 
                        value={step.assigneeRole}
                        onChange={(e) => {
                          const newSteps = [...selectedWorkflow.steps];
                          newSteps[index].assigneeRole = e.target.value as any;
                          setSelectedWorkflow({...selectedWorkflow, steps: newSteps});
                        }}
                        className="block w-full mt-1 text-sm bg-gray-50 dark:bg-gray-700 p-1 rounded"
                       >
                         {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                         <option value="INITIATOR">ثبت کننده (Initiator)</option>
                       </select>
                    </div>
                  </div>
                  <button onClick={() => {
                     const newSteps = selectedWorkflow.steps.filter(s => s.id !== step.id);
                     setSelectedWorkflow({...selectedWorkflow, steps: newSteps});
                  }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 flex-1 space-y-2">
                  <p className="text-xs font-bold text-gray-500 mb-2">اقدامات (Actions):</p>
                  {step.actions.map((action, aIndex) => (
                    <div key={action.id} className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 text-sm space-y-2">
                      <div className="flex gap-2">
                        <input 
                          value={action.label}
                          onChange={(e) => {
                             const newSteps = [...selectedWorkflow.steps];
                             newSteps[index].actions[aIndex].label = e.target.value;
                             setSelectedWorkflow({...selectedWorkflow, steps: newSteps});
                          }}
                          className="flex-1 bg-transparent border-b border-dashed outline-none"
                          placeholder="نام دکمه"
                        />
                        <select 
                           value={action.style}
                           onChange={(e) => {
                             const newSteps = [...selectedWorkflow.steps];
                             newSteps[index].actions[aIndex].style = e.target.value as any;
                             setSelectedWorkflow({...selectedWorkflow, steps: newSteps});
                          }}
                           className="text-xs bg-gray-100 rounded"
                        >
                          <option value="primary">آبی</option>
                          <option value="success">سبز</option>
                          <option value="danger">قرمز</option>
                          <option value="neutral">طوسی</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <ArrowRight className="w-3 h-3" />
                        <span>برو به:</span>
                        <select 
                           value={action.nextStepId}
                           onChange={(e) => {
                             const newSteps = [...selectedWorkflow.steps];
                             newSteps[index].actions[aIndex].nextStepId = e.target.value;
                             setSelectedWorkflow({...selectedWorkflow, steps: newSteps});
                          }}
                           className="bg-transparent font-medium text-gray-800 dark:text-gray-200 outline-none"
                        >
                          <option value="FINISH">پایان فرآیند</option>
                          {selectedWorkflow.steps.map(s => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addAction(step.id)} className="w-full py-1 text-xs text-primary border border-dashed border-primary/30 rounded hover:bg-primary/5">+ افزودن اقدام</button>
                </div>
              </div>
              <ArrowRight className="w-8 h-8 text-gray-300" />
            </div>
          ))}

          {/* Add Step Button */}
          <button onClick={addStep} className="h-80 w-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition bg-white/50">
            <Plus className="w-8 h-8 mb-2" />
            <span>مرحله جدید</span>
          </button>
        </div>
      </div>
    </div>
  );
};
