import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FilePlus2, Loader2, Save, X } from 'lucide-react';
import { DataPage } from './DataPage';
import DynamicFormRenderer from './DynamicFormRenderer';
import { User } from '../types';
import { ProcessFormDefinition } from '../services/processFormDefinitions';
import {
  dbRowToFormValues,
  deleteEntityRecords,
  fetchEntityRecords,
  getListColumns,
  saveEntityFormRecord,
} from '../services/entityFormRuntime';
import { fetchMasterData } from '../workflowStore';
import { getShamsiDate } from '../utils';
import { formatDbError } from '../utils/formatDbError';
import { ReportFieldSchema, ReportTabSchema } from '../services/reportDefinitions';

interface Props {
  def: ProcessFormDefinition;
  user: User;
}

export const ProcessEntityFormPage: React.FC<Props> = ({ def, user }) => {
  const [mode, setMode] = useState<'LIST' | 'FORM'>('LIST');
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValue, setFormValue] = useState<Record<string, unknown>>({});
  const [personnel, setPersonnel] = useState<unknown[]>([]);
  const [saving, setSaving] = useState(false);

  const fields = (def.form_schema?.fields || []) as ReportFieldSchema[];
  const tabs = (def.form_schema?.tabs?.length
    ? def.form_schema.tabs
    : [{ id: 'tab-main', label: 'عمومی', color: 'gray', icon: 'clipboard' as const }]) as ReportTabSchema[];
  const groups = def.form_schema?.groups || [];

  const columns = useMemo(() => getListColumns(def, fields), [def, fields]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchEntityRecords(def.entity_table);
      setRecords(rows);
    } catch (e) {
      console.error(e);
      alert(formatDbError(e));
    } finally {
      setLoading(false);
    }
  }, [def.entity_table]);

  useEffect(() => {
    loadRecords();
    fetchMasterData('personnel').then(setPersonnel);
  }, [loadRecords]);

  const openNew = () => {
    setEditingId(null);
    const initial: Record<string, unknown> = {};
    fields.forEach(field => {
      if (field.defaultValue !== undefined && field.defaultValue !== '') {
        initial[field.key] = field.defaultValue;
      }
    });
    if (!initial.request_date && fields.some(x => x.key === 'request_date')) {
      initial.request_date = getShamsiDate();
    }
    if (!initial.request_date && fields.some(x => x.key === 'exit_date')) {
      initial.exit_date = getShamsiDate();
    }
    if (!initial.mission_date && fields.some(x => x.key === 'mission_date')) {
      initial.mission_date = getShamsiDate();
      initial.start_date = getShamsiDate();
      initial.end_date = getShamsiDate();
    }
    setFormValue(initial);
    setMode('FORM');
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditingId(String(row.id));
    setFormValue(dbRowToFormValues(row, fields));
    setMode('FORM');
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveEntityFormRecord(def, user, formValue, editingId);
      alert(editingId ? 'بروزرسانی شد.' : 'ثبت شد.');
      setMode('LIST');
      setEditingId(null);
      setFormValue({});
      await loadRecords();
    } catch (e) {
      if ((e as Error)?.message !== 'validation_failed') {
        alert(formatDbError(e));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!ids.length) return;
    if (!window.confirm('حذف رکورد(ها)؟')) return;
    try {
      await deleteEntityRecords(def.entity_table, ids);
      setSelectedIds([]);
      await loadRecords();
    } catch (e) {
      alert(formatDbError(e));
    }
  };

  const tableColumns = [
    ...columns.map(c => ({
      header: c.label,
      sortKey: c.key,
      accessor: (row: Record<string, unknown>) => {
        const val = row[c.key];
        if (val == null || val === '') return '—';
        if (typeof val === 'object') return JSON.stringify(val).slice(0, 40);
        return String(val);
      },
    })),
    {
      header: 'تاریخ ثبت',
      sortKey: 'created_at',
      accessor: (row: Record<string, unknown>) => String(row.created_at || '').slice(0, 10) || '—',
    },
  ];

  if (mode === 'FORM') {
    return (
      <div className="p-4 max-w-5xl mx-auto pb-24">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{editingId ? 'ویرایش' : 'ثبت جدید'} — {def.title}</h1>
          <button
            type="button"
            onClick={() => { setMode('LIST'); setEditingId(null); }}
            className="p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <DynamicFormRenderer
            fields={fields}
            tabs={tabs}
            groups={groups}
            value={formValue}
            onChange={setFormValue}
            personnel={personnel as never[]}
          />
        </div>
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-gray-900/90 border-t flex justify-end gap-2 z-40">
          <button type="button" onClick={() => setMode('LIST')} className="px-4 py-2 border rounded-lg">انصراف</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary text-white rounded-lg flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ذخیره
          </button>
        </div>
      </div>
    );
  }

  return (
    <DataPage
      title={def.title}
      icon={FilePlus2}
      data={records as { id: string }[]}
      isLoading={loading}
      columns={tableColumns}
      selectedIds={selectedIds}
      onSelect={setSelectedIds}
      onAdd={openNew}
      onEdit={() => {
        const row = records.find(r => String(r.id) === selectedIds[0]);
        if (row) openEdit(row);
      }}
      onViewDetails={(row) => openEdit(row as Record<string, unknown>)}
      onDelete={handleDelete}
      onReload={loadRecords}
      exportName={def.slug}
    />
  );
};

export default ProcessEntityFormPage;
