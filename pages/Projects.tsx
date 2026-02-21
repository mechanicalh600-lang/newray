
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Briefcase, Plus, Trash2, RefreshCw, FileSpreadsheet, CheckSquare, X, Save, Loader2, GanttChart, ChevronRight, ChevronDown, Pencil } from 'lucide-react';
import { SmartTable } from '../components/SmartTable';
import { supabase } from '../supabaseClient';
import { ConfirmModal } from '../components/ConfirmModal';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { fetchMasterData, fetchNextTrackingCode } from '../workflowStore';
import * as XLSX from 'xlsx';

interface Props { user: User; }

const generateId = () => Math.random().toString(36).slice(2, 11);

/** آیتم WBS */
export interface WBSItem {
  id: string;
  code: string;
  title: string;
  parentId: string | null;
  order: number;
  percent?: number;
}

function buildWbsTree(items: WBSItem[]): (WBSItem & { children: (WBSItem & { children: WBSItem[] })[]; rowNo?: number })[] {
  const byId = new Map(items.map(i => [i.id, { ...i, children: [] as any[] }]));
  const roots: any[] = [];
  for (const item of items) {
    const node = byId.get(item.id)!;
    if (!item.parentId) {
      roots.push(node);
    } else {
      const parent = byId.get(item.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }
  roots.sort((a, b) => a.order - b.order);
  for (const r of roots) r.children.sort((a: any, b: any) => a.order - b.order);
  let rowNo = 1;
  const assignRowNo = (nodes: any[]) => {
    for (const n of nodes) {
      n.rowNo = rowNo++;
      if (n.children?.length) assignRowNo(n.children);
    }
  };
  assignRowNo(roots);
  return roots;
}

function computeWbsCode(items: WBSItem[], item: WBSItem): string {
  const siblings = items.filter(i => i.parentId === item.parentId).sort((a, b) => a.order - b.order);
  const idx = siblings.findIndex(i => i.id === item.id) + 1;
  if (!item.parentId) return String(idx);
  const parent = items.find(i => i.id === item.parentId);
  if (!parent) return String(idx);
  const parentCode = computeWbsCode(items, parent);
  return `${parentCode}.${idx}`;
}

function flattenWbsTree(nodes: any[], parentId: string | null, order: number): WBSItem[] {
  let result: WBSItem[] = [];
  let ord = 0;
  for (const node of nodes) {
    const { children, ...rest } = node;
    result.push({ ...rest, parentId, order: ord });
    if (children?.length) result = result.concat(flattenWbsTree(children, node.id, 0));
    ord++;
  }
  return result;
}

function WbsNode({ node, rowNo, siblings, onAddChild, onDelete, onPercentChange, level }: { node: any; rowNo: number; siblings: any[]; onAddChild: (id: string) => void; onDelete: (id: string) => void; onPercentChange?: (id: string, v: number | undefined) => void; level: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children?.length > 0;
  const pct = node.percent != null && node.percent !== '' ? Math.min(100, Math.max(1, Number(node.percent))) : undefined;
  const displayVal = pct != null ? pct : '';
  const handleChange = (val: string) => {
    if (val === '' || val === undefined) onPercentChange?.(node.id, undefined);
    else { const n = Number(val); if (!isNaN(n)) onPercentChange?.(node.id, Math.min(100, Math.max(1, n))); }
  };
  return (
    <div className="rounded" style={{ marginRight: level * 16 }}>
      <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded group">
        <span className="text-xs font-bold text-gray-500 w-5 text-center">{rowNo}</span>
        <button type="button" onClick={() => setExpanded(!expanded)} className="p-0.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          {hasChildren ? (expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : <span className="w-4 h-4 inline-block" />}
        </button>
        <span className="text-sm flex-1 truncate">{node.title}</span>
        <div className="flex items-center gap-1 min-w-[4rem]">
          <input
            type="number"
            min={1}
            max={100}
            value={displayVal}
            onChange={e => handleChange(e.target.value)}
            placeholder="—"
            className="w-14 px-1.5 py-0.5 text-xs text-center border rounded dark:bg-gray-700 focus:ring-1 focus:ring-primary" dir="ltr"
          />
          <span className="text-xs text-gray-500">%</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition">
          <button type="button" onClick={() => onAddChild(node.id)} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded" title="افزودن زیرفعالیت"><Plus className="w-4 h-4" /></button>
          <button type="button" onClick={() => onDelete(node.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="حذف"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      {expanded && hasChildren && (
        <div className="mr-2 border-r-2 border-gray-200 dark:border-gray-600">
          {node.children.map((ch: any) => (
            <WbsNode key={ch.id} node={ch} rowNo={ch.rowNo ?? 0} siblings={node.children} onAddChild={onAddChild} onDelete={onDelete} onPercentChange={onPercentChange} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export const Projects: React.FC<Props> = ({ user }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LIST' | 'NEW'>('LIST');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [personnelList, setPersonnelList] = useState<any[]>([]);

  const [formData, setFormData] = useState({ title: '', managerId: '', startDate: '', endDate: '', budget: '', description: '' });
  const [objectives, setObjectives] = useState<{ id: string; text: string }[]>([]);
  const [wbsItems, setWbsItems] = useState<WBSItem[]>([]);
  const [newObjective, setNewObjective] = useState('');
  const [newWbsTitle, setNewWbsTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchMasterData('personnel').then(setPersonnelList);
  }, []);

  useEffect(() => {
    let res = projects;
    if (filterStatus !== 'ALL') {
      res = res.filter(p => p.status === filterStatus);
    }
    setFilteredProjects(res);
  }, [projects, filterStatus]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProjects(data);
    setLoading(false);
  };

  const confirmDelete = async () => {
    await supabase.from('projects').delete().in('id', selectedIds);
    setProjects(prev => prev.filter(p => !selectedIds.includes(p.id)));
    setSelectedIds([]);
    setIsDeleteModalOpen(false);
  };

  const handleManagerChange = (e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, managerId: e.target.value });
  const handleAddObjective = () => { if (!newObjective.trim()) return; setObjectives(prev => [...prev, { id: generateId(), text: newObjective.trim() }]); setNewObjective(''); };
  const handleDeleteObjective = (id: string) => setObjectives(prev => prev.filter(o => o.id !== id));

  const addWbsRoot = () => {
    if (!newWbsTitle.trim()) return;
    const id = generateId();
    const order = wbsItems.filter(i => !i.parentId).length;
    const rootsCount = order + 1;
    setWbsItems(prev => {
      let next = [...prev, { id, code: '', title: newWbsTitle.trim(), parentId: null as string | null, order, percent: rootsCount === 1 ? undefined : 1 }];
      return next.map(i => ({ ...i, code: computeWbsCode(next, i) }));
    });
    setNewWbsTitle('');
  };
  const addWbsChild = (parentId: string) => {
    const title = prompt('عنوان زیرکار را وارد کنید:');
    if (!title?.trim()) return;
    const siblings = wbsItems.filter(i => i.parentId === parentId);
    const order = siblings.length;
    const childCount = order + 1;
    setWbsItems(prev => {
      let next = [...prev, { id: generateId(), code: '', title: title.trim(), parentId, order, percent: childCount === 1 ? undefined : 1 }];
      return next.map(i => ({ ...i, code: computeWbsCode(next, i) }));
    });
  };
  const deleteWbsItem = (id: string) => {
    const toRemove = new Set<string>();
    const collect = (cid: string) => { toRemove.add(cid); wbsItems.filter(i => i.parentId === cid).forEach(i => collect(i.id)); };
    collect(id);
    setWbsItems(prev => {
      const remaining = prev.filter(i => !toRemove.has(i.id));
      return remaining.map(i => ({ ...i, code: computeWbsCode(remaining, i) }));
    });
  };
  const handleCancel = () => { setView('LIST'); setEditingId(null); setFormData({ title: '', managerId: '', startDate: '', endDate: '', budget: '', description: '' }); setObjectives([]); setWbsItems([]); };
  const isFormValid = () => !!formData.title?.trim() && !!formData.managerId && objectives.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const manager = personnelList.find(p => p.id === formData.managerId);
      const code = editingId ? (projects.find(p => p.id === editingId)?.tracking_code || '') : await fetchNextTrackingCode('PROJ');
      const budgetNum = formData.budget ? Number(formData.budget.replace(/,/g, '')) : null;
      const existing = editingId ? projects.find(p => p.id === editingId) : null;
      const payload: any = { title: formData.title.trim(), manager_id: formData.managerId, manager_name: manager?.full_name || '', start_date: formData.startDate || null, end_date: formData.endDate || null, budget: budgetNum, description: formData.description?.trim() || null, objectives: objectives.map(o => ({ id: o.id, text: o.text })), wbs: wbsItems.map(i => ({ id: i.id, code: i.code, title: i.title, parentId: i.parentId, order: i.order, percent: i.percent != null && i.percent !== '' ? i.percent : undefined })), status: existing?.status || 'PLANNED', progress: existing?.progress ?? 0 };
      if (editingId) {
        await supabase.from('projects').update(payload).eq('id', editingId);
        alert('پروژه با موفقیت ویرایش شد.');
      } else {
        await supabase.from('projects').insert([{ ...payload, tracking_code: code }]);
        alert('پروژه با موفقیت ایجاد شد.');
      }
      handleCancel();
      fetchProjects();
    } catch (err: any) { alert('خطا: ' + (err?.message || 'خطا در ذخیره')); }
    finally { setIsSubmitting(false); }
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredProjects.filter(p => selectedIds.includes(p.id))
      : filteredProjects;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(wb, `projects_${Date.now()}.xlsx`);
  };

  const setWbsPercent = (id: string, v: number | undefined) => setWbsItems(prev => prev.map(i => i.id === id ? { ...i, percent: v } : i));

  const openForEdit = (p: any) => {
    setEditingId(p.id);
    setFormData({ title: p.title || '', managerId: p.manager_id || '', startDate: p.start_date || '', endDate: p.end_date || '', budget: p.budget ? String(p.budget).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '', description: p.description || '' });
    setObjectives(Array.isArray(p.objectives) ? p.objectives.map((o: any) => ({ id: o.id || generateId(), text: o.text || '' })) : []);
    setWbsItems(Array.isArray(p.wbs) ? p.wbs.map((w: any) => ({ id: w.id || generateId(), code: w.code || '', title: w.title || '', parentId: w.parentId ?? null, order: w.order ?? 0, percent: w.percent != null && w.percent !== '' ? w.percent : undefined })) : []);
    setView('NEW');
  };

  const extraActions = (
    <>
      {selectedIds.length === 1 && (
        <button onClick={() => { const p = filteredProjects.find(x => x.id === selectedIds[0]); if (p) openForEdit(p); }} className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition" title="ویرایش">
          <Pencil className="w-5 h-5" />
        </button>
      )}
      {selectedIds.length > 0 && (
        <button onClick={() => setIsDeleteModalOpen(true)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition" title="حذف">
          <Trash2 className="w-5 h-5" />
        </button>
      )}
      <button onClick={() => { setEditingId(null); setFormData({ title: '', managerId: '', startDate: '', endDate: '', budget: '', description: '' }); setObjectives([]); setWbsItems([]); setView('NEW'); }} className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-100 transition" title="پروژه جدید">
        <Plus className="w-5 h-5" />
      </button>
      <button onClick={handleExport} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition" title="خروجی اکسل">
        <FileSpreadsheet className="w-5 h-5" />
      </button>
      <button onClick={fetchProjects} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition" title="بروزرسانی">
        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </>
  );

  const filterContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">وضعیت پروژه</label>
        <select className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="ALL">همه</option>
          <option value="PLANNED">برنامه‌ریزی شده</option>
          <option value="IN_PROGRESS">در حال اجرا</option>
          <option value="COMPLETED">تکمیل شده</option>
          <option value="HALTED">متوقف شده</option>
        </select>
      </div>
    </div>
  );

  if (view === 'NEW') {
    return (
      <div className="w-full max-w-full pb-20 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Briefcase className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">{editingId ? 'ویرایش پروژه' : 'تعریف پروژه جدید'}</h1>
        </div>
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm space-y-6 border border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">عنوان پروژه <span className="text-red-500">*</span></label>
              <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" placeholder="نام پروژه..." />
            </div>
            <div>
              <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">مدیر پروژه <span className="text-red-500">*</span></label>
              <select value={formData.managerId} onChange={handleManagerChange} required className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary">
                <option value="">انتخاب کنید...</option>
                {personnelList.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.unit || '-'})</option>)}
              </select>
            </div>
            <div><ShamsiDatePicker label="تاریخ شروع" value={formData.startDate || ''} onChange={d => setFormData({...formData, startDate: d})} disableFuture={false} /></div>
            <div><ShamsiDatePicker label="تاریخ پایان (تخمین)" value={formData.endDate || ''} onChange={d => setFormData({...formData, endDate: d})} disableFuture={false} /></div>
            <div>
              <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">بودجه مصوب (ریال)</label>
              <input type="text" inputMode="numeric" dir="ltr" value={formData.budget} onChange={e => { const val = e.target.value.replace(/,/g, ''); if (!/^\d*$/.test(val)) return; setFormData({...formData, budget: val.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}); }} className="w-full p-2.5 border rounded-xl dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary text-left" placeholder="اختیاری..." />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">توضیحات تکمیلی</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 border rounded-xl dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary min-h-[100px]" placeholder="توضیحات پروژه..." />
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><CheckSquare className="w-5 h-5"/> اهداف و محدوده پروژه <span className="text-red-500">*</span></h3>
            <div className="flex gap-2 mb-3">
              <input type="text" value={newObjective} onChange={e => setNewObjective(e.target.value)} placeholder="هدف یا محدوده پروژه را وارد کنید..." className="flex-1 p-2.5 border rounded-lg dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddObjective())} />
              <button type="button" onClick={handleAddObjective} disabled={!newObjective.trim()} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"><Plus className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {objectives.map((obj, index) => (
                <div key={obj.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">{index + 1}</span>
                    <span className="text-sm">{obj.text}</span>
                  </div>
                  <button type="button" onClick={() => handleDeleteObjective(obj.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded"><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
          </div>

          {/* ساختار شکست کار (WBS) */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><GanttChart className="w-5 h-5 text-primary"/> ساختار شکست کار (WBS)</h3>
            <p className="text-xs text-gray-500 mb-3">فعالیت‌ها و خروجی‌های پروژه را به صورت سلسله‌مراتبی تعریف کنید.</p>
            <div className="flex gap-2 mb-3">
              <input type="text" value={newWbsTitle} onChange={e => setNewWbsTitle(e.target.value)} placeholder="عنوان فعالیت/خروجی (سطح اول)..." className="flex-1 p-2.5 border rounded-lg dark:bg-gray-700 outline-none focus:ring-2 focus:ring-primary" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addWbsRoot())} />
              <button type="button" onClick={addWbsRoot} disabled={!newWbsTitle.trim()} className="bg-primary text-white px-4 rounded-lg hover:bg-red-800 transition disabled:opacity-50 disabled:cursor-not-allowed" title="افزودن"><Plus className="w-5 h-5" /></button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 p-2 bg-white dark:bg-gray-800">
              {wbsItems.length > 0 && (
                <div className="flex items-center gap-2 py-1.5 px-2 text-xs font-bold text-gray-500 border-b border-gray-200 dark:border-gray-600 mb-1">
                  <span className="w-5 text-center">ردیف</span>
                  <span className="w-6" />
                  <span className="flex-1">عنوان</span>
                  <span className="min-w-[4rem] text-center">درصد</span>
                  <span className="w-16" />
                </div>
              )}
              {buildWbsTree(wbsItems).map((node) => (
                <WbsNode key={node.id} node={node} rowNo={node.rowNo ?? 0} siblings={buildWbsTree(wbsItems)} onAddChild={addWbsChild} onDelete={deleteWbsItem} onPercentChange={setWbsPercent} level={0} />
              ))}
              {wbsItems.length === 0 && <p className="text-gray-400 text-sm py-4 text-center">هنوز فعالیتی اضافه نشده. یک فعالیت سطح اول اضافه کنید.</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
            <button type="button" onClick={handleCancel} className="flex-1 border border-gray-300 dark:border-gray-600 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2 transition"><X className="w-5 h-5" /> انصراف</button>
            <button type="submit" disabled={!isFormValid() || isSubmitting} className={`flex-[2] text-white py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition font-bold ${isFormValid() && !isSubmitting ? 'bg-primary hover:bg-red-800' : 'bg-gray-400 cursor-not-allowed opacity-70'}`}>
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5" />}
              {editingId ? 'ویرایش پروژه' : 'ایجاد پروژه و شروع گردش کار'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full pb-20 space-y-6">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="حذف پروژه"
        message={`آیا از حذف ${selectedIds.length} پروژه انتخاب شده اطمینان دارید؟`}
      />
      <SmartTable
        title="مدیریت پروژه‌ها"
        icon={Briefcase}
        data={filteredProjects}
        isLoading={loading}
        extraActions={extraActions}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
        filterContent={filterContent}
        columns={[
          { header: 'کد پروژه', accessor: (p: any) => <span className="font-mono font-bold">{p.tracking_code}</span>, sortKey: 'tracking_code' },
          { header: 'عنوان پروژه', accessor: (p: any) => p.title, sortKey: 'title' },
          { header: 'مدیر پروژه', accessor: (p: any) => p.manager_name, sortKey: 'manager_name' },
          { header: 'شروع', accessor: (p: any) => p.start_date, sortKey: 'start_date' },
          { header: 'پایان', accessor: (p: any) => p.end_date, sortKey: 'end_date' },
          { header: 'پیشرفت', accessor: (p: any) => `${p.progress}%`, sortKey: 'progress' },
          { header: 'WBS', accessor: (p: any) => (Array.isArray(p.wbs) && p.wbs.length) ? <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{p.wbs.length}</span> : '-', sortKey: undefined },
          { header: 'وضعیت', accessor: (p: any) => p.status, sortKey: 'status' },
        ]}
      />
    </div>
  );
};

export default Projects;
