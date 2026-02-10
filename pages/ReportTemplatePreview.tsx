import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  LabelList,
} from 'recharts';
import {
  executeTemplateDatasets,
  evaluateTemplateExpression,
  getActiveReportTemplateByModule,
  getRuntimeCache,
  getTemplateById,
  setRuntimeCache,
  userCanAccessTemplate,
  ReportElement,
  ReportTemplate,
} from '../services/reportTemplates';
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

const DATA_SOURCES = ['work_orders', 'shift_reports', 'lab_reports', 'warehouse_reports', 'scale_reports', 'hse_reports', 'parts', 'personnel'];
const BAND_ORDER = ['reportHeader', 'pageHeader', 'groupHeader', 'detail', 'groupFooter', 'reportFooter', 'pageFooter'];

const getValue = (obj: any, path: string) =>
  String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((acc: any, key: string) => (acc === null || acc === undefined ? undefined : acc[key]), obj);

const toDisplay = (value: any) => {
  if (value === null || value === undefined || value === '') return '---';
  if (typeof value === 'number') return value.toLocaleString('fa-IR');
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  return String(value);
};

const toNumber = (value: any) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};

const resolveTemplateText = (text: string, context: Record<string, any>) =>
  String(text || '').replace(/\{\{([^}]+)\}\}/g, (_, raw) => {
    const key = String(raw || '').trim();
    if (!key) return '';
    if (key.startsWith('expr:')) return toDisplay(evaluateTemplateExpression(key.slice(5), context));
    return toDisplay(getValue(context, key) ?? context[key]);
  });

const passConditionalRules = (rules: any[] | undefined, context: Record<string, any>) => {
  if (!Array.isArray(rules) || !rules.length) return true;
  return rules.every(rule => {
    const left = getValue(context, rule.leftField || '') ?? context[rule.leftField];
    const right = rule.rightType === 'expr'
      ? evaluateTemplateExpression(rule.rightValue, context)
      : rule.rightType === 'field'
        ? getValue(context, rule.rightValue || '')
        : rule.rightValue;
    if (rule.operator === 'eq') return String(left ?? '') === String(right ?? '');
    if (rule.operator === 'neq') return String(left ?? '') !== String(right ?? '');
    if (rule.operator === 'gt') return Number(left ?? 0) > Number(right ?? 0);
    if (rule.operator === 'gte') return Number(left ?? 0) >= Number(right ?? 0);
    if (rule.operator === 'lt') return Number(left ?? 0) < Number(right ?? 0);
    if (rule.operator === 'lte') return Number(left ?? 0) <= Number(right ?? 0);
    if (rule.operator === 'contains') return String(left ?? '').toLowerCase().includes(String(right ?? '').toLowerCase());
    return true;
  });
};

const textStyleToProps = (style?: any): React.CSSProperties => ({
  fontFamily: style?.fontFamily || 'Vazirmatn',
  fontSize: style?.fontSize,
  fontWeight: style?.bold ? 'bold' : 'normal',
  fontStyle: style?.italic ? 'italic' : 'normal',
  textDecoration: style?.underline ? 'underline' : 'none',
  color: style?.color,
  textAlign: style?.align,
  backgroundColor: style?.backgroundColor && style?.backgroundColor !== 'transparent' ? style.backgroundColor : undefined,
  padding: style?.backgroundColor && style?.backgroundColor !== 'transparent' ? '2px 6px' : undefined,
  borderRadius: style?.backgroundColor && style?.backgroundColor !== 'transparent' ? 4 : undefined,
});

const applyElementDataOptions = (rows: any[], el: ReportElement, record: any) => {
  let result = [...rows];
  const filterBy = el.props.filterByField;
  const filterFrom = el.props.filterValueFromRecordField;
  if (filterBy && filterFrom) {
    const expected = getValue(record, filterFrom);
    result = result.filter(r => String(getValue(r, filterBy) ?? '') === String(expected ?? ''));
  }
  if (el.props.sortBy) {
    const key = el.props.sortBy;
    const direction = el.props.sortDirection === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      const av = getValue(a, key);
      const bv = getValue(b, key);
      if (typeof av === 'number' || typeof bv === 'number') return (toNumber(av) - toNumber(bv)) * direction;
      return String(av ?? '').localeCompare(String(bv ?? ''), 'fa') * direction;
    });
  }
  const limit = Math.max(1, Math.min(1000, Number(el.props.rowLimit || 300)));
  return result.slice(0, limit);
};

const getElementRows = (el: ReportElement, record: any, dataBySource: Record<string, any[]>, datasets: Record<string, any[]>) => {
  if (el.props.datasetId) return datasets[el.props.datasetId] || [];
  if (el.props.dataSource) return applyElementDataOptions(dataBySource[el.props.dataSource] || [], el, record);
  return [record];
};

const buildChartData = (el: ReportElement, rows: any[]) => {
  if (!rows.length) return [];
  const labelField = el.props.labelField || el.props.chartGroupBy || 'id';
  const valueField = el.props.valueField;
  const groupBy = el.props.chartGroupBy;
  const sortChartBy = el.props.sortChartBy || 'value_desc';
  const topN = Math.max(1, Math.min(100, Number(el.props.topN || 20)));
  let output: Array<{ name: string; value: number }> = [];

  if (groupBy) {
    const grouped: Record<string, number> = {};
    rows.forEach(r => {
      const key = String(getValue(r, groupBy) ?? 'نامشخص');
      grouped[key] = (grouped[key] || 0) + (valueField ? toNumber(getValue(r, valueField)) : 1);
    });
    output = Object.keys(grouped).map(k => ({ name: k, value: grouped[k] }));
  } else {
    output = rows.map(r => ({
      name: String(getValue(r, labelField) ?? '---'),
      value: valueField ? toNumber(getValue(r, valueField)) : 1,
    }));
  }

  if (sortChartBy === 'value_desc') output.sort((a, b) => b.value - a.value);
  else if (sortChartBy === 'value_asc') output.sort((a, b) => a.value - b.value);
  else output.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  return output.slice(0, topN);
};

const TemplateElement: React.FC<{
  el: ReportElement;
  record: any;
  dataBySource: Record<string, any[]>;
  datasets: Record<string, any[]>;
  orgLogo: string | null;
  parameters: Record<string, any>;
}> = ({ el, record, dataBySource, datasets, orgLogo, parameters }) => {
  const rows = getElementRows(el, record, dataBySource, datasets);
  const firstRow = rows[0] || record;
  const context = { ...record, row: firstRow, rows, params: parameters };
  if (!passConditionalRules(el.props.conditionalRules, context)) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: el.layout.x,
    top: el.layout.y,
    width: el.layout.width,
    height: el.layout.height,
    overflow: 'hidden',
    backgroundColor: el.props.backgroundColor || 'transparent',
    border: el.props.borderWidth > 0 ? `${el.props.borderWidth}px solid ${el.props.borderColor || '#d1d5db'}` : undefined,
    borderRadius: el.type === 'HEADER' ? undefined : 8,
    pageBreakBefore: el.props.pageBreakBefore ? 'always' : undefined,
    breakInside: el.props.keepTogether ? 'avoid' : undefined,
  };

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
              <span style={textStyleToProps(el.props.detailsProps?.valueStyle)}>{resolveTemplateText(`{{${item.value}}}`, context)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (el.type === 'TEXT') {
    const text = el.props.expression
      ? evaluateTemplateExpression(el.props.expression, context)
      : resolveTemplateText(el.props.textProps?.text || '', context);
    return <div style={style} className="p-2"><div style={textStyleToProps(el.props.textProps)}>{toDisplay(text)}</div></div>;
  }

  if (el.type === 'STAT_CARD') {
    const value = el.props.expression
      ? evaluateTemplateExpression(el.props.expression, context)
      : el.props.valueField
        ? getValue(firstRow, el.props.valueField)
        : el.props.valueProps?.text;
    return (
      <div style={style} className="p-3 text-center">
        <div style={textStyleToProps(el.props.labelProps)}>{el.props.labelProps?.text}</div>
        <div style={textStyleToProps(el.props.valueProps)}>{toDisplay(value)}</div>
      </div>
    );
  }

  if (el.type === 'TABLE') {
    const columns = (el.props.columns || []).length
      ? el.props.columns
      : Object.keys(firstRow || {}).slice(0, 6).map((k, idx) => ({ id: `${k}-${idx}`, header: k, key: k, align: 'right' }));
    const rowLimit = Math.max(1, Number(el.props.rows || 10));
    const visibleRows = (rows.length ? rows : [record]).slice(0, rowLimit);
    const bordered = el.props.showTableBorders !== false;
    const compact = el.props.compactRows || false;
    const wrapText = el.props.wrapText !== false;
    const paddingClass = compact ? 'p-1' : 'p-2';
    const borderClass = bordered ? 'border' : '';
    return (
      <div style={style} className="p-2 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {el.props.showRowNumber && <th className={`${borderClass} ${paddingClass} text-center`}>#</th>}
              {columns.map((c: any) => (
                <th key={c.id} className={`${borderClass} ${paddingClass}`} style={{ textAlign: c.align || 'right' }}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, ridx) => (
              <tr key={ridx} style={{ backgroundColor: ridx % 2 !== 0 ? el.props.alternateRowColor : undefined }}>
                {el.props.showRowNumber && <td className={`${borderClass} ${paddingClass} text-center`}>{ridx + 1}</td>}
                {columns.map((c: any) => (
                  <td key={`${c.id}-${ridx}`} className={`${borderClass} ${paddingClass} ${wrapText ? '' : 'whitespace-nowrap'}`} style={{ textAlign: c.align || 'right' }}>
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

  if (el.type === 'IMAGE') {
    return (
      <div style={style} className="flex items-center justify-center">
        {el.props.customLogo ? <img src={el.props.customLogo} className="w-full h-full" style={{ objectFit: el.props.imageFit || 'contain' }} /> : <span className="text-xs text-gray-400">تصویر ندارد</span>}
      </div>
    );
  }

  if (['CHART_BAR', 'CHART_PIE', 'CHART_LINE', 'CHART_AREA', 'CHART_RADAR'].includes(el.type)) {
    const chartData = buildChartData(el, rows);
    const palette = (el.props.chartPalette || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const chartColors = palette.length ? palette : [el.props.chartColor || '#800020', '#2563eb', '#10b981', '#f97316', '#7c3aed'];
    const pieLabelMode = el.props.pieLabelMode || 'none';
    return (
      <div style={style} className="p-2 flex flex-col">
        <div className="text-xs font-bold text-center mb-1">{el.props.titleProps?.text || 'نمودار'}</div>
        {chartData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400">داده‌ای برای نمودار موجود نیست</div>
        ) : (
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              {el.type === 'CHART_BAR' ? (
                <BarChart data={chartData}>
                  {el.props.showGrid !== false && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  {el.props.showTooltip !== false && <Tooltip />}
                  <Bar dataKey="value" fill={chartColors[0]} radius={[el.props.barRadius || 4, el.props.barRadius || 4, 0, 0]}>
                    <LabelList dataKey="value" position="top" fontSize={10} />
                  </Bar>
                  {el.props.showLegend && <Legend />}
                </BarChart>
              ) : el.type === 'CHART_PIE' ? (
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={el.props.innerRadius || 0} outerRadius={60}
                    label={pieLabelMode === 'none' ? false : (entry: any) => pieLabelMode === 'percent' ? `${Math.round((entry.percent || 0) * 100)}%` : toDisplay(entry.value)}>
                    {chartData.map((_, idx) => <Cell key={`c-${idx}`} fill={chartColors[idx % chartColors.length]} />)}
                  </Pie>
                  {el.props.showTooltip !== false && <Tooltip />}
                  {el.props.showLegend && <Legend />}
                </PieChart>
              ) : el.type === 'CHART_LINE' ? (
                <LineChart data={chartData}>
                  {el.props.showGrid !== false && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  {el.props.showTooltip !== false && <Tooltip />}
                  <Line type={el.props.lineType || 'monotone'} dataKey="value" stroke={chartColors[0]} strokeWidth={2} dot={el.props.showDots !== false} />
                  {el.props.showLegend && <Legend />}
                </LineChart>
              ) : el.type === 'CHART_AREA' ? (
                <AreaChart data={chartData}>
                  {el.props.showGrid !== false && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  {el.props.showTooltip !== false && <Tooltip />}
                  <Area type={el.props.lineType || 'monotone'} dataKey="value" stroke={chartColors[0]} fill={chartColors[0]} fillOpacity={el.props.areaOpacity ?? 0.35} />
                  {el.props.showLegend && <Legend />}
                </AreaChart>
              ) : (
                <RadarChart data={chartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis />
                  {el.props.showTooltip !== false && <Tooltip />}
                  <Radar dataKey="value" stroke={chartColors[0]} fill={chartColors[0]} fillOpacity={el.props.areaOpacity ?? 0.35} />
                  {el.props.showLegend && <Legend />}
                </RadarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  if (el.props.subreportTemplateId) {
    const subTemplate = getTemplateById(el.props.subreportTemplateId) as ReportTemplate | null;
    if (!subTemplate) return <div style={style} className="text-xs p-2 text-amber-700">ساب‌ریپورت یافت نشد.</div>;
    return (
      <div style={style} className="relative border border-dashed border-gray-300 bg-gray-50">
        {(subTemplate.elements || []).slice(0, 12).map(child => (
          <TemplateElement key={`sub-${el.id}-${child.id}`} el={child} record={record} dataBySource={dataBySource} datasets={datasets} orgLogo={orgLogo} parameters={parameters} />
        ))}
      </div>
    );
  }

  return <div style={style} className="flex items-center justify-center text-xs text-gray-400">{el.type}</div>;
};

export const ReportTemplatePreview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as { moduleId?: string; record?: any; userRoles?: string[]; runtimeParams?: Record<string, any> };
  const moduleId = state.moduleId || '';
  const inputRecord = state.record || null;
  const userRoles = state.userRoles || [];
  const [record, setRecord] = useState<any>(inputRecord);
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [dataBySource, setDataBySource] = useState<Record<string, any[]>>({});
  const [datasets, setDatasets] = useState<Record<string, any[]>>({});
  const [runtimeParams, setRuntimeParams] = useState<Record<string, any>>(state.runtimeParams || {});
  const [loading, setLoading] = useState(true);
  const template = useMemo(() => (moduleId ? getActiveReportTemplateByModule(moduleId) : null), [moduleId]);

  useEffect(() => {
    if (!template) return;
    setRuntimeParams(prev => {
      const next = { ...prev };
      (template.parameters || []).forEach(p => {
        if (next[p.key] === undefined) next[p.key] = p.defaultValue ?? '';
      });
      return next;
    });
  }, [template]);

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
        setRecord({ ...(inputRecord || {}), ...(fetched || {}), ...(inputRecord?.full_data || {}), ...(fetched?.full_data || {}) });
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

  useEffect(() => {
    const loadData = async () => {
      if (!template) return;
      const cacheKey = `${template.id}|${JSON.stringify(runtimeParams)}|${record?.id || 'record'}`;
      const cached = getRuntimeCache(cacheKey);
      if (cached?.dataBySource && cached?.datasets) {
        setDataBySource(cached.dataBySource);
        setDatasets(cached.datasets);
        return;
      }
      const sourceSet = new Set<string>(DATA_SOURCES);
      (template.datasets || []).forEach(ds => {
        sourceSet.add(ds.source);
        (ds.joins || []).forEach(j => sourceSet.add(j.source));
      });
      const entries = await Promise.all(Array.from(sourceSet).map(async source => {
        try {
          const { data } = await supabase.from(source).select('*').limit(1000);
          return [source, data || []] as const;
        } catch {
          return [source, []] as const;
        }
      }));
      const sourceMap: Record<string, any[]> = {};
      entries.forEach(([k, v]) => { sourceMap[k] = v; });
      setDataBySource(sourceMap);
      const executed = executeTemplateDatasets(template, { runtimeParameters: runtimeParams, record, sourceData: sourceMap });
      setDatasets(executed);
      setRuntimeCache(cacheKey, { dataBySource: sourceMap, datasets: executed }, 120);
    };
    loadData();
  }, [template, runtimeParams, record]);

  const groupedElements = useMemo(() => {
    const grouped: Record<string, ReportElement[]> = {};
    BAND_ORDER.forEach(b => { grouped[b] = []; });
    (template?.elements || []).forEach(el => {
      grouped[el.band || 'detail'] = [...(grouped[el.band || 'detail'] || []), el];
    });
    return BAND_ORDER.map(key => ({ key, items: grouped[key] || [] })).filter(g => g.items.length > 0);
  }, [template]);

  const exportHtml = () => {
    const node = document.getElementById('report-preview-page');
    if (!node) return;
    const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"/><title>${template?.title || 'report'}</title></head><body>${node.outerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template?.targetModule || 'report'}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXlsx = () => {
    if (!template) return;
    const wb = XLSX.utils.book_new();
    (template.elements || []).filter(el => el.type === 'TABLE').forEach((el, idx) => {
      const rows = getElementRows(el, record, dataBySource, datasets);
      const cols = el.props.columns || Object.keys(rows[0] || {}).map((k: string) => ({ key: k, header: k }));
      const exportRows = rows.slice(0, Math.max(1, Number(el.props.rows || 300))).map((row: any) => {
        const out: Record<string, any> = {};
        cols.forEach((c: any) => { out[c.header || c.key] = getValue(row, c.key); });
        return out;
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), `Table_${idx + 1}`);
    });
    XLSX.writeFile(wb, `${template.targetModule || 'report'}-${Date.now()}.xlsx`);
  };

  if (!inputRecord || !moduleId) return <div className="max-w-3xl mx-auto py-16 text-center"><p className="text-gray-500 mb-4">داده‌ای برای پیش‌نمایش قالب ارسال نشده است.</p><button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">بازگشت</button></div>;
  if (!template) return <div className="max-w-3xl mx-auto py-16 text-center"><p className="text-gray-500 mb-2">برای این ماژول هنوز قالبی ذخیره نشده است.</p><button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">بازگشت</button></div>;
  if (!userCanAccessTemplate(template, userRoles)) return <div className="max-w-3xl mx-auto py-16 text-center"><p className="text-red-600 mb-2">دسترسی شما به این قالب مجاز نیست.</p><button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">بازگشت</button></div>;
  if (template.governance?.requiresApproval && !template.governance?.approvedAt) return <div className="max-w-3xl mx-auto py-16 text-center"><p className="text-amber-700 mb-2">این قالب هنوز تایید نشده و قابل اجرا نیست.</p><button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">بازگشت</button></div>;

  const page = template.pageSettings || { size: 'A4', orientation: 'portrait', marginTop: 12, marginRight: 12, marginBottom: 12, marginLeft: 12, keepTogether: true };
  const pageSize = page.size === 'A3' ? { w: 297, h: 420 } : page.size === 'Letter' ? { w: 216, h: 279 } : { w: 210, h: 297 };
  const width = page.orientation === 'landscape' ? pageSize.h : pageSize.w;
  const height = page.orientation === 'landscape' ? pageSize.w : pageSize.h;

  return (
    <div className="max-w-7xl mx-auto pb-10 space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-3 space-y-3 print:hidden">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center gap-2"><ArrowRight className="w-4 h-4" />بازگشت</button>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="px-3 py-2 rounded-lg bg-primary text-white hover:bg-red-900 flex items-center gap-2"><Printer className="w-4 h-4" />چاپ</button>
            <button onClick={() => window.print()} className="px-3 py-2 rounded-lg bg-red-50 text-red-700 flex items-center gap-2"><FileText className="w-4 h-4" />PDF</button>
            <button onClick={exportXlsx} className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" />XLSX</button>
            <button onClick={exportHtml} className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 flex items-center gap-2"><Download className="w-4 h-4" />HTML</button>
          </div>
        </div>
        {(template.parameters || []).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {(template.parameters || []).map(param => (
              <label key={param.id} className="text-xs bg-gray-50 rounded p-2 flex flex-col gap-1">
                <span>{param.label}</span>
                {param.type === 'boolean' ? (
                  <input type="checkbox" checked={!!runtimeParams[param.key]} onChange={e => setRuntimeParams(prev => ({ ...prev, [param.key]: e.target.checked }))} />
                ) : param.type === 'select' ? (
                  <select value={runtimeParams[param.key] ?? ''} onChange={e => setRuntimeParams(prev => ({ ...prev, [param.key]: e.target.value }))} className="p-1 border rounded">
                    <option value="">انتخاب...</option>
                    {(param.options || []).map(op => <option key={`${param.key}-${op.value}`} value={op.value}>{op.label}</option>)}
                  </select>
                ) : (
                  <input type={param.type === 'number' ? 'number' : param.type === 'date' ? 'date' : 'text'} value={runtimeParams[param.key] ?? ''} onChange={e => setRuntimeParams(prev => ({ ...prev, [param.key]: e.target.value }))} className="p-1 border rounded" />
                )}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="overflow-auto p-4 bg-gray-100 dark:bg-gray-900 rounded-xl">
        {loading && <div className="mb-2 text-xs text-gray-500">در حال بازیابی داده‌های رکورد از دیتابیس...</div>}
        <div id="report-preview-page" className="mx-auto bg-white shadow relative" style={{ width: `${width}mm`, height: `${height}mm`, paddingTop: `${page.marginTop}mm`, paddingRight: `${page.marginRight}mm`, paddingBottom: `${page.marginBottom}mm`, paddingLeft: `${page.marginLeft}mm` }}>
          {groupedElements.map(group => (
            <React.Fragment key={group.key}>
              {group.items.map(el => (
                <TemplateElement key={el.id} el={el} record={record} dataBySource={dataBySource} datasets={datasets} orgLogo={orgLogo} parameters={runtimeParams} />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportTemplatePreview;
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  executeTemplateDatasets,
  evaluateTemplateExpression,
  getActiveReportTemplateByModule,
  getRuntimeCache,
  setRuntimeCache,
  userCanAccessTemplate,
  ReportElement,
} from '../services/reportTemplates';
import { supabase } from '../supabaseClient';

const MODULE_TABLE_MAP: Record<string, string | null> = {
  'shiftreport': 'shift_reports',
  'scale-report': 'scale_reports',
  'lab-report': 'lab_reports',
  'warehouse-report': 'warehouse_reports',
  'hse-report': 'hse_reports',
  'productionreport': null,
  'control-room': null,
};

const DATA_SOURCES = ['work_orders', 'shift_reports', 'lab_reports', 'warehouse_reports', 'scale_reports', 'hse_reports', 'parts', 'personnel'];

const getValue = (obj: any, path: string) =>
  String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((acc: any, key: string) => (acc === null || acc === undefined ? undefined : acc[key]), obj);

const toDisplay = (value: any) => {
  if (value === null || value === undefined || value === '') return '---';
  if (typeof value === 'number') return value.toLocaleString('fa-IR');
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  return String(value);
};

const resolveTemplateText = (text: string, context: Record<string, any>) =>
  String(text || '').replace(/\{\{([^}]+)\}\}/g, (_, raw) => {
    const key = String(raw || '').trim();
    if (!key) return '';
    if (key.startsWith('expr:')) return toDisplay(evaluateTemplateExpression(key.slice(5), context));
    return toDisplay(getValue(context, key) ?? context[key]);
  });

const passConditionalRules = (rules: any[] | undefined, context: Record<string, any>) => {
  if (!Array.isArray(rules) || !rules.length) return true;
  return rules.every(rule => {
    const left = getValue(context, rule.leftField || '') ?? context[rule.leftField];
    const right = rule.rightType === 'expr'
      ? evaluateTemplateExpression(rule.rightValue, context)
      : rule.rightType === 'field'
        ? getValue(context, rule.rightValue || '')
        : rule.rightValue;
    if (rule.operator === 'eq') return String(left ?? '') === String(right ?? '');
    if (rule.operator === 'neq') return String(left ?? '') !== String(right ?? '');
    if (rule.operator === 'gt') return Number(left ?? 0) > Number(right ?? 0);
    if (rule.operator === 'gte') return Number(left ?? 0) >= Number(right ?? 0);
    if (rule.operator === 'lt') return Number(left ?? 0) < Number(right ?? 0);
    if (rule.operator === 'lte') return Number(left ?? 0) <= Number(right ?? 0);
    if (rule.operator === 'contains') return String(left ?? '').toLowerCase().includes(String(right ?? '').toLowerCase());
    return true;
  });
};

const textStyleToProps = (style?: any): React.CSSProperties => ({
  fontFamily: style?.fontFamily || 'Vazirmatn',
  fontSize: style?.fontSize,
  fontWeight: style?.bold ? 'bold' : 'normal',
  fontStyle: style?.italic ? 'italic' : 'normal',
  textDecoration: style?.underline ? 'underline' : 'none',
  color: style?.color,
  textAlign: style?.align,
  backgroundColor: style?.backgroundColor && style?.backgroundColor !== 'transparent' ? style?.backgroundColor : undefined,
  padding: style?.backgroundColor && style?.backgroundColor !== 'transparent' ? '2px 6px' : undefined,
  borderRadius: style?.backgroundColor && style?.backgroundColor !== 'transparent' ? 4 : undefined,
});

const TemplateElement: React.FC<{
  el: ReportElement;
  record: any;
  dataBySource: Record<string, any[]>;
  datasets: Record<string, any[]>;
  orgLogo: string | null;
  parameters: Record<string, any>;
}> = ({ el, record, dataBySource, datasets, orgLogo, parameters }) => {
  const datasetRows = el.props.datasetId ? datasets[el.props.datasetId] || [] : [];
  const sourceRows = el.props.dataSource ? dataBySource[el.props.dataSource] || [] : [];
  const rows = datasetRows.length ? datasetRows : sourceRows.length ? sourceRows : [record];
  const firstRow = rows[0] || record;
  const exprContext = { ...record, row: firstRow, rows, params: parameters };
  const visible = passConditionalRules(el.props.conditionalRules, exprContext);
  if (!visible) return null;

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
    pageBreakBefore: el.props.pageBreakBefore ? 'always' : undefined,
    breakInside: el.props.keepTogether ? 'avoid' : undefined,
  };

  if (el.type === 'HEADER') {
    const details = el.props.detailsProps?.items || [];
    return (
      <div style={style} className="p-3 flex items-center justify-between">
        <div className="w-16 h-16 flex items-center justify-center text-xs bg-gray-100 rounded">
          {orgLogo ? <img src={orgLogo} alt="logo" className="w-full h-full object-contain" /> : 'LOGO'}
        </div>
        <div className="text-center flex-1 px-4">
          <h1 style={textStyleToProps(el.props.titleProps)}>{resolveTemplateText(el.props.titleProps?.text || '', exprContext)}</h1>
          <h2 style={textStyleToProps(el.props.subtitleProps)}>{resolveTemplateText(el.props.subtitleProps?.text || '', exprContext)}</h2>
        </div>
        <div className="w-44 text-xs space-y-1">
          {details.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between border-b border-dashed border-gray-300 pb-1">
              <span style={textStyleToProps(el.props.detailsProps?.labelStyle)}>{item.label}</span>
              <span style={textStyleToProps(el.props.detailsProps?.valueStyle)}>
                {resolveTemplateText(`{{${item.value}}}`, exprContext)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (el.type === 'TEXT') {
    const text = el.props.expression ? evaluateTemplateExpression(el.props.expression, exprContext) : resolveTemplateText(el.props.textProps?.text || '', exprContext);
    return <div style={style} className="p-2"><div style={textStyleToProps(el.props.textProps)}>{toDisplay(text)}</div></div>;
  }

  if (el.type === 'STAT_CARD') {
    const val = el.props.expression
      ? evaluateTemplateExpression(el.props.expression, exprContext)
      : el.props.valueField
        ? getValue(firstRow, el.props.valueField)
        : el.props.valueProps?.text;
    return (
      <div style={style} className="p-3 text-center">
        <div style={textStyleToProps(el.props.labelProps)}>{el.props.labelProps?.text}</div>
        <div style={textStyleToProps(el.props.valueProps)}>{toDisplay(val)}</div>
      </div>
    );
  }

  if (el.type === 'TABLE') {
    const columns = (el.props.columns && el.props.columns.length > 0)
      ? el.props.columns
      : Object.keys(firstRow || {}).slice(0, 6).map((k, idx) => ({ id: `${k}-${idx}`, header: k, key: k, align: 'right' }));
    const visibleRows = rows.slice(0, Math.max(1, Number(el.props.rows || 10)));
    return (
      <div style={style} className="p-2 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-gray-100">{columns.map((c: any) => <th key={c.id} className="border p-2" style={{ textAlign: c.align || 'right' }}>{c.header}</th>)}</tr></thead>
          <tbody>
            {visibleRows.map((row, idx) => (
              <tr key={idx}>
                {columns.map((c: any) => <td key={`${c.id}-${idx}`} className="border p-2" style={{ textAlign: c.align || 'right' }}>{toDisplay(getValue(row, c.key))}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (el.type === 'IMAGE') {
    return <div style={style} className="flex items-center justify-center">{el.props.customLogo ? <img src={el.props.customLogo} className="w-full h-full" style={{ objectFit: el.props.imageFit || 'contain' }} /> : <span className="text-xs text-gray-400">تصویر ندارد</span>}</div>;
  }

  return <div style={style} className="flex items-center justify-center text-xs text-gray-400">{el.type}</div>;
};

export const ReportTemplatePreview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as { moduleId?: string; record?: any; userRoles?: string[] };
  const moduleId = state.moduleId || '';
  const inputRecord = state.record || null;
  const userRoles = state.userRoles || [];

  const [record, setRecord] = useState<any>(inputRecord);
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [dataBySource, setDataBySource] = useState<Record<string, any[]>>({});
  const [datasets, setDatasets] = useState<Record<string, any[]>>({});
  const [runtimeParams, setRuntimeParams] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const template = useMemo(() => (moduleId ? getActiveReportTemplateByModule(moduleId) : null), [moduleId]);

  useEffect(() => {
    if (!template) return;
    const defaults: Record<string, any> = {};
    (template.parameters || []).forEach(p => {
      defaults[p.key] = p.defaultValue ?? '';
    });
    setRuntimeParams(defaults);
  }, [template]);

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
        setRecord({ ...(inputRecord || {}), ...(fetched || {}), ...(inputRecord?.full_data || {}), ...(fetched?.full_data || {}) });
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

  useEffect(() => {
    const loadData = async () => {
      if (!template) return;
      const cacheKey = `${template.id}|${JSON.stringify(runtimeParams)}`;
      const cached = getRuntimeCache(cacheKey);
      if (cached?.dataBySource && cached?.datasets) {
        setDataBySource(cached.dataBySource);
        setDatasets(cached.datasets);
        return;
      }
      const sourceSet = new Set<string>();
      DATA_SOURCES.forEach(s => sourceSet.add(s));
      (template.datasets || []).forEach(ds => {
        sourceSet.add(ds.source);
        (ds.joins || []).forEach(j => sourceSet.add(j.source));
      });
      const entries = await Promise.all(Array.from(sourceSet).map(async source => {
        try {
          const { data } = await supabase.from(source).select('*').limit(1000);
          return [source, data || []] as const;
        } catch {
          return [source, []] as const;
        }
      }));
      const sourceMap: Record<string, any[]> = {};
      entries.forEach(([k, v]) => { sourceMap[k] = v; });
      setDataBySource(sourceMap);
      const executed = executeTemplateDatasets(template, { runtimeParameters: runtimeParams, record, sourceData: sourceMap });
      setDatasets(executed);
      setRuntimeCache(cacheKey, { dataBySource: sourceMap, datasets: executed }, 120);
    };
    loadData();
  }, [template, runtimeParams, record]);

  const groupedElements = useMemo(() => {
    const order = ['reportHeader', 'pageHeader', 'groupHeader', 'detail', 'groupFooter', 'reportFooter', 'pageFooter'];
    const grouped: Record<string, ReportElement[]> = {};
    order.forEach(key => { grouped[key] = []; });
    (template?.elements || []).forEach(el => {
      grouped[el.band || 'detail'] = [...(grouped[el.band || 'detail'] || []), el];
    });
    return order.map(key => ({ key, items: grouped[key] || [] })).filter(g => g.items.length > 0);
  }, [template]);

  const exportHtml = () => {
    const node = document.getElementById('report-preview-page');
    if (!node) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${template?.title || 'report'}</title></head><body>${node.outerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template?.targetModule || 'report'}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXlsx = () => {
    if (!template) return;
    const wb = XLSX.utils.book_new();
    (template.elements || [])
      .filter(el => el.type === 'TABLE')
      .forEach((el, idx) => {
        const rows = el.props.datasetId ? datasets[el.props.datasetId] || [] : el.props.dataSource ? dataBySource[el.props.dataSource] || [] : [record];
        const cols = el.props.columns || Object.keys(rows[0] || {}).map((k: string) => ({ key: k, header: k }));
        const exportRows = rows.slice(0, Math.max(1, Number(el.props.rows || 100))).map((row: any) => {
          const out: Record<string, any> = {};
          cols.forEach((c: any) => { out[c.header || c.key] = getValue(row, c.key); });
          return out;
        });
        const ws = XLSX.utils.json_to_sheet(exportRows);
        XLSX.utils.book_append_sheet(wb, ws, `Table_${idx + 1}`);
      });
    XLSX.writeFile(wb, `${template.targetModule || 'report'}-${Date.now()}.xlsx`);
  };

  const exportPdf = () => window.print();

  if (!inputRecord || !moduleId) return <div className="max-w-3xl mx-auto py-16 text-center"><p className="text-gray-500 mb-4">داده‌ای برای پیش‌نمایش قالب ارسال نشده است.</p><button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">بازگشت</button></div>;
  if (!template) return <div className="max-w-3xl mx-auto py-16 text-center"><p className="text-gray-500 mb-2">برای این ماژول هنوز قالبی ذخیره نشده است.</p><button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">بازگشت</button></div>;
  if (!userCanAccessTemplate(template, userRoles)) return <div className="max-w-3xl mx-auto py-16 text-center"><p className="text-red-600 mb-2">دسترسی شما به این قالب مجاز نیست.</p><button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">بازگشت</button></div>;
  if (template.governance?.requiresApproval && !template.governance?.approvedAt) return <div className="max-w-3xl mx-auto py-16 text-center"><p className="text-amber-700 mb-2">این قالب هنوز تایید نشده و قابل اجرا نیست.</p><button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">بازگشت</button></div>;

  const page = template.pageSettings || { size: 'A4', orientation: 'portrait', marginTop: 12, marginRight: 12, marginBottom: 12, marginLeft: 12, keepTogether: true };
  const pageSize = page.size === 'A3' ? { w: 297, h: 420 } : page.size === 'Letter' ? { w: 216, h: 279 } : { w: 210, h: 297 };
  const width = page.orientation === 'landscape' ? pageSize.h : pageSize.w;
  const height = page.orientation === 'landscape' ? pageSize.w : pageSize.h;

  return (
    <div className="max-w-7xl mx-auto pb-10 space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-3 space-y-3 print:hidden">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center gap-2"><ArrowRight className="w-4 h-4" />بازگشت</button>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="px-3 py-2 rounded-lg bg-primary text-white hover:bg-red-900 flex items-center gap-2"><Printer className="w-4 h-4" />چاپ</button>
            <button onClick={exportPdf} className="px-3 py-2 rounded-lg bg-red-50 text-red-700 flex items-center gap-2"><FileText className="w-4 h-4" />PDF</button>
            <button onClick={exportXlsx} className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" />XLSX</button>
            <button onClick={exportHtml} className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 flex items-center gap-2"><Download className="w-4 h-4" />HTML</button>
          </div>
        </div>
        {(template.parameters || []).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {(template.parameters || []).map(param => (
              <label key={param.id} className="text-xs bg-gray-50 rounded p-2 flex flex-col gap-1">
                <span>{param.label}</span>
                {param.type === 'boolean' ? (
                  <input type="checkbox" checked={!!runtimeParams[param.key]} onChange={e => setRuntimeParams(prev => ({ ...prev, [param.key]: e.target.checked }))} />
                ) : param.type === 'select' ? (
                  <select value={runtimeParams[param.key] ?? ''} onChange={e => setRuntimeParams(prev => ({ ...prev, [param.key]: e.target.value }))} className="p-1 border rounded">
                    <option value="">انتخاب...</option>
                    {(param.options || []).map(op => <option key={`${param.key}-${op.value}`} value={op.value}>{op.label}</option>)}
                  </select>
                ) : (
                  <input type={param.type === 'number' ? 'number' : param.type === 'date' ? 'date' : 'text'} value={runtimeParams[param.key] ?? ''} onChange={e => setRuntimeParams(prev => ({ ...prev, [param.key]: e.target.value }))} className="p-1 border rounded" />
                )}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="overflow-auto p-4 bg-gray-100 dark:bg-gray-900 rounded-xl">
        {loading && <div className="mb-2 text-xs text-gray-500">در حال بازیابی داده‌های رکورد از دیتابیس...</div>}
        <div id="report-preview-page" className="mx-auto bg-white shadow relative" style={{ width: `${width}mm`, height: `${height}mm`, paddingTop: `${page.marginTop}mm`, paddingRight: `${page.marginRight}mm`, paddingBottom: `${page.marginBottom}mm`, paddingLeft: `${page.marginLeft}mm` }}>
          {groupedElements.map(group => (
            <React.Fragment key={group.key}>
              {group.items.map(el => (
                <TemplateElement key={el.id} el={el} record={record} dataBySource={dataBySource} datasets={datasets} orgLogo={orgLogo} parameters={runtimeParams} />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportTemplatePreview;
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Printer } from 'lucide-react';
import { getActiveReportTemplateByModule, ReportElement } from '../services/reportTemplates';
import { supabase } from '../supabaseClient';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  LabelList
} from 'recharts';

const MODULE_TABLE_MAP: Record<string, string | null> = {
  'shiftreport': 'shift_reports',
  'scale-report': 'scale_reports',
  'lab-report': 'lab_reports',
  'warehouse-report': 'warehouse_reports',
  'hse-report': 'hse_reports',
  'productionreport': null,
  'control-room': null,
};

const getValue = (obj: any, path: string) => {
  if (!obj || !path) return '';
  return path.split('.').reduce((acc: any, key: string) => (acc ? acc[key] : undefined), obj);
};

const getValueByAlias = (record: any, rawKey: string) => {
  const key = String(rawKey || '').trim();
  if (!key) return undefined;
  const direct = getValue(record, key);
  if (direct !== undefined) return direct;

  const aliases: Record<string, string[]> = {
    tracking_code: ['tracking_code', 'code'],
    date: ['shift_date', 'report_date', 'date', 'created_at'],
    shift: ['shift_name', 'shift_type', 'shift'],
    supervisor: ['supervisor_name', 'operator'],
  };

  const byAlias = aliases[key] || [];
  for (const a of byAlias) {
    const v = getValue(record, a);
    if (v !== undefined) return v;
  }
  return undefined;
};

const toDisplay = (value: any): string => {
  if (value === null || value === undefined || value === '') return '---';
  if (typeof value === 'number') return value.toLocaleString('fa-IR');
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const resolveTokenText = (text: string, record: any) => {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const value = getValueByAlias(record, String(key).trim());
    return toDisplay(value);
  });
};

const resolveDetailValue = (record: any, raw: string, label?: string) => {
  const fallbackByLabel: Record<string, string> = {
    'کد رهگیری': 'tracking_code',
    'تاریخ': 'date',
    'شیفت': 'shift',
  };
  if (!raw) return '---';
  let normalizedRaw = raw;
  if (raw === '...' && label && fallbackByLabel[label]) {
    normalizedRaw = fallbackByLabel[label];
  }
  if (raw.startsWith('{{') && raw.endsWith('}}')) {
    return resolveTokenText(raw, record);
  }
  const direct = getValueByAlias(record, normalizedRaw);
  if (direct !== undefined) return toDisplay(direct);
  return resolveTokenText(normalizedRaw, record);
};

const toNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  const n = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};

const applyElementDataOptions = (rows: any[], el: ReportElement, record: any) => {
  let result = [...rows];
  const filterBy = el.props.filterByField;
  const filterFrom = el.props.filterValueFromRecordField;
  if (filterBy && filterFrom) {
    const expected = getValueByAlias(record, filterFrom);
    result = result.filter(r => String(getValue(r, filterBy) ?? '') === String(expected ?? ''));
  }

  if (el.props.sortBy) {
    const key = el.props.sortBy;
    const direction = el.props.sortDirection === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      const av = getValue(a, key);
      const bv = getValue(b, key);
      const an = toNumber(av);
      const bn = toNumber(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn) && (String(av ?? '').trim() !== '' || String(bv ?? '').trim() !== '')) {
        return (an - bn) * direction;
      }
      return String(av ?? '').localeCompare(String(bv ?? ''), 'fa') * direction;
    });
  }

  const limit = Math.max(1, Math.min(500, Number(el.props.rowLimit || 50)));
  return result.slice(0, limit);
};

const getElementRows = (el: ReportElement, record: any, dataBySource: Record<string, any[]>) => {
  const source = el.props.dataSource;
  if (!source) return [record];
  const sourceRows = dataBySource[source] || [];
  return applyElementDataOptions(sourceRows, el, record);
};

const buildChartData = (el: ReportElement, rows: any[]) => {
  if (!rows.length) return [];
  const labelField = el.props.labelField || el.props.chartGroupBy || 'id';
  const valueField = el.props.valueField;
  const groupBy = el.props.chartGroupBy;
  const sortChartBy = el.props.sortChartBy || 'value_desc';
  const topN = Math.max(1, Math.min(100, Number(el.props.topN || 20)));
  let output: Array<{ name: string; value: number }> = [];

  if (groupBy) {
    const grouped: Record<string, number> = {};
    rows.forEach(r => {
      const key = String(getValue(r, groupBy) ?? 'نامشخص');
      const val = valueField ? toNumber(getValue(r, valueField)) : 1;
      grouped[key] = (grouped[key] || 0) + val;
    });
    output = Object.keys(grouped).map(k => ({ name: k, value: grouped[k] }));
  } else {
    output = rows.map(r => ({
      name: String(getValue(r, labelField) ?? '---'),
      value: valueField ? toNumber(getValue(r, valueField)) : 1,
    }));
  }

  if (sortChartBy === 'value_desc') {
    output.sort((a, b) => b.value - a.value);
  } else if (sortChartBy === 'value_asc') {
    output.sort((a, b) => a.value - b.value);
  } else {
    output.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  }

  return output.slice(0, topN);
};

const textStyleToProps = (style?: any): React.CSSProperties => ({
  fontFamily: style?.fontFamily || 'Vazirmatn',
  fontSize: style?.fontSize,
  fontWeight: style?.bold ? 'bold' : 'normal',
  fontStyle: style?.italic ? 'italic' : 'normal',
  textDecoration: style?.underline ? 'underline' : 'none',
  color: style?.color,
  textAlign: style?.align,
  backgroundColor: style?.backgroundColor && style?.backgroundColor !== 'transparent' ? style?.backgroundColor : undefined,
  padding: style?.backgroundColor && style?.backgroundColor !== 'transparent' ? '2px 6px' : undefined,
  borderRadius: style?.backgroundColor && style?.backgroundColor !== 'transparent' ? 4 : undefined,
});

const TemplateElement: React.FC<{ el: ReportElement; record: any; dataBySource: Record<string, any[]>; orgLogo: string | null }> = ({ el, record, dataBySource, orgLogo }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: el.layout.x,
    top: el.layout.y,
    width: el.layout.width,
    height: el.layout.height,
    overflow: 'hidden',
    backgroundColor: el.props.backgroundColor || 'transparent',
  };

  if (el.props.borderWidth > 0) {
    style.border = `${el.props.borderWidth}px solid ${el.props.borderColor || '#d1d5db'}`;
    style.borderRadius = 8;
  }

  if (el.type === 'HEADER') {
    const details = el.props.detailsProps?.items || [];
    return (
      <div style={style} className="p-3 flex items-center justify-between">
        <div className="w-16 h-16 flex items-center justify-center text-xs bg-gray-100 rounded">
          {orgLogo ? <img src={orgLogo} alt="logo" className="w-full h-full object-contain" /> : 'LOGO'}
        </div>
        <div className="text-center flex-1 px-4">
          <h1 style={textStyleToProps(el.props.titleProps)}>
            {resolveTokenText(el.props.titleProps?.text || '', record)}
          </h1>
          <h2 style={textStyleToProps(el.props.subtitleProps)}>
            {resolveTokenText(el.props.subtitleProps?.text || '', record)}
          </h2>
        </div>
        <div className="w-44 text-xs space-y-1">
          {details.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between border-b border-dashed border-gray-300 pb-1">
              <span style={textStyleToProps(el.props.detailsProps?.labelStyle)}>{item.label}</span>
              <span style={textStyleToProps(el.props.detailsProps?.valueStyle)}>
                {resolveDetailValue(record, item.value, item.label)}
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
          {resolveTokenText(el.props.textProps?.text || '', record)}
        </div>
      </div>
    );
  }

  if (el.type === 'STAT_CARD') {
    const rows = getElementRows(el, record, dataBySource);
    const valueField = el.props.valueField;
    const aggregation = el.props.aggregation || 'COUNT';
    let value: any = el.props.valueProps?.text;

    if (el.props.dataSource) {
      if (aggregation === 'COUNT') {
        value = rows.length;
      } else if (valueField) {
        const nums = rows.map(r => toNumber(getValue(r, valueField)));
        const sum = nums.reduce((a, b) => a + b, 0);
        value = aggregation === 'AVG' ? (nums.length ? sum / nums.length : 0) : sum;
      } else {
        value = rows.length;
      }
    } else if (valueField) {
      value = getValueByAlias(record, valueField);
    }

    return (
      <div style={style} className="p-3 flex flex-col justify-center text-center">
        <span style={textStyleToProps(el.props.labelProps)}>{el.props.labelProps?.text}</span>
        <span style={textStyleToProps(el.props.valueProps)}>{toDisplay(value)}</span>
      </div>
    );
  }

  if (el.type === 'TABLE') {
    const rows = getElementRows(el, record, dataBySource);
    const columns = (el.props.columns && el.props.columns.length > 0)
      ? el.props.columns
      : Object.keys(rows[0] || {}).slice(0, 6).map((k, idx) => ({ id: `${k}-${idx}`, header: k, key: k, align: 'right' }));
    const rowLimit = Math.max(1, Number(el.props.rows || 10));
    const visibleRows = (rows.length ? rows : [record]).slice(0, rowLimit);
    const bordered = el.props.showTableBorders !== false;
    const compact = el.props.compactRows || false;
    const wrapText = el.props.wrapText !== false;
    const paddingClass = compact ? 'p-1' : 'p-2';
    const borderClass = bordered ? 'border' : '';
    const totalsEnabled = el.props.showTotalsRow || false;
    const totalFields = el.props.totalFields || [];
    const totals: Record<string, number> = {};
    if (totalsEnabled) {
      totalFields.forEach(field => {
        totals[field] = visibleRows.reduce((acc, row) => acc + toNumber(getValue(row, field)), 0);
      });
    }

    return (
      <div style={style} className="p-2 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {el.props.showRowNumber && (
                <th className={`${borderClass} ${paddingClass} text-center`}>#</th>
              )}
              {columns.map((col: any) => (
                <th key={col.id} className={`${borderClass} ${paddingClass}`} style={{ textAlign: col.align || 'right' }}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, ridx) => (
              <tr key={ridx} style={{ backgroundColor: ridx % 2 !== 0 ? el.props.alternateRowColor : undefined }}>
                {el.props.showRowNumber && (
                  <td className={`${borderClass} ${paddingClass} text-center`}>{ridx + 1}</td>
                )}
                {columns.map((col: any) => (
                  <td
                    key={col.id}
                    className={`${borderClass} ${paddingClass} ${wrapText ? '' : 'whitespace-nowrap'}`}
                    style={{ textAlign: col.align || 'right' }}
                  >
                    {toDisplay(getValue(row, col.key))}
                  </td>
                ))}
              </tr>
            ))}
            {totalsEnabled && (
              <tr className="bg-gray-50 font-bold">
                {el.props.showRowNumber && (
                  <td className={`${borderClass} ${paddingClass} text-center`}>Σ</td>
                )}
                {columns.map((col: any) => (
                  <td key={`${col.id}-total`} className={`${borderClass} ${paddingClass}`} style={{ textAlign: col.align || 'right' }}>
                    {totalFields.includes(col.key) ? toDisplay(totals[col.key] || 0) : '-'}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (['CHART_BAR', 'CHART_PIE', 'CHART_LINE', 'CHART_AREA', 'CHART_RADAR'].includes(el.type)) {
    const rows = getElementRows(el, record, dataBySource);
    const chartData = buildChartData(el, rows);
    const chartColor = el.props.chartColor || '#800020';
    const palette = (el.props.chartPalette || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    const chartColors = palette.length ? palette : [chartColor, '#2563eb', '#10b981', '#f97316', '#7c3aed', '#ef4444'];
    const pieLabelMode = el.props.pieLabelMode || 'none';

    return (
      <div style={style} className="p-2 flex flex-col">
        <div className="text-xs font-bold text-center mb-1">{el.props.titleProps?.text || 'نمودار'}</div>
        {chartData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400">داده‌ای برای نمودار موجود نیست</div>
        ) : (
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              {el.type === 'CHART_BAR' ? (
                <BarChart data={chartData}>
                  {el.props.showGrid !== false && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  {el.props.showTooltip !== false && <Tooltip />}
                  <Bar
                    dataKey="value"
                    fill={chartColors[0]}
                    radius={[el.props.barRadius || 4, el.props.barRadius || 4, 0, 0]}
                    stackId={el.props.stacked ? 'stack' : undefined}
                  >
                    <LabelList dataKey="value" position="top" fontSize={10} />
                  </Bar>
                  {el.props.showLegend && <Legend />}
                </BarChart>
              ) : el.type === 'CHART_PIE' ? (
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={el.props.innerRadius || 0}
                    outerRadius={60}
                    label={pieLabelMode === 'none' ? false : (entry: any) => pieLabelMode === 'percent' ? `${Math.round((entry.percent || 0) * 100)}%` : toDisplay(entry.value)}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`c-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  {el.props.showTooltip !== false && <Tooltip />}
                  {el.props.showLegend && <Legend />}
                </PieChart>
              ) : el.type === 'CHART_LINE' ? (
                <LineChart data={chartData}>
                  {el.props.showGrid !== false && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  {el.props.showTooltip !== false && <Tooltip />}
                  <Line type={el.props.lineType || 'monotone'} dataKey="value" stroke={chartColors[0]} strokeWidth={2} dot={el.props.showDots !== false} />
                  {el.props.showLegend && <Legend />}
                </LineChart>
              ) : el.type === 'CHART_AREA' ? (
                <AreaChart data={chartData}>
                  {el.props.showGrid !== false && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  {el.props.showTooltip !== false && <Tooltip />}
                  <Area
                    type={el.props.lineType || 'monotone'}
                    dataKey="value"
                    stroke={chartColors[0]}
                    fill={chartColors[0]}
                    fillOpacity={el.props.areaOpacity ?? 0.35}
                    stackId={el.props.stacked ? 'stack' : undefined}
                  />
                  {el.props.showLegend && <Legend />}
                </AreaChart>
              ) : (
                <RadarChart data={chartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis />
                  {el.props.showTooltip !== false && <Tooltip />}
                  <Radar dataKey="value" stroke={chartColors[0]} fill={chartColors[0]} fillOpacity={el.props.areaOpacity ?? 0.35} />
                  {el.props.showLegend && <Legend />}
                </RadarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
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
  const [dataBySource, setDataBySource] = useState<Record<string, any[]>>({});
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

  useEffect(() => {
    const loadDataSources = async () => {
      if (!template) return;
      const sources = Array.from(new Set(template.elements.map(el => el.props?.dataSource).filter(Boolean)));
      if (!sources.length) {
        setDataBySource({});
        return;
      }

      const entries = await Promise.all(
        sources.map(async (source) => {
          try {
            const { data } = await supabase.from(source as string).select('*').limit(500);
            return [source as string, data || []] as const;
          } catch {
            return [source as string, []] as const;
          }
        })
      );
      const mapped: Record<string, any[]> = {};
      entries.forEach(([k, v]) => (mapped[k] = v));
      setDataBySource(mapped);
    };
    loadDataSources();
  }, [template]);

  if (!inputRecord || !moduleId) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <p className="text-gray-500 mb-4">داده‌ای برای پیش‌نمایش قالب ارسال نشده است.</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
          بازگشت
        </button>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <p className="text-gray-500 mb-2">برای این ماژول هنوز قالبی ذخیره نشده است.</p>
        <p className="text-sm text-gray-400 mb-6">از مسیر تنظیمات سیستم → طراحی قالب گزارش، قالب این ماژول را ذخیره کنید.</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
          بازگشت
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-10 space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-3 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          بازگشت
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-red-900 flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          چاپ
        </button>
      </div>

      <div className="overflow-auto p-4 bg-gray-100 dark:bg-gray-900 rounded-xl">
        {loading && (
          <div className="mb-2 text-xs text-gray-500">در حال بازیابی داده‌های رکورد از دیتابیس...</div>
        )}
        <div className="mx-auto bg-white shadow relative" style={{ width: '210mm', height: '297mm' }}>
          {template.elements.map(el => (
            <TemplateElement key={el.id} el={el} record={record} dataBySource={dataBySource} orgLogo={orgLogo} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportTemplatePreview;

