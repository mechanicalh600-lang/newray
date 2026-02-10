import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Printer } from 'lucide-react';
import { getActiveReportTemplateByModule, ReportElement } from '../services/reportTemplates';
import { supabase } from '../supabaseClient';

const MODULE_TABLE_MAP: Record<string, string | null> = {
  shiftreport: 'shift_reports',
  'scale-report': 'scale_reports',
  'lab-report': 'lab_reports',
  'warehouse-report': 'warehouse_reports',
  'hse-report': 'hse_reports',
  productionreport: null,
  'control-room': null,
};

const getValue = (obj: any, path: string) =>
  String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((acc: any, key: string) => (acc === null || acc === undefined ? undefined : acc[key]), obj);

const toDisplay = (value: any): string => {
  if (value === null || value === undefined || value === '') return '---';
  if (typeof value === 'number') return value.toLocaleString('fa-IR');
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  return String(value);
};

const resolveTemplateText = (text: string, context: Record<string, any>) =>
  String(text || '').replace(/\{\{([^}]+)\}\}/g, (_, raw) => {
    const key = String(raw || '').trim();
    if (!key) return '';
    return toDisplay(getValue(context, key) ?? context[key]);
  });

const textStyleToProps = (style?: any): React.CSSProperties => ({
  fontFamily: style?.fontFamily || 'Vazirmatn',
  fontSize: style?.fontSize,
  fontWeight: style?.bold ? 'bold' : 'normal',
  fontStyle: style?.italic ? 'italic' : 'normal',
  textDecoration: style?.underline ? 'underline' : 'none',
  color: style?.color,
  textAlign: style?.align,
});

const TemplateElement: React.FC<{ el: ReportElement; record: any; orgLogo: string | null }> = ({ el, record, orgLogo }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: el.layout.x,
    top: el.layout.y,
    width: el.layout.width,
    height: el.layout.height,
    overflow: 'hidden',
    backgroundColor: el.props.backgroundColor || 'transparent',
    border: el.props.borderWidth > 0 ? `${el.props.borderWidth}px solid ${el.props.borderColor || '#d1d5db'}` : undefined,
    borderRadius: 8,
  };

  const context = { ...record, row: record, rows: [record] };

  if (el.type === 'HEADER') {
    const details = el.props.detailsProps?.items || [];
    return (
      <div style={style} className="p-3 flex items-center justify-between">
        <div className="w-16 h-16 flex items-center justify-center text-xs bg-gray-100 rounded">
          {orgLogo ? <img src={orgLogo} alt="logo" className="w-full h-full object-contain" /> : 'LOGO'}
        </div>
        <div className="text-center flex-1 px-4">
          <h1 style={textStyleToProps(el.props.titleProps)}>{resolveTemplateText(el.props.titleProps?.text || '', context)}</h1>
          <h2 style={textStyleToProps(el.props.subtitleProps)}>{resolveTemplateText(el.props.subtitleProps?.text || '', context)}</h2>
        </div>
        <div className="w-44 text-xs space-y-1">
          {details.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between border-b border-dashed border-gray-300 pb-1">
              <span style={textStyleToProps(el.props.detailsProps?.labelStyle)}>{item.label}</span>
              <span style={textStyleToProps(el.props.detailsProps?.valueStyle)}>
                {resolveTemplateText(`{{${item.value}}}`, context)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (el.type === 'TEXT') {
    return (
      <div style={style} className="p-2">
        <div style={textStyleToProps(el.props.textProps)}>
          {resolveTemplateText(el.props.textProps?.text || '', context)}
        </div>
      </div>
    );
  }

  if (el.type === 'STAT_CARD') {
    const val = el.props.valueField ? getValue(record, el.props.valueField) : el.props.valueProps?.text;
    return (
      <div style={style} className="p-3 text-center">
        <div style={textStyleToProps(el.props.labelProps)}>{el.props.labelProps?.text}</div>
        <div style={textStyleToProps(el.props.valueProps)}>{toDisplay(val)}</div>
        {el.props.unitProps?.text ? <div style={textStyleToProps(el.props.unitProps)}>{el.props.unitProps.text}</div> : null}
      </div>
    );
  }

  if (el.type === 'TABLE') {
    const columns = (el.props.columns && el.props.columns.length > 0)
      ? el.props.columns
      : Object.keys(record || {}).slice(0, 6).map((k, idx) => ({ id: `${k}-${idx}`, header: k, key: k, align: 'right' }));
    const rows = [record];
    return (
      <div style={style} className="p-2 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {columns.map((c: any) => (
                <th key={c.id} className="border p-2" style={{ textAlign: c.align || 'right' }}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                {columns.map((c: any) => (
                  <td key={`${c.id}-${idx}`} className="border p-2" style={{ textAlign: c.align || 'right' }}>
                    {toDisplay(getValue(row, c.key))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={style} className="flex items-center justify-center text-gray-400 text-xs border border-dashed rounded">
      {el.type}
    </div>
  );
};

export const ReportTemplatePreview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as { moduleId?: string; record?: any };
  const moduleId = state.moduleId || '';
  const inputRecord = state.record || null;

  const [record, setRecord] = useState<any>(inputRecord);
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const template = useMemo(() => (moduleId ? getActiveReportTemplateByModule(moduleId) : null), [moduleId]);

  useEffect(() => {
    const loadRecord = async () => {
      if (!moduleId || !inputRecord) return;
      setLoading(true);
      try {
        const table = MODULE_TABLE_MAP[moduleId];
        let fetched: any = null;
        if (table && inputRecord?.id) {
          const { data } = await supabase.from(table).select('*').eq('id', inputRecord.id).maybeSingle();
          fetched = data || null;
        }
        const merged = {
          ...(inputRecord || {}),
          ...(fetched || {}),
          ...((inputRecord && inputRecord.full_data) || {}),
          ...((fetched && fetched.full_data) || {}),
        };
        setRecord(merged);
      } finally {
        setLoading(false);
      }
    };
    loadRecord();
  }, [moduleId, inputRecord]);

  useEffect(() => {
    const loadLogo = async () => {
      const { data } = await supabase.from('app_settings').select('org_logo').single();
      setOrgLogo(data?.org_logo || null);
    };
    loadLogo();
  }, []);

  if (!inputRecord || !moduleId) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <p className="text-gray-500 mb-4">داده‌ای برای پیش‌نمایش قالب ارسال نشده است.</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
          بازگشت
        </button>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <p className="text-gray-500 mb-2">برای این ماژول هنوز قالبی ذخیره نشده است.</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
          بازگشت
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-10 space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-3 flex items-center justify-between print:hidden">
        <button onClick={() => navigate('/')} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center gap-2">
          <ArrowRight className="w-4 h-4" />
          بازگشت
        </button>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-red-900 flex items-center gap-2">
          <Printer className="w-4 h-4" />
          چاپ
        </button>
      </div>

      <div className="overflow-auto p-4 bg-gray-100 dark:bg-gray-900 rounded-xl">
        {loading && <div className="mb-2 text-xs text-gray-500">در حال بازیابی داده‌های رکورد از دیتابیس...</div>}
        <div className="mx-auto bg-white shadow relative" style={{ width: '210mm', height: '297mm' }}>
          {template.elements.map(el => (
            <TemplateElement key={el.id} el={el} record={record} orgLogo={orgLogo} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportTemplatePreview;
