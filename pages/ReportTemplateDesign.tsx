
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  LayoutTemplate, Save, Trash2, Settings, 
  Database, Plus, Type, Table as TableIcon, 
  BarChart as BarChartIcon, PieChart as PieChartIcon, 
  ImageIcon, Grid, ChevronLeft, AlignCenter, 
  AlignLeft, AlignRight, X, FileText, Monitor, Factory,
  Palette, Upload, Bold, Italic, Underline, LineChart as LineChartIcon, Sigma,
  ChevronUp, ChevronDown, Undo2, Redo2, Copy, Lock, Unlock, Download
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { supabase } from '../supabaseClient';
import { MENU_ITEMS } from '../constants';
import { generateId } from '../utils';
import {
  getAllReportTemplates,
  getActiveReportTemplateByModule,
  saveReportTemplate,
  setActiveTemplate,
  deleteTemplateVersion
} from '../services/reportTemplates';

// --- Types ---

type ElementType = 'HEADER' | 'TEXT' | 'TABLE' | 'CHART_BAR' | 'CHART_PIE' | 'CHART_LINE' | 'CHART_AREA' | 'CHART_RADAR' | 'STAT_CARD' | 'IMAGE';
type InteractionType =
  | 'move'
  | 'resize-br'
  | 'resize-bl'
  | 'resize-tr'
  | 'resize-tl'
  | 'resize-r'
  | 'resize-l'
  | 'resize-t'
  | 'resize-b';
type BandType = 'reportHeader' | 'pageHeader' | 'groupHeader' | 'detail' | 'groupFooter' | 'reportFooter' | 'pageFooter';
type DataSource =
  | 'work_orders'
  | 'shift_reports'
  | 'lab_reports'
  | 'warehouse_reports'
  | 'scale_reports'
  | 'hse_reports'
  | 'parts'
  | 'personnel';
type DividerStyle = 'solid' | 'dashed' | 'none';
type BorderStyle = 'NONE' | 'BOX' | 'TOP_BOTTOM' | 'BOTTOM';
type AggregationType = 'COUNT' | 'SUM' | 'AVG';

interface TextStyle {
  text?: string;
  fontFamily?: string; fontSize?: number; bold?: boolean; italic?: boolean; underline?: boolean; color?: string; align?: 'right' | 'center' | 'left';
  highlight?: boolean;
  backgroundColor?: string;
}
interface ElementLayout { x: number; y: number; width: number; height: number; }

interface HeaderDetails {
  items: { id: string; label: string; value: string }[];
  labelStyle?: TextStyle;
  valueStyle?: TextStyle;
  dividerStyle?: DividerStyle;
}

interface GoalProps { show?: boolean; value?: number; label?: string; color?: string; }

interface ReportElement {
  id: string; type: ElementType; layout: ElementLayout; band?: BandType;
  props: {
    // Data Binding
    dataSource?: DataSource; valueField?: string; labelField?: string;
    aggregation?: AggregationType;
    filterByField?: string;
    filterValueFromRecordField?: string;
    rowLimit?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    chartGroupBy?: string;
    
    // Element Specific Props with Text Styling
    titleProps?: TextStyle;
    subtitleProps?: TextStyle;
    textProps?: TextStyle;
    labelProps?: TextStyle;
    valueProps?: TextStyle;
    unitProps?: TextStyle;
    detailsProps?: HeaderDetails;
    goalProps?: GoalProps;
    divider?: 'NONE' | 'MIDDLE';

    // Generic Styling & Other Props
    logoType?: 'DEFAULT' | 'CUSTOM'; customLogo?: string;
    themeColor?: string;
    chartColor?: string;
    borderColor?: string; borderWidth?: number; backgroundColor?: string;
    borderStyle?: BorderStyle;
    locked?: boolean;

    // Table specific
    columns?: { id: string; key: string; header: string; align: 'right' | 'center' | 'left' }[];
    rows?: number;
    headerStyle?: TextStyle;
    rowStyle?: TextStyle;
    alternateRowColor?: string;
    showRowNumber?: boolean;
    showTableBorders?: boolean;
    compactRows?: boolean;
    wrapText?: boolean;
    totalFields?: string[];
    showTotalsRow?: boolean;

    // Chart specific
    showLegend?: boolean;
    showGrid?: boolean;
    showTooltip?: boolean;
    barRadius?: number;
    innerRadius?: number;
    lineType?: 'monotone' | 'linear';
    showDots?: boolean;
    stacked?: boolean;
    areaOpacity?: number;
    topN?: number;
    sortChartBy?: 'label' | 'value_desc' | 'value_asc';
    pieLabelMode?: 'none' | 'value' | 'percent';
    chartPalette?: string;
    imageFit?: 'contain' | 'cover' | 'fill';
    datasetId?: string;
    expression?: string;
    conditionalRules?: { leftField: string; operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains'; rightType: 'literal' | 'field' | 'expr'; rightValue: string }[];
    pageBreakBefore?: boolean;
    keepTogether?: boolean;
    subreportTemplateId?: string;
    layerIndex?: number;
  }; 
}

interface ReportTemplate {
  id: string;
  title: string;
  targetModule: string;
  elements: ReportElement[];
  datasets?: {
    id: string;
    source: string;
    alias?: string;
    joins?: { source: string; localField: string; foreignField: string; alias?: string }[];
    filters?: { field: string; operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains'; value: string; source?: 'record' | 'parameter' | 'literal' }[];
    sort?: { field: string; direction: 'asc' | 'desc' }[];
    groupBy?: { field: string; label?: string }[];
    aggregates?: { field: string; fn: 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT'; as: string }[];
    calculatedFields?: { key: string; expression: string }[];
    masterDatasetId?: string;
    relationField?: string;
  }[];
  parameters?: { id: string; key: string; label: string; type: 'text' | 'number' | 'date' | 'boolean' | 'select'; defaultValue?: any }[];
  pageSettings?: { size: 'A4' | 'A3' | 'Letter'; orientation: 'portrait' | 'landscape'; marginTop: number; marginRight: number; marginBottom: number; marginLeft: number; keepTogether?: boolean };
  governance?: { requiredRoles?: string[]; requiresApproval?: boolean; approvedBy?: string | null; approvedAt?: string | null };
}

// --- Mocks & Constants ---
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];
const MOCK_CHART_DATA = [ { name: 'A', value: 400 }, { name: 'B', value: 300 }, { name: 'C', value: 200 } ];
const AVAILABLE_FONTS = [
  { id: 'Vazirmatn', label: 'وزیرمتن (پیش‌فرض)' }, 
  { id: 'IRANSans', label: 'ایران سنس' },
  { id: 'Sahel', label: 'ساحل' },
  { id: 'Samim', label: 'صمیم' },
  { id: 'Tahoma', label: 'تاهوما' },
  { id: 'Arial', label: 'Arial' },
  { id: 'Times New Roman', label: 'Times New Roman' }
];
const THEME_COLORS = ['#800020', '#2c3e50', '#38bdf8', '#10b981', '#f97316', '#333333'];
const TABLE_COLUMNS: Record<DataSource, string[]> = {
    work_orders: ['id', 'tracking_code', 'requester_name', 'request_date', 'equipment_name', 'failure_description', 'status', 'downtime'],
    shift_reports: ['id', 'shift_date', 'shift_name', 'supervisor_name', 'total_production_a', 'total_production_b'],
    lab_reports: ['id', 'report_date', 'sample_code', 'fe_percent', 'feo_percent', 's_percent'],
    warehouse_reports: ['id', 'tracking_code', 'report_date', 'type', 'qty', 'receiver_name'],
    scale_reports: ['id', 'tracking_code', 'report_date', 'material', 'truck_no', 'net_weight', 'origin', 'destination'],
    hse_reports: ['id', 'tracking_code', 'date', 'type', 'description'],
    parts: ['id', 'code', 'name', 'current_stock', 'min_stock', 'unit_price'],
    personnel: ['id', 'full_name', 'unit', 'personnel_code'],
};
const reportsGroup = MENU_ITEMS.find(item => item.id === 'reports-group');
const REPORT_MODULES = reportsGroup?.submenu ? reportsGroup.submenu.map(item => ({
    id: item.id,
    label: item.title,
})) : [];
const BAND_OPTIONS: BandType[] = ['reportHeader', 'pageHeader', 'groupHeader', 'detail', 'groupFooter', 'reportFooter', 'pageFooter'];
const GOVERNANCE_ROLE_OPTIONS = ['factory_manager', 'production_manager', 'maintenance_manager', 'supervisor', 'admin'];


// --- Main Component ---
export const ReportTemplateDesign: React.FC = () => {
  const [mainTab, setMainTab] = useState<'DESIGN' | 'MANAGE'>('DESIGN');
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [template, setTemplate] = useState<ReportTemplate>({
    id: 'new',
    title: 'قالب گزارش تولید روزانه',
    targetModule: 'productionreport',
    elements: [{ 
      id: 'el-1', type: 'HEADER', 
      layout: { x: 20, y: 20, width: 720, height: 100 },
      band: 'reportHeader',
      props: { 
        titleProps: { text: 'شرکت توسعه معدنی و صنعتی صبانور', fontSize: 24, bold: true, color: '#800020', align: 'center' }, 
        subtitleProps: { text: 'گزارش شیفت تولید کارخانه کنسانتره همدان', fontSize: 16, color: '#333', align: 'center' },
        logoType: 'DEFAULT',
        detailsProps: {
            items: [
                { id: 'd1', label: 'کد رهگیری', value: '...' },
                { id: 'd2', label: 'تاریخ', value: '...' },
                { id: 'd3', label: 'شیفت', value: '...' }
            ],
            labelStyle: { fontSize: 10, color: '#555' },
            valueStyle: { fontSize: 10, color: '#111', bold: true },
            dividerStyle: 'dashed'
        },
        borderStyle: 'BOTTOM',
        borderColor: '#800020',
        borderWidth: 4,
      } 
    }],
    datasets: [],
    parameters: [],
    pageSettings: { size: 'A4', orientation: 'portrait', marginTop: 12, marginRight: 12, marginBottom: 12, marginLeft: 12, keepTogether: true },
    governance: { requiredRoles: [], requiresApproval: false, approvedAt: null, approvedBy: null }
  });
  const [selectedElementId, setSelectedElementId] = useState<string | null>('el-1');
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<{ type: InteractionType, elementId: string, startX: number, startY: number, startLayout: ElementLayout } | null>(null);
  const [historyPast, setHistoryPast] = useState<ReportTemplate[]>([]);
  const [historyFuture, setHistoryFuture] = useState<ReportTemplate[]>([]);
  const [showGridGuides, setShowGridGuides] = useState(true);
  const [enableSnap, setEnableSnap] = useState(true);
  const [showRuler, setShowRuler] = useState(false);
  const [showLayers, setShowLayers] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importTemplateInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const prevTemplateRef = useRef<ReportTemplate | null>(null);
  const skipHistoryRef = useRef(false);

  const selectedElement = template.elements.find(el => el.id === selectedElementId);
  const page = template.pageSettings || { size: 'A4', orientation: 'portrait', marginTop: 12, marginRight: 12, marginBottom: 12, marginLeft: 12, keepTogether: true };
  const pageSize = page.size === 'A3' ? { w: 297, h: 420 } : page.size === 'Letter' ? { w: 216, h: 279 } : { w: 210, h: 297 };
  const canvasWidthMm = page.orientation === 'landscape' ? pageSize.h : pageSize.w;
  const canvasHeightMm = page.orientation === 'landscape' ? pageSize.w : pageSize.h;

  useEffect(() => {
    if (!prevTemplateRef.current) {
      prevTemplateRef.current = template;
      return;
    }
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      prevTemplateRef.current = template;
      return;
    }
    setHistoryPast(prev => [...prev.slice(-39), prevTemplateRef.current!]);
    setHistoryFuture([]);
    prevTemplateRef.current = template;
  }, [template]);

  const refreshTemplates = () => setAllTemplates(getAllReportTemplates());

  const getModuleLabel = (moduleId: string) => {
    return REPORT_MODULES.find(m => m.id === moduleId)?.label || moduleId;
  };

  const createDefaultTemplateForModule = (moduleId: string): ReportTemplate => ({
    id: 'new',
    title: `قالب ${getModuleLabel(moduleId)}`,
    targetModule: moduleId,
    elements: [{
      id: 'el-1', type: 'HEADER',
      layout: { x: 20, y: 20, width: 720, height: 100 },
      band: 'reportHeader',
      props: {
        titleProps: { text: 'شرکت توسعه معدنی و صنعتی صبانور', fontSize: 24, bold: true, color: '#800020', align: 'center' },
        subtitleProps: { text: `${getModuleLabel(moduleId)}`, fontSize: 16, color: '#333', align: 'center' },
        logoType: 'DEFAULT',
        detailsProps: {
          items: [
            { id: 'd1', label: 'کد رهگیری', value: 'tracking_code' },
            { id: 'd2', label: 'تاریخ', value: 'shift_date' },
            { id: 'd3', label: 'شیفت', value: 'shift_name' }
          ],
          labelStyle: { fontSize: 10, color: '#555' },
          valueStyle: { fontSize: 10, color: '#111', bold: true },
          dividerStyle: 'dashed'
        },
        borderStyle: 'BOTTOM',
        borderColor: '#800020',
        borderWidth: 4,
      }
    }],
    datasets: [],
    parameters: [],
    pageSettings: { size: 'A4', orientation: 'portrait', marginTop: 12, marginRight: 12, marginBottom: 12, marginLeft: 12, keepTogether: true },
    governance: { requiredRoles: [], requiresApproval: false, approvedAt: null, approvedBy: null }
  });

  const loadTemplateForModule = (moduleId: string) => {
    const activeTemplate = getActiveReportTemplateByModule(moduleId);
    if (activeTemplate) {
      setTemplate(activeTemplate as any);
      setSelectedElementId(activeTemplate.elements?.[0]?.id || null);
      return;
    }

    const fallback = createDefaultTemplateForModule(moduleId);
    setTemplate(fallback);
    setSelectedElementId(fallback.elements?.[0]?.id || null);
  };

  useEffect(() => {
    const fetchOrgLogo = async () => {
      const { data } = await supabase.from('app_settings').select('org_logo').single();
      if (data?.org_logo) setOrgLogo(data.org_logo);
    };
    fetchOrgLogo();
  }, []);

  useEffect(() => {
    refreshTemplates();
    loadTemplateForModule('productionreport');
  }, []);

  // Keyboard Delete Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedElementId) {
        // Prevent deleting text inside input fields
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          return;
        }
        removeElement(selectedElementId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElementId, template.elements]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!interaction || !canvasRef.current) return;
      const dx = e.clientX - interaction.startX;
      const dy = e.clientY - interaction.startY;
      const { startLayout } = interaction;
      let newLayout = { ...startLayout };

      if (interaction.type === 'move') {
        newLayout.x = Math.max(0, startLayout.x + dx);
        newLayout.y = Math.max(0, startLayout.y + dy);
      } else {
        if (interaction.type.includes('r')) newLayout.width = Math.max(50, startLayout.width + dx);
        if (interaction.type.includes('l')) { newLayout.width = Math.max(50, startLayout.width - dx); newLayout.x = startLayout.x + dx; }
        if (interaction.type.includes('b')) newLayout.height = Math.max(30, startLayout.height + dy);
        if (interaction.type.includes('t')) { newLayout.height = Math.max(30, startLayout.height - dy); newLayout.y = startLayout.y + dy; }
      }
      if (enableSnap) {
        newLayout.x = Math.round(newLayout.x / 8) * 8;
        newLayout.y = Math.round(newLayout.y / 8) * 8;
        newLayout.width = Math.round(newLayout.width / 4) * 4;
        newLayout.height = Math.round(newLayout.height / 4) * 4;
      }
      updateElement(interaction.elementId, newLayout, 'layout');
    };
    const handleMouseUp = () => setInteraction(null);

    if (interaction) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp, { once: true });
    }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [interaction, enableSnap]);

  const startInteraction = (e: React.MouseEvent, type: InteractionType, element: ReportElement) => {
    e.preventDefault(); e.stopPropagation();
    if (element.props.locked) return;
    setSelectedElementId(element.id);
    setInteraction({ type, elementId: element.id, startX: e.clientX, startY: e.clientY, startLayout: element.layout });
  };

  const addElement = (type: ElementType) => {
    const newId = Math.random().toString(36).substr(2, 9);
    let defaultProps: Partial<ReportElement['props']> = { borderColor: '#cccccc', borderWidth: 0 };
    let layout = { x: 50, y: 150, width: 400, height: 150 };

    switch (type) {
      case 'TEXT': defaultProps = { ...defaultProps, textProps: { text: 'متن نمونه...', fontSize: 14, align: 'right' }}; layout.height = 50; break;
      case 'STAT_CARD': defaultProps = { ...defaultProps, labelProps: { text: 'تولید کل', fontSize: 11, color: '#555', highlight: false }, valueProps: { text: '2,500', fontSize: 24, bold: true }, unitProps: { text: 'تن', fontSize: 11 }, themeColor: '#2563eb', goalProps: { show: true, value: 3000, label: 'هدف', color: '#10b981' }, divider: 'NONE', aggregation: 'COUNT' }; layout.width=180; layout.height=100; break;
      case 'CHART_BAR':
      case 'CHART_PIE':
      case 'CHART_LINE':
      case 'CHART_AREA':
      case 'CHART_RADAR':
        defaultProps = {
            ...defaultProps,
            titleProps: { text: 'نمودار', align: 'center', fontSize: 12, bold: true },
            chartColor: '#800020',
            chartPalette: '#800020,#2563eb,#10b981,#f97316,#7c3aed',
            showLegend: true,
            showGrid: true,
            showTooltip: true,
            barRadius: 4,
            innerRadius: 30,
            lineType: 'monotone',
            showDots: true,
            stacked: false,
            areaOpacity: 0.35,
            topN: 20,
            sortChartBy: 'value_desc',
            pieLabelMode: 'none'
        };
        layout.height=250;
        break;
      case 'TABLE':
        const defaultTableCols = TABLE_COLUMNS['work_orders'].slice(0, 4).map(key => ({ id: generateId(), key, header: key, align: 'right' as const }));
        defaultProps = { 
            ...defaultProps, 
            dataSource: 'work_orders',
            columns: defaultTableCols,
            rows: 4,
            headerStyle: { bold: true, color: '#333', backgroundColor: '#f3f4f6' },
            rowStyle: { color: '#555' },
            alternateRowColor: '#fafafa',
            showRowNumber: true,
        }; 
        layout.height = 250; 
        break;
      case 'IMAGE':
        defaultProps = { ...defaultProps, customLogo: '', imageFit: 'contain', backgroundColor: '#ffffff' };
        layout = { x: 60, y: 180, width: 220, height: 160 };
        break;
    }
    setTemplate(prev => ({ ...prev, elements: [...prev.elements, { id: newId, type, layout, props: defaultProps as ReportElement['props'] }] }));
    setSelectedElementId(newId);
  };
  
  const removeElement = (id: string) => {
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id)
    }));
    setSelectedElementId(null);
  };
  
  const updateElement = (id: string, updates: any, target: 'props' | 'layout' = 'props') => {
    setTemplate(prev => ({ ...prev, elements: prev.elements.map(el => {
      if (el.id !== id) return el;
      if (target === 'props') return { ...el, props: { ...el.props, ...updates } };
      return { ...el, layout: { ...el.layout, ...updates } };
    })}));
  };
  
  const updateNestedProps = (path: string, value: any) => {
      if (!selectedElement) return;

      setTemplate(prev => {
          const newElements = prev.elements.map(el => {
              if (el.id !== selectedElement.id) return el;

              const newProps = JSON.parse(JSON.stringify(el.props));
              const pathParts = path.split('.');
              let current = newProps;
              
              for (let i = 0; i < pathParts.length - 1; i++) {
                  if (current[pathParts[i]] === undefined) current[pathParts[i]] = {};
                  current = current[pathParts[i]];
              }
              current[pathParts[pathParts.length - 1]] = value;
              return { ...el, props: newProps };
          });
          return { ...prev, elements: newElements };
      });
  };

  const handleSaveTemplate = () => {
    const saved = saveReportTemplate({
      id: '',
      title: template.title,
      targetModule: template.targetModule,
      elements: template.elements
    } as any, { activate: true });

    setTemplate(saved as any);
    setSelectedElementId(saved.elements?.[0]?.id || null);
    refreshTemplates();
    alert(`قالب ذخیره شد. نسخه ${saved.version} فعال شد.`);
  };

  const handleUndo = () => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    skipHistoryRef.current = true;
    setHistoryPast(prev => prev.slice(0, -1));
    setHistoryFuture(prev => [template, ...prev].slice(0, 40));
    setTemplate(previous);
    setSelectedElementId(previous.elements?.[0]?.id || null);
  };

  const handleRedo = () => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    skipHistoryRef.current = true;
    setHistoryFuture(prev => prev.slice(1));
    setHistoryPast(prev => [...prev.slice(-39), template]);
    setTemplate(next);
    setSelectedElementId(next.elements?.[0]?.id || null);
  };

  const handleDuplicateSelected = () => {
    if (!selectedElement) return;
    const duplicated: ReportElement = {
      ...JSON.parse(JSON.stringify(selectedElement)),
      id: generateId(),
      layout: {
        ...selectedElement.layout,
        x: selectedElement.layout.x + 12,
        y: selectedElement.layout.y + 12,
      }
    };
    setTemplate(prev => ({ ...prev, elements: [...prev.elements, duplicated] }));
    setSelectedElementId(duplicated.id);
  };

  const handleToggleLockSelected = () => {
    if (!selectedElement) return;
    updateElement(selectedElement.id, { locked: !selectedElement.props.locked });
  };

  const alignSelected = (mode: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom') => {
    if (!selectedElement) return;
    const pageWidth = 794;
    const pageHeight = 1123;
    const l = selectedElement.layout;
    let x = l.x;
    let y = l.y;
    if (mode === 'left') x = 0;
    if (mode === 'center-x') x = Math.max(0, Math.round((pageWidth - l.width) / 2));
    if (mode === 'right') x = Math.max(0, pageWidth - l.width);
    if (mode === 'top') y = 0;
    if (mode === 'center-y') y = Math.max(0, Math.round((pageHeight - l.height) / 2));
    if (mode === 'bottom') y = Math.max(0, pageHeight - l.height);
    updateElement(selectedElement.id, { x, y }, 'layout');
  };

  const exportTemplateAsJson = () => {
    const payload = JSON.stringify(template, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${template.targetModule}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportTemplateJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (!parsed || !Array.isArray(parsed.elements)) {
          alert('ساختار فایل قالب معتبر نیست.');
          return;
        }
        const imported: ReportTemplate = {
          ...parsed,
          id: `import-${Date.now()}`,
          targetModule: template.targetModule || parsed.targetModule || 'productionreport',
        };
        skipHistoryRef.current = true;
        setTemplate(imported);
        setSelectedElementId(imported.elements?.[0]?.id || null);
        alert('قالب با موفقیت ایمپورت شد. در صورت نیاز، ذخیره نسخه جدید را بزنید.');
      } catch {
        alert('خطا در خواندن فایل JSON قالب.');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleActivateTemplate = (templateId: string, moduleId: string) => {
    setActiveTemplate(templateId);
    refreshTemplates();
    if (template.targetModule === moduleId) {
      loadTemplateForModule(moduleId);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (!window.confirm('این نسخه حذف شود؟')) return;
    deleteTemplateVersion(templateId);
    refreshTemplates();
    if (template.id === templateId) {
      loadTemplateForModule(template.targetModule);
    }
  };

  const groupedTemplates = useMemo(() => {
    return REPORT_MODULES.map(m => ({
      moduleId: m.id,
      moduleLabel: m.label,
      items: allTemplates
        .filter(t => t.targetModule === m.id)
        .sort((a, b) => (b.version || 0) - (a.version || 0))
    }));
  }, [allTemplates]);
  
  const handleReorderDetail = (index: number, direction: 'UP' | 'DOWN') => {
    if (!selectedElement || !selectedElement.props.detailsProps) return;

    const items = [...selectedElement.props.detailsProps.items];
    const itemToMove = items[index];
    const swapIndex = direction === 'UP' ? index - 1 : index + 1;

    if (swapIndex < 0 || swapIndex >= items.length) return;

    // Swap elements
    items[index] = items[swapIndex];
    items[swapIndex] = itemToMove;

    updateNestedProps('detailsProps', { ...selectedElement.props.detailsProps, items });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedElement) {
        if (file.size > 512 * 1024) { // 512KB limit
            alert('حجم فایل نباید بیشتر از 512 کیلوبایت باشد.');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => updateElement(selectedElement.id, { customLogo: reader.result as string, logoType: 'CUSTOM' });
        reader.readAsDataURL(file);
    }
  };

  const addDataset = () => {
    const dsId = `ds_${generateId()}`;
    const firstSource: DataSource = 'work_orders';
    setTemplate(prev => ({
      ...prev,
      datasets: [...(prev.datasets || []), { id: dsId, source: firstSource, alias: dsId, joins: [], filters: [], sort: [], groupBy: [], aggregates: [], calculatedFields: [] }],
    }));
  };

  const updateDataset = (id: string, updates: any) => {
    setTemplate(prev => ({
      ...prev,
      datasets: (prev.datasets || []).map(ds => (ds.id === id ? { ...ds, ...updates } : ds)),
    }));
  };

  const removeDataset = (id: string) => {
    setTemplate(prev => ({
      ...prev,
      datasets: (prev.datasets || []).filter(ds => ds.id !== id),
    }));
  };

  const addRuntimeParameter = () => {
    setTemplate(prev => ({
      ...prev,
      parameters: [...(prev.parameters || []), { id: generateId(), key: `param_${(prev.parameters || []).length + 1}`, label: 'پارامتر جدید', type: 'text', defaultValue: '' }],
    }));
  };

  const updateRuntimeParameter = (id: string, updates: any) => {
    setTemplate(prev => ({
      ...prev,
      parameters: (prev.parameters || []).map(p => (p.id === id ? { ...p, ...updates } : p)),
    }));
  };

  const removeRuntimeParameter = (id: string) => {
    setTemplate(prev => ({
      ...prev,
      parameters: (prev.parameters || []).filter(p => p.id !== id),
    }));
  };

  // --- RENDERERS ---

  const textStyleToProps = (style?: TextStyle): React.CSSProperties => {
    const cssProps: React.CSSProperties = {
      fontFamily: style?.fontFamily || 'Vazirmatn',
      fontSize: style?.fontSize,
      fontWeight: style?.bold ? 'bold' : 'normal',
      fontStyle: style?.italic ? 'italic' : 'normal',
      textDecoration: style?.underline ? 'underline' : 'none',
      color: style?.color,
      textAlign: style?.align,
      backgroundColor: style?.backgroundColor
    };
    
    if (style?.backgroundColor && style.backgroundColor !== 'transparent') {
        cssProps.padding = '2px 6px';
        cssProps.borderRadius = '4px';
        cssProps.display = 'inline-block';
    }
    
    return cssProps;
  };

  const renderWidgetContent = (el: ReportElement) => {
    const style: React.CSSProperties = {
        backgroundColor: el.props.backgroundColor,
        overflow: 'hidden'
    };

    const borderWidth = el.props.borderWidth || 0;
    const borderColor = el.props.borderColor || 'transparent';
    const borderString = `${borderWidth}px solid ${borderColor}`;

    if (el.type === 'HEADER') {
        const borderStyle = el.props.borderStyle || 'NONE';
        
        if (borderWidth > 0) {
            switch(borderStyle) {
                case 'BOX':
                    style.border = borderString;
                    style.borderRadius = '8px';
                    break;
                case 'TOP_BOTTOM':
                    style.borderTop = borderString;
                    style.borderBottom = borderString;
                    break;
                case 'BOTTOM':
                    style.borderBottom = borderString;
                    break;
                case 'NONE':
                default:
                    // no border
                    break;
            }
        }
    } else {
        style.borderRadius = '8px';
        if (borderWidth > 0) {
            style.border = borderString;
        }
    }

    const Content = () => {
        switch (el.type) {
        case 'HEADER':
            const details = el.props.detailsProps;
            return (
              <div className="flex items-center justify-between w-full h-full p-4">
                <div className="w-16 h-16 flex items-center justify-center overflow-hidden">
                   {
                     (() => {
                        if (el.props.logoType === 'CUSTOM') {
                           return el.props.customLogo 
                               ? <img src={el.props.customLogo} alt="Custom Logo" className="w-full h-full object-contain" />
                               : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-400 text-center leading-tight">بارگذاری لوگو</div>;
                        }
                        return orgLogo 
                           ? <img src={orgLogo} alt="Default Logo" className="w-full h-full object-contain" />
                           : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-400">LOGO</div>;
                     })()
                   }
                </div>
                <div className="text-center flex-1">
                  <h1 style={textStyleToProps(el.props.titleProps)}>{el.props.titleProps?.text}</h1>
                  <h2 style={textStyleToProps(el.props.subtitleProps)}>{el.props.subtitleProps?.text}</h2>
                </div>
                <div className="w-32 text-right space-y-1 opacity-70">
                   {details?.items.map((item, index) => (
                       <div key={item.id} className={`flex justify-between items-center ${details.dividerStyle !== 'none' && index < details.items.length-1 ? 'border-b' : ''}`} style={{ borderStyle: details.dividerStyle as any }}>
                           <span style={textStyleToProps(details.labelStyle)}>{item.label}:</span>
                           <span style={textStyleToProps(details.valueStyle)}>{item.value}</span>
                       </div>
                   ))}
                </div>
              </div>
            );
        case 'TEXT':
            return <div className="p-2 w-full h-full" style={textStyleToProps(el.props.textProps)}>{el.props.textProps?.text}</div>;
        case 'STAT_CARD':
            const goalProps = el.props.goalProps;
            const valueNum = parseFloat(String(el.props.valueProps?.text || '0').replace(/,/g, ''));
            const goalNum = goalProps?.value || 0;
            const progress = goalNum > 0 ? Math.min((valueNum / goalNum) * 100, 100) : 0;
            const labelStyle = textStyleToProps(el.props.labelProps);
            if (el.props.labelProps?.highlight) {
                labelStyle.backgroundColor = `${el.props.themeColor}33`; // ~20% opacity
                labelStyle.borderRadius = '6px';
                labelStyle.padding = '2px 6px';
                labelStyle.display = 'inline-block';
            }
            const displayValue = (el.props.dataSource && el.props.valueField) 
                ? `[${el.props.aggregation || 'COUNT'}(${el.props.valueField})]`
                : el.props.valueProps?.text;

            return <div className="p-3 text-center h-full flex flex-col justify-between" style={{ backgroundColor: `${el.props.themeColor}1A`, borderColor: `${el.props.themeColor}30`, borderWidth: 1, borderRadius: 'inherit' }}>
                <div>
                  <span className="block mb-1" style={labelStyle}>{el.props.labelProps?.text}</span>
                  {el.props.divider === 'MIDDLE' && <div className="my-2 border-t" style={{ borderColor: `${el.props.themeColor}4D` }}></div>}
                  <span className="block" style={textStyleToProps(el.props.valueProps)}>{displayValue} <small style={textStyleToProps(el.props.unitProps)}>{el.props.unitProps?.text}</small></span>
                </div>
                {goalProps?.show && <div className="mt-2 text-xs">
                    <div className="flex justify-between text-gray-500 mb-1">
                      <span>{goalProps.label}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: goalProps.color || '#10b981' }}></div>
                    </div>
                </div>}
            </div>;
        case 'TABLE':
            const { columns, headerStyle, rowStyle, alternateRowColor, showRowNumber, rows } = el.props;
            const headerBg = headerStyle?.backgroundColor || '#f3f4f6';
            const headerCss = textStyleToProps(headerStyle);
            delete headerCss.backgroundColor;

            return (
                <div className="w-full h-full p-2 overflow-auto">
                    <table className="w-full border-collapse text-xs">
                        <thead>
                            <tr style={{ backgroundColor: headerBg }}>
                                {showRowNumber && <th style={headerCss} className="p-2 border">#</th>}
                                {columns?.map(col => (
                                    <th key={col.id} style={{ ...headerCss, textAlign: col.align }} className="p-2 border">{col.header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: rows || 3 }).map((_, rIdx) => (
                                <tr key={rIdx} style={{ backgroundColor: rIdx % 2 !== 0 ? alternateRowColor : rowStyle?.backgroundColor }}>
                                    {showRowNumber && <td style={textStyleToProps(rowStyle)} className="p-2 border text-center">{rIdx + 1}</td>}
                                    {columns?.map(col => (
                                        <td key={col.id} style={{ ...textStyleToProps(rowStyle), textAlign: col.align }} className="p-2 border text-gray-400">
                                            داده نمونه
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        case 'IMAGE':
            return (
              <div className="w-full h-full p-1 flex items-center justify-center bg-gray-50">
                {el.props.customLogo ? (
                  <img
                    src={el.props.customLogo}
                    alt="Template"
                    className="w-full h-full"
                    style={{ objectFit: el.props.imageFit || 'contain' }}
                  />
                ) : (
                  <div className="text-xs text-gray-400 text-center">
                    <ImageIcon className="w-5 h-5 mx-auto mb-1" />
                    تصویر انتخاب نشده
                  </div>
                )}
              </div>
            );
        case 'CHART_BAR':
        case 'CHART_PIE':
        case 'CHART_LINE':
        case 'CHART_AREA':
        case 'CHART_RADAR':
            const chartPalette = (el.props.chartPalette || '')
              .split(',')
              .map(s => s.trim())
              .filter(Boolean);
            const chartColors = chartPalette.length ? chartPalette : [el.props.chartColor || '#800020', '#2563eb', '#10b981', '#f97316'];
            return <div className="w-full h-full p-2 flex flex-col"><h4 className="text-center mb-1 shrink-0" style={textStyleToProps(el.props.titleProps)}>{el.props.titleProps?.text}</h4>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  {el.type === 'CHART_BAR' ? <BarChart data={MOCK_CHART_DATA} margin={{top:5,right:5,left:-20,bottom: el.props.showLegend ? 20 : 0}}>
                      {el.props.showGrid !== false && <CartesianGrid strokeDasharray="3 3" vertical={false}/>}
                      <XAxis dataKey="name" fontSize={10}/>
                      <YAxis fontSize={10}/>
                      {el.props.showTooltip !== false && <RechartsTooltip />}
                      <Bar dataKey="value" fill={chartColors[0]} radius={[el.props.barRadius || 0, el.props.barRadius || 0, 0, 0]}/>
                    </BarChart> :
                   el.type === 'CHART_PIE' ? <PieChart margin={{bottom: el.props.showLegend ? 20 : 0}}>
                      <Pie data={MOCK_CHART_DATA} cx="50%" cy="50%" innerRadius={el.props.innerRadius || 0} outerRadius={60} fill={chartColors[0]} paddingAngle={5} dataKey="value">
                        {MOCK_CHART_DATA.map((_, idx) => <Cell key={idx} fill={chartColors[idx % chartColors.length]} />)}
                      </Pie>
                      {el.props.showTooltip !== false && <RechartsTooltip />}
                    </PieChart> :
                   el.type === 'CHART_LINE' ? <LineChart data={MOCK_CHART_DATA} margin={{top:5,right:5,left:-20,bottom: el.props.showLegend ? 20 : 0}}>
                      {el.props.showGrid !== false && <CartesianGrid strokeDasharray="3 3" />}
                      <XAxis dataKey="name" fontSize={10}/>
                      <YAxis fontSize={10}/>
                      {el.props.showTooltip !== false && <RechartsTooltip />}
                      <Line type={el.props.lineType || 'monotone'} dataKey="value" stroke={chartColors[0]} strokeWidth={2} dot={el.props.showDots}/>
                    </LineChart> :
                   el.type === 'CHART_AREA' ? <AreaChart data={MOCK_CHART_DATA} margin={{top:5,right:5,left:-20,bottom: el.props.showLegend ? 20 : 0}}>
                      {el.props.showGrid !== false && <CartesianGrid strokeDasharray="3 3" />}
                      <XAxis dataKey="name" fontSize={10}/>
                      <YAxis fontSize={10}/>
                      {el.props.showTooltip !== false && <RechartsTooltip />}
                      <Area type={el.props.lineType || 'monotone'} dataKey="value" stroke={chartColors[0]} fill={chartColors[0]} fillOpacity={el.props.areaOpacity ?? 0.35} />
                    </AreaChart> :
                   <RadarChart data={MOCK_CHART_DATA}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" />
                      <PolarRadiusAxis />
                      {el.props.showTooltip !== false && <RechartsTooltip />}
                      <Radar dataKey="value" stroke={chartColors[0]} fill={chartColors[0]} fillOpacity={el.props.areaOpacity ?? 0.35} />
                    </RadarChart>
                  }
                </ResponsiveContainer>
              </div>
              {el.props.showLegend && <Legend wrapperStyle={{fontSize: "10px", direction: "ltr"}} />}
            </div>;
        default: return null;
        }
    };
    return <div style={style} className="w-full h-full">{Content()}</div>
  };

  const renderTemplateSettings = () => {
    return (
      <div className="space-y-4 border-b pb-4 mb-4">
        <div className="space-y-2">
          <h4 className="font-bold text-xs text-gray-500 uppercase">Data Model / Dataset Builder</h4>
          <button onClick={addDataset} className="w-full text-xs py-1.5 rounded bg-blue-50 text-blue-700">+ Dataset جدید</button>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(template.datasets || []).map(ds => (
              <div key={ds.id} className="border rounded p-2 space-y-2 bg-gray-50">
                <div className="flex items-center gap-2">
                  <input className="flex-1 p-1 border rounded text-xs ltr text-left" value={ds.id} onChange={e => updateDataset(ds.id, { id: e.target.value })} />
                  <button onClick={() => removeDataset(ds.id)} className="text-xs text-red-600">حذف</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select className="p-1 border rounded text-xs" value={ds.source} onChange={e => updateDataset(ds.id, { source: e.target.value })}>
                    {Object.keys(TABLE_COLUMNS).map(src => <option key={src} value={src}>{src}</option>)}
                  </select>
                  <input className="p-1 border rounded text-xs ltr text-left" placeholder="alias" value={ds.alias || ''} onChange={e => updateDataset(ds.id, { alias: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input className="p-1 border rounded text-xs ltr text-left" placeholder="masterDatasetId" value={ds.masterDatasetId || ''} onChange={e => updateDataset(ds.id, { masterDatasetId: e.target.value || undefined })} />
                  <input className="p-1 border rounded text-xs ltr text-left" placeholder="relationField" value={ds.relationField || ''} onChange={e => updateDataset(ds.id, { relationField: e.target.value || undefined })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input className="p-1 border rounded text-xs ltr text-left" placeholder="Group field" value={ds.groupBy?.[0]?.field || ''} onChange={e => updateDataset(ds.id, { groupBy: e.target.value ? [{ field: e.target.value }] : [] })} />
                  <input className="p-1 border rounded text-xs ltr text-left" placeholder="Sort field" value={ds.sort?.[0]?.field || ''} onChange={e => updateDataset(ds.id, { sort: e.target.value ? [{ field: e.target.value, direction: ds.sort?.[0]?.direction || 'desc' }] : [] })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select className="p-1 border rounded text-xs" value={ds.sort?.[0]?.direction || 'desc'} onChange={e => updateDataset(ds.id, { sort: ds.sort?.[0]?.field ? [{ field: ds.sort[0].field, direction: e.target.value as 'asc' | 'desc' }] : [] })}>
                    <option value="desc">Sort Desc</option>
                    <option value="asc">Sort Asc</option>
                  </select>
                  <input className="p-1 border rounded text-xs ltr text-left" placeholder="Calculated: KPI = expr" value={ds.calculatedFields?.[0] ? `${ds.calculatedFields[0].key}=${ds.calculatedFields[0].expression}` : ''} onChange={e => {
                    const raw = e.target.value;
                    const [key, ...rest] = raw.split('=');
                    updateDataset(ds.id, { calculatedFields: key && rest.length ? [{ key: key.trim(), expression: rest.join('=').trim() }] : [] });
                  }} />
                </div>
              </div>
            ))}
            {!(template.datasets || []).length && <div className="text-[11px] text-gray-400 text-center py-2">دیتاستی تعریف نشده است.</div>}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-bold text-xs text-gray-500 uppercase">Runtime Parameters</h4>
          <button onClick={addRuntimeParameter} className="w-full text-xs py-1.5 rounded bg-emerald-50 text-emerald-700">+ پارامتر جدید</button>
          <div className="space-y-1 max-h-44 overflow-y-auto">
            {(template.parameters || []).map(p => (
              <div key={p.id} className="grid grid-cols-12 gap-1">
                <input className="col-span-3 p-1 border rounded text-xs ltr text-left" value={p.key} onChange={e => updateRuntimeParameter(p.id, { key: e.target.value })} />
                <input className="col-span-4 p-1 border rounded text-xs" value={p.label} onChange={e => updateRuntimeParameter(p.id, { label: e.target.value })} />
                <select className="col-span-3 p-1 border rounded text-xs" value={p.type} onChange={e => updateRuntimeParameter(p.id, { type: e.target.value })}>
                  <option value="text">text</option><option value="number">number</option><option value="date">date</option><option value="boolean">boolean</option><option value="select">select</option>
                </select>
                <button className="col-span-2 text-xs text-red-600" onClick={() => removeRuntimeParameter(p.id)}>حذف</button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-bold text-xs text-gray-500 uppercase">Page Settings</h4>
          <div className="grid grid-cols-2 gap-2">
            <select className="p-1 border rounded text-xs" value={template.pageSettings?.size || 'A4'} onChange={e => setTemplate(prev => ({ ...prev, pageSettings: { ...(prev.pageSettings as any), size: e.target.value as any } }))}>
              <option value="A4">A4</option><option value="A3">A3</option><option value="Letter">Letter</option>
            </select>
            <select className="p-1 border rounded text-xs" value={template.pageSettings?.orientation || 'portrait'} onChange={e => setTemplate(prev => ({ ...prev, pageSettings: { ...(prev.pageSettings as any), orientation: e.target.value as any } }))}>
              <option value="portrait">Portrait</option><option value="landscape">Landscape</option>
            </select>
            {(['marginTop', 'marginRight', 'marginBottom', 'marginLeft'] as const).map(key => (
              <input key={key} className="p-1 border rounded text-xs" type="number" value={(template.pageSettings as any)?.[key] ?? 12} onChange={e => setTemplate(prev => ({ ...prev, pageSettings: { ...(prev.pageSettings as any), [key]: Number(e.target.value) || 0 } }))} placeholder={key} />
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={template.pageSettings?.keepTogether !== false} onChange={e => setTemplate(prev => ({ ...prev, pageSettings: { ...(prev.pageSettings as any), keepTogether: e.target.checked } }))} />
            Keep Together (چاپ پیوسته)
          </label>
        </div>

        <div className="space-y-2">
          <h4 className="font-bold text-xs text-gray-500 uppercase">Governance</h4>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={!!template.governance?.requiresApproval} onChange={e => setTemplate(prev => ({ ...prev, governance: { ...(prev.governance || {}), requiresApproval: e.target.checked } }))} />
            نیاز به تایید قبل از اجرا
          </label>
          <div className="grid grid-cols-2 gap-1">
            {GOVERNANCE_ROLE_OPTIONS.map(role => (
              <label key={role} className="text-[11px] flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={(template.governance?.requiredRoles || []).includes(role)}
                  onChange={e => {
                    const curr = template.governance?.requiredRoles || [];
                    const next = e.target.checked ? [...new Set([...curr, role])] : curr.filter(r => r !== role);
                    setTemplate(prev => ({ ...prev, governance: { ...(prev.governance || {}), requiredRoles: next } }));
                  }}
                />
                {role}
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  const renderProperties = () => {
    if (!selectedElement) return <div className="text-gray-400 text-center text-sm mt-10">یک المان را برای ویرایش انتخاب کنید.</div>;
    const el = selectedElement;

    const TextStyleEditor = ({ path, label, disableText = false }: {path: string, label: string, disableText?: boolean}) => {
      const propGroup = path.split('.').reduce((o, i) => o?.[i], el.props) || {};
      const [localText, setLocalText] = useState(propGroup.text || '');

      useEffect(() => {
        setLocalText(propGroup.text || '');
      }, [propGroup.text]);

      return <div className="space-y-2 border p-2 rounded-lg bg-gray-50/50 dark:bg-gray-700/20">
          <h5 className="text-[10px] font-bold text-gray-400">{label}</h5>
          { propGroup.text !== undefined && !disableText && <input 
            type="text" 
            placeholder="متن..." 
            className="w-full p-1 border rounded text-xs" 
            value={localText} 
            onChange={e => setLocalText(e.target.value)}
            onBlur={() => updateNestedProps(path + '.text', localText)}
          /> }
          <div className="grid grid-cols-2 gap-2">
            <select className="w-full p-1 border rounded text-xs" value={propGroup.fontFamily || 'Vazirmatn'} onChange={e => updateNestedProps(path + '.fontFamily', e.target.value)}>{AVAILABLE_FONTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
            <select className="w-full p-1 border rounded text-xs" value={propGroup.fontSize || 14} onChange={e => updateNestedProps(path + '.fontSize', parseInt(e.target.value))}>{FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}</select>
          </div>
          
          <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                  <label className="w-20 text-xs text-gray-500">رنگ متن</label>
                  <input type="color" value={propGroup.color || '#000000'} onChange={e => updateNestedProps(path + '.color', e.target.value)} className="w-8 h-8 p-0 border-0 rounded cursor-pointer"/>
              </div>
              <div className="flex items-center gap-2">
                  <label className="w-20 text-xs text-gray-500">رنگ پس‌زمینه</label>
                  <input 
                      type="color" 
                      value={(propGroup.backgroundColor && propGroup.backgroundColor !== 'transparent') ? propGroup.backgroundColor : '#ffffff'}
                      onChange={e => updateNestedProps(path + '.backgroundColor', e.target.value)} 
                      className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                  />
                  <button 
                      type="button"
                      onClick={() => updateNestedProps(path + '.backgroundColor', 'transparent')}
                      className={`p-1 rounded border-2 transition-colors ${(!propGroup.backgroundColor || propGroup.backgroundColor === 'transparent') ? 'border-primary' : 'border-transparent'}`}
                      title="بدون پس‌زمینه"
                  >
                      <div className="w-5 h-5 bg-white border border-gray-300 rounded relative overflow-hidden">
                          <div className="absolute w-full h-0.5 bg-red-500 transform rotate-45 top-1/2 left-0 -translate-y-1/2"></div>
                      </div>
                  </button>
              </div>
          </div>
          <div className="mt-2">
              <label className="text-[10px] text-gray-400">رنگ‌های پیشنهادی (برای متن)</label>
              <div className="grid grid-cols-6 gap-1 flex-1 mt-1">
                  {THEME_COLORS.map(c => <button key={c} type="button" onClick={() => updateNestedProps(path + '.color', c)} className="w-5 h-5 rounded-full border border-gray-300" style={{backgroundColor: c}} title={`تنظیم رنگ متن به ${c}`} />)}
              </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="flex-1 flex bg-gray-200 dark:bg-gray-600 rounded p-0.5">
              <button type="button" onClick={() => updateNestedProps(path + '.bold', !propGroup.bold)} className={`flex-1 p-1 rounded ${propGroup.bold ? 'bg-white dark:bg-gray-500 shadow' : ''}`}><Bold className="w-4 h-4 mx-auto"/></button>
              <button type="button" onClick={() => updateNestedProps(path + '.italic', !propGroup.italic)} className={`flex-1 p-1 rounded ${propGroup.italic ? 'bg-white dark:bg-gray-500 shadow' : ''}`}><Italic className="w-4 h-4 mx-auto"/></button>
              <button type="button" onClick={() => updateNestedProps(path + '.underline', !propGroup.underline)} className={`flex-1 p-1 rounded ${propGroup.underline ? 'bg-white dark:bg-gray-500 shadow' : ''}`}><Underline className="w-4 h-4 mx-auto"/></button>
            </div>
            <div className="flex bg-gray-200 dark:bg-gray-600 rounded p-0.5">
              {(['right', 'center', 'left'] as const).map(align => <button key={align} type="button" onClick={() => updateNestedProps(path + '.align', align)} className={`p-1 rounded ${propGroup.align === align ? 'bg-white dark:bg-gray-500 shadow' : ''}`}>{align === 'right' ? <AlignRight className="w-4 h-4"/> : align === 'center' ? <AlignCenter className="w-4 h-4"/> : <AlignLeft className="w-4 h-4"/>}</button>)}
            </div>
          </div>
        </div>
    };

    const handleColumnToggle = (key: string, isSelected: boolean) => {
        let newCols;
        if (isSelected) {
            newCols = [...(el.props.columns || []), { id: generateId(), key, header: key, align: 'right' as const }];
        } else {
            newCols = el.props.columns?.filter(c => c.key !== key);
        }
        updateElement(el.id, { columns: newCols });
    };

    const updateColumnConfig = (key: string, newConfig: Partial<{ header: string; align: 'right' | 'center' | 'left' }>) => {
        if (!el.props.columns) return;
        const newCols = el.props.columns.map(c => c.key === key ? { ...c, ...newConfig } : c);
        updateElement(el.id, { columns: newCols });
    };

    return (
      <div className="space-y-4 animate-fadeIn">
        <div className="space-y-2"><h4 className="font-bold text-xs text-gray-500 uppercase">موقعیت و اندازه</h4>
            <div className="grid grid-cols-4 gap-2 text-xs">
                {['x', 'y', 'width', 'height'].map(key => (<div key={key}><label className="block text-center text-[9px] text-gray-400">{key.toUpperCase()}</label><input className="w-full p-1 border rounded text-center" type="number" value={Math.round((el.layout as any)[key])} onChange={e => updateElement(el.id, { [key]: parseInt(e.target.value) }, 'layout')} /></div>))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Band</label>
                <select className="w-full p-1 border rounded" value={el.band || 'detail'} onChange={e => setTemplate(prev => ({ ...prev, elements: prev.elements.map(item => item.id === el.id ? { ...item, band: e.target.value as BandType } : item) }))}>
                  {BAND_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Layer</label>
                <input type="number" className="w-full p-1 border rounded" value={el.props.layerIndex || 0} onChange={e => updateElement(el.id, { layerIndex: Number(e.target.value) || 0 })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs pt-1">
              <input
                type="checkbox"
                checked={!!el.props.locked}
                onChange={(e) => updateElement(el.id, { locked: e.target.checked })}
              />
              قفل کردن المان (غیرفعال شدن جابجایی/تغییر اندازه)
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={!!el.props.pageBreakBefore} onChange={e => updateElement(el.id, { pageBreakBefore: e.target.checked })} />
              Page Break Before
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={!!el.props.keepTogether} onChange={e => updateElement(el.id, { keepTogether: e.target.checked })} />
              Keep Together
            </label>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Subreport Template Id (اختیاری)</label>
              <input className="w-full p-1 border rounded text-xs ltr text-left" value={el.props.subreportTemplateId || ''} onChange={e => updateElement(el.id, { subreportTemplateId: e.target.value || undefined })} />
            </div>
        </div>
        <div className="space-y-2"><h4 className="font-bold text-xs text-gray-500 uppercase">ظاهر</h4>
            {el.type === 'HEADER' && (
                <div className="mb-2">
                    <label className="text-xs">استایل کادر</label>
                    <select
                        className="w-full p-1 border rounded text-xs"
                        value={el.props.borderStyle || 'NONE'}
                        onChange={e => updateElement(el.id, { borderStyle: e.target.value as BorderStyle })}
                    >
                        <option value="NONE">بدون کادر</option>
                        <option value="BOX">کادر کامل</option>
                        <option value="TOP_BOTTOM">خطوط بالا و پایین</option>
                        <option value="BOTTOM">فقط خط پایین</option>
                    </select>
                </div>
            )}
            <div className="grid grid-cols-2 gap-2 items-center">
                 <div><label className="text-xs">رنگ پس زمینه</label><input type="color" className="w-full h-8 p-0 rounded" value={el.props.backgroundColor || '#ffffff'} onChange={e => updateElement(el.id, { backgroundColor: e.target.value })} /></div>
                 <div><label className="text-xs">رنگ کادر</label><input type="color" className="w-full h-8 p-0 rounded" value={el.props.borderColor || '#cccccc'} onChange={e => updateElement(el.id, { borderColor: e.target.value })} /></div>
                 <div className="col-span-2"><label className="text-xs">ضخامت کادر (px)</label><input type="number" min="0" max="10" value={el.props.borderWidth || 0} onChange={e => updateElement(el.id, { borderWidth: parseInt(e.target.value) })} className="w-full p-1 border rounded text-xs"/></div>
            </div>
        </div>
        
        { (el.type !== 'HEADER' && el.type !== 'TEXT') &&
            <div className="space-y-2"><h4 className="font-bold text-xs text-gray-500 uppercase">منبع داده</h4>
                <select className="w-full p-2 text-sm border rounded" value={el.props.dataSource || ''} onChange={e => updateElement(el.id, { dataSource: e.target.value, valueField: '', labelField: '' })}>
                    <option value="">اتصال به داده...</option>
                    {Object.keys(TABLE_COLUMNS).map(key => <option key={key} value={key}>{key}</option>)}
                </select>
                {el.props.dataSource && (<div className="bg-gray-50 p-2 rounded space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] text-gray-500">فیلد فیلتر در منبع</label>
                                <select
                                  className="w-full p-1 text-xs border rounded"
                                  value={el.props.filterByField || ''}
                                  onChange={e => updateElement(el.id, { filterByField: e.target.value })}
                                >
                                  <option value="">بدون فیلتر</option>
                                  {TABLE_COLUMNS[el.props.dataSource].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500">فیلد متناظر از رکورد</label>
                                <input
                                  type="text"
                                  className="w-full p-1 text-xs border rounded ltr text-left"
                                  value={el.props.filterValueFromRecordField || ''}
                                  placeholder="مثال: shift_date"
                                  onChange={e => updateElement(el.id, { filterValueFromRecordField: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="text-[10px] text-gray-500">حداکثر ردیف</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={500}
                                  className="w-full p-1 text-xs border rounded"
                                  value={el.props.rowLimit || 50}
                                  onChange={e => updateElement(el.id, { rowLimit: Number(e.target.value) || 50 })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500">مرتب‌سازی بر اساس</label>
                                <select
                                  className="w-full p-1 text-xs border rounded"
                                  value={el.props.sortBy || ''}
                                  onChange={e => updateElement(el.id, { sortBy: e.target.value })}
                                >
                                  <option value="">بدون ترتیب</option>
                                  {TABLE_COLUMNS[el.props.dataSource].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500">جهت</label>
                                <select
                                  className="w-full p-1 text-xs border rounded"
                                  value={el.props.sortDirection || 'desc'}
                                  onChange={e => updateElement(el.id, { sortDirection: e.target.value })}
                                >
                                  <option value="desc">نزولی</option>
                                  <option value="asc">صعودی</option>
                                </select>
                            </div>
                        </div>
                        {['CHART_BAR', 'CHART_PIE', 'CHART_LINE', 'CHART_AREA', 'CHART_RADAR'].includes(el.type) && <>
                            <select className="w-full p-1 text-xs border rounded" value={el.props.labelField || ''} onChange={e => updateElement(el.id, { labelField: e.target.value })}><option value="">محور X / برچسب...</option>{TABLE_COLUMNS[el.props.dataSource].map(c => <option key={c} value={c}>{c}</option>)}</select>
                            <select className="w-full p-1 text-xs border rounded" value={el.props.valueField || ''} onChange={e => updateElement(el.id, { valueField: e.target.value })}><option value="">محور Y / مقدار...</option>{TABLE_COLUMNS[el.props.dataSource].map(c => <option key={c} value={c}>{c}</option>)}</select>
                            <select className="w-full p-1 text-xs border rounded" value={el.props.chartGroupBy || ''} onChange={e => updateElement(el.id, { chartGroupBy: e.target.value })}>
                              <option value="">گروه‌بندی (اختیاری)</option>
                              {TABLE_COLUMNS[el.props.dataSource].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-gray-500">مرتب‌سازی نمودار</label>
                                <select className="w-full p-1 text-xs border rounded" value={el.props.sortChartBy || 'value_desc'} onChange={e => updateElement(el.id, { sortChartBy: e.target.value })}>
                                  <option value="value_desc">بیشترین مقدار</option>
                                  <option value="value_asc">کمترین مقدار</option>
                                  <option value="label">بر اساس برچسب</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500">Top N</label>
                                <input type="number" min="1" max="100" value={el.props.topN || 20} onChange={e => updateElement(el.id, { topN: parseInt(e.target.value || '20', 10) })} className="w-full p-1 text-xs border rounded" />
                              </div>
                            </div>
                        </>}
                        {el.type === 'STAT_CARD' && <>
                            <select className="w-full p-1 text-xs border rounded" value={el.props.valueField || ''} onChange={e => updateElement(el.id, { valueField: e.target.value })}><option value="">فیلد مقدار...</option>{TABLE_COLUMNS[el.props.dataSource].map(c => <option key={c} value={c}>{c}</option>)}</select>
                            <select className="w-full p-1 text-xs border rounded" value={el.props.aggregation || 'COUNT'} onChange={e => updateElement(el.id, { aggregation: e.target.value })}>
                                <option value="COUNT">تعداد رکورد (Count)</option>
                                <option value="SUM">مجموع مقادیر (Sum)</option>
                                <option value="AVG">میانگین مقادیر (Average)</option>
                            </select>
                        </>}
                    </div>)}
            </div>
        }
        
        {el.type === 'HEADER' && (
          <div className="space-y-4">
            <TextStyleEditor path="titleProps" label="عنوان اصلی" />
            <TextStyleEditor path="subtitleProps" label="زیر عنوان" />
            <div className="space-y-2 border-t pt-4 mt-4">
              <h4 className="font-bold text-xs text-gray-500 uppercase">جزئیات هدر</h4>
              <div className="space-y-1 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
                {el.props.detailsProps?.items.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded">
                        <div className="flex flex-col bg-gray-100 dark:bg-gray-700 rounded">
                            <button type="button" onClick={() => handleReorderDetail(index, 'UP')} disabled={index === 0} className="p-0.5 text-gray-400 hover:text-gray-800 disabled:opacity-30">
                                <ChevronUp className="w-3 h-3"/>
                            </button>
                            <button type="button" onClick={() => handleReorderDetail(index, 'DOWN')} disabled={index === el.props.detailsProps.items.length - 1} className="p-0.5 text-gray-400 hover:text-gray-800 disabled:opacity-30">
                                <ChevronDown className="w-3 h-3"/>
                            </button>
                        </div>
                        <input type="text" placeholder="برچسب" value={item.label} onChange={e => { const items = [...el.props.detailsProps.items]; items[index].label = e.target.value; updateNestedProps('detailsProps', { ...el.props.detailsProps, items })}} className="w-1/2 p-1 border rounded text-xs" />
                        <input type="text" placeholder="کلید فیلد (مثل tracking_code)" value={item.value || ''} onChange={e => { const items = [...el.props.detailsProps.items]; items[index].value = e.target.value; updateNestedProps('detailsProps', { ...el.props.detailsProps, items })}} className="w-1/2 p-1 border rounded text-xs ltr text-left" />
                        <button onClick={() => { const items = el.props.detailsProps.items.filter((i:any)=>i.id !== item.id); updateNestedProps('detailsProps', { ...el.props.detailsProps, items }) }} className="p-1 text-red-500"><Trash2 className="w-3 h-3"/></button>
                    </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400">برای مقدار، نام فیلد رکورد را وارد کنید (مثل <span className="font-mono">tracking_code</span>) یا از الگو <span className="font-mono">{'{{shift_date}}'}</span> استفاده کنید.</p>
              <button onClick={() => { const items = [...(el.props.detailsProps?.items || []), {id: Math.random().toString(), label:'جدید', value:'...'}]; updateNestedProps('detailsProps', { ...el.props.detailsProps, items })}} className="text-xs text-blue-600 w-full p-1 border-dashed border rounded hover:bg-blue-50">+ افزودن ردیف</button>
              <TextStyleEditor path="detailsProps.labelStyle" label="استایل برچسب‌ها" />
              <TextStyleEditor path="detailsProps.valueStyle" label="استایل مقادیر" />
              <div><label className="text-xs">خط جداکننده</label><select value={el.props.detailsProps?.dividerStyle || 'dashed'} onChange={e => updateNestedProps('detailsProps', {...el.props.detailsProps, dividerStyle: e.target.value as DividerStyle})} className="w-full p-1 text-xs border rounded"><option value="solid">خط ممتد</option><option value="dashed">خط‌چین</option><option value="none">بدون خط</option></select></div>
            </div>
            <div className="space-y-2 border-t pt-4 mt-4">
              <h4 className="font-bold text-xs text-gray-500 uppercase">لوگو</h4>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button type="button" onClick={() => updateElement(el.id, { logoType: 'DEFAULT' })} className={`flex-1 text-xs p-1 rounded ${el.props.logoType !== 'CUSTOM' ? 'bg-white shadow' : ''}`}>پیش‌فرض</button>
                <button type="button" onClick={() => updateElement(el.id, { logoType: 'CUSTOM' })} className={`flex-1 text-xs p-1 rounded ${el.props.logoType === 'CUSTOM' ? 'bg-white shadow' : ''}`}>سفارشی</button>
              </div>
              {el.props.logoType === 'CUSTOM' && (
                <div className="p-2 border-t">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoUpload} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 p-2 rounded hover:bg-blue-100">
                    <Upload className="w-4 h-4" /> بارگذاری لوگو
                  </button>
                  {el.props.customLogo && <img src={el.props.customLogo} className="w-16 h-16 object-contain mx-auto mt-2 border p-1 rounded" />}
                </div>
              )}
            </div>
          </div>
        )}

        {el.type === 'TEXT' && <TextStyleEditor path="textProps" label="استایل متن" />}
        {el.type === 'IMAGE' && (
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-gray-500 uppercase">تنظیمات تصویر</h4>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 p-2 rounded hover:bg-blue-100"
            >
              <Upload className="w-4 h-4" /> بارگذاری تصویر
            </button>
            <select
              className="w-full p-2 text-xs border rounded"
              value={el.props.imageFit || 'contain'}
              onChange={(e) => updateElement(el.id, { imageFit: e.target.value })}
            >
              <option value="contain">Contain (نمایش کامل)</option>
              <option value="cover">Cover (پر کردن کادر)</option>
              <option value="fill">Fill (کشیدگی کامل)</option>
            </select>
          </div>
        )}
        {el.type === 'STAT_CARD' && <div className="space-y-4">
            <TextStyleEditor path="labelProps" label="استایل برچسب" />
            <div className="flex items-center gap-2 text-xs"><input type="checkbox" checked={el.props.labelProps?.highlight || false} onChange={e => updateNestedProps('labelProps', {...el.props.labelProps, highlight: e.target.checked})} /> <label>هایلایت کردن برچسب</label></div>
            
            {el.props.dataSource && el.props.valueField ? (
                <div className="space-y-2">
                    <div className="p-3 border rounded-lg bg-gray-100 dark:bg-gray-900/50 text-center">
                        <span className="text-xs text-gray-500">مقدار از منبع داده خوانده می‌شود.</span>
                    </div>
                    <TextStyleEditor path="valueProps" label="استایل مقدار" disableText={true} />
                </div>
            ) : (
                <TextStyleEditor path="valueProps" label="مقدار (دستی)" />
            )}

            <TextStyleEditor path="unitProps" label="استایل واحد" />
            <div><label className="text-xs">جداکننده</label><select value={el.props.divider || 'NONE'} onChange={e => updateElement(el.id, { divider: e.target.value })} className="w-full p-1 text-xs border rounded"><option value="NONE">بدون خط</option><option value="MIDDLE">خط وسط</option></select></div>
            <div className="space-y-2 border-t pt-4 mt-4">
              <h4 className="font-bold text-xs text-gray-500 uppercase">نوار پیشرفت هدف</h4>
              <div className="flex items-center gap-2"><input type="checkbox" checked={el.props.goalProps?.show || false} onChange={e => updateNestedProps('goalProps', {...el.props.goalProps, show: e.target.checked})} /> <label className="text-xs">نمایش نوار پیشرفت</label></div>
              {el.props.goalProps?.show && <div className="space-y-2 bg-gray-50 p-2 rounded">
                  <div><label className="text-xs">برچسب</label><input type="text" value={el.props.goalProps?.label || ''} onChange={e => updateNestedProps('goalProps', {...el.props.goalProps, label: e.target.value})} className="w-full p-1 text-xs border rounded" /></div>
                  <div><label className="text-xs">مقدار هدف</label><input type="number" value={el.props.goalProps?.value || 0} onChange={e => updateNestedProps('goalProps', {...el.props.goalProps, value: parseInt(e.target.value)})} className="w-full p-1 text-xs border rounded" /></div>
                  <div><label className="text-xs">رنگ نوار</label><input type="color" value={el.props.goalProps?.color || '#10b981'} onChange={e => updateNestedProps('goalProps', {...el.props.goalProps, color: e.target.value})} className="w-full h-8 p-0 rounded"/></div>
              </div>}
          </div>
        </div>}

        {el.type === 'TABLE' && (() => {
            const availableColumns = el.props.dataSource ? TABLE_COLUMNS[el.props.dataSource] : [];
            const currentColumnKeys = el.props.columns?.map(c => c.key) || [];
            return (
                <div className="space-y-4">
                    <div className="space-y-2"><h4 className="font-bold text-xs text-gray-500 uppercase">مدیریت ستون‌ها</h4>
                        <div className="space-y-2 bg-gray-50 p-2 rounded max-h-60 overflow-y-auto">
                            {availableColumns.map(key => {
                                const isSelected = currentColumnKeys.includes(key);
                                const colConfig = el.props.columns?.find(c => c.key === key);
                                return (
                                <div key={key}>
                                    <div className="flex items-center gap-2"><input type="checkbox" checked={isSelected} onChange={e => handleColumnToggle(key, e.target.checked)} /><span className="text-xs flex-1">{key}</span></div>
                                    {isSelected && colConfig && (<div className="pr-6 mt-1 space-y-1">
                                        <input type="text" placeholder="عنوان ستون..." value={colConfig.header} onChange={e => updateColumnConfig(key, { header: e.target.value })} className="w-full p-1 border rounded text-xs" />
                                        <div className="flex bg-gray-200 rounded p-0.5">
                                            {(['right', 'center', 'left'] as const).map(align => <button key={align} type="button" onClick={() => updateColumnConfig(key, { align })} className={`p-1 rounded ${colConfig.align === align ? 'bg-white shadow' : ''}`}>{align === 'right' ? <AlignRight className="w-4 h-4"/> : align === 'center' ? <AlignCenter className="w-4 h-4"/> : <AlignLeft className="w-4 h-4"/>}</button>)}
                                        </div>
                                    </div>)}
                                </div>
                            )})}
                        </div>
                    </div>
                    <div className="space-y-2"><h4 className="font-bold text-xs text-gray-500 uppercase">استایل</h4>
                        <TextStyleEditor path="headerStyle" label="استایل هدر" />
                        <div className="pl-4 -mt-2 space-y-1"><label className="text-xs">رنگ پس زمینه هدر</label><input type="color" className="w-full h-8 p-0 rounded" value={el.props.headerStyle?.backgroundColor || '#f3f4f6'} onChange={e => updateNestedProps('headerStyle', { ...el.props.headerStyle, backgroundColor: e.target.value })}/></div>
                        <TextStyleEditor path="rowStyle" label="استایل ردیف‌ها" />
                        <div className="pl-4 -mt-2 space-y-1"><label className="text-xs">رنگ ردیف جایگزین</label><input type="color" className="w-full h-8 p-0 rounded" value={el.props.alternateRowColor || '#fafafa'} onChange={e => updateElement(el.id, { alternateRowColor: e.target.value })}/></div>
                        <div className="flex items-center gap-2 text-xs"><input type="checkbox" checked={el.props.showRowNumber || false} onChange={e => updateElement(el.id, { showRowNumber: e.target.checked })}/> <label>نمایش شماره ردیف</label></div>
                        <div className="flex items-center gap-2 text-xs"><input type="checkbox" checked={el.props.showTableBorders !== false} onChange={e => updateElement(el.id, { showTableBorders: e.target.checked })}/> <label>نمایش خطوط جدول</label></div>
                        <div className="flex items-center gap-2 text-xs"><input type="checkbox" checked={el.props.compactRows || false} onChange={e => updateElement(el.id, { compactRows: e.target.checked })}/> <label>حالت فشرده</label></div>
                        <div className="flex items-center gap-2 text-xs"><input type="checkbox" checked={el.props.wrapText !== false} onChange={e => updateElement(el.id, { wrapText: e.target.checked })}/> <label>شکستن متن سلول‌ها</label></div>
                        <div className="space-y-1 border rounded p-2 bg-gray-50">
                          <div className="flex items-center gap-2 text-xs">
                            <input type="checkbox" checked={el.props.showTotalsRow || false} onChange={e => updateElement(el.id, { showTotalsRow: e.target.checked })}/>
                            <label>نمایش ردیف جمع ستون‌ها</label>
                          </div>
                          {(el.props.showTotalsRow || false) && (
                            <div className="grid grid-cols-2 gap-1 max-h-28 overflow-y-auto">
                              {availableColumns.map(key => (
                                <label key={key} className="text-[11px] flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={(el.props.totalFields || []).includes(key)}
                                    onChange={e => {
                                      const curr = el.props.totalFields || [];
                                      const next = e.target.checked ? [...new Set([...curr, key])] : curr.filter(f => f !== key);
                                      updateElement(el.id, { totalFields: next });
                                    }}
                                  />
                                  {key}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                    </div>
                </div>
            )
        })()}

        {['CHART_BAR', 'CHART_PIE', 'CHART_LINE', 'CHART_AREA', 'CHART_RADAR'].includes(el.type) && <div className="space-y-4"><TextStyleEditor path="titleProps" label="استایل عنوان نمودار" />
           <div className="space-y-2 border-t pt-4 mt-4">
              <h4 className="font-bold text-xs text-gray-500 uppercase">تنظیمات ظاهری نمودار</h4>
              <div className="flex items-center gap-2"><input type="checkbox" checked={el.props.showLegend || false} onChange={e => updateElement(el.id, {showLegend: e.target.checked})} /> <label className="text-xs">نمایش راهنما (Legend)</label></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={el.props.showGrid !== false} onChange={e => updateElement(el.id, {showGrid: e.target.checked})} /> <label className="text-xs">نمایش خطوط شبکه</label></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={el.props.showTooltip !== false} onChange={e => updateElement(el.id, {showTooltip: e.target.checked})} /> <label className="text-xs">نمایش Tooltip</label></div>
              <div>
                <label className="text-xs">پالت رنگی (با کاما جدا کنید)</label>
                <input type="text" className="w-full p-1 text-xs border rounded ltr text-left" value={el.props.chartPalette || ''} onChange={e => updateElement(el.id, { chartPalette: e.target.value })} placeholder="#800020,#2563eb,#10b981" />
              </div>
              {el.type === 'CHART_BAR' && <div><label className="text-xs">گردی گوشه ستون‌ها</label><input type="number" min="0" max="20" value={el.props.barRadius || 0} onChange={e => updateElement(el.id, {barRadius: parseInt(e.target.value)})} className="w-full p-1 text-xs border rounded"/></div>}
              {el.type === 'CHART_PIE' && <div><label className="text-xs">شعاع داخلی (برای حالت دونات)</label><input type="number" min="0" max="50" value={el.props.innerRadius || 0} onChange={e => updateElement(el.id, {innerRadius: parseInt(e.target.value)})} className="w-full p-1 text-xs border rounded"/></div>}
              {el.type === 'CHART_PIE' && <div><label className="text-xs">برچسب روی نمودار</label><select value={el.props.pieLabelMode || 'none'} onChange={e => updateElement(el.id, {pieLabelMode: e.target.value})} className="w-full p-1 text-xs border rounded"><option value="none">بدون برچسب</option><option value="value">نمایش مقدار</option><option value="percent">نمایش درصد</option></select></div>}
              {(el.type === 'CHART_LINE' || el.type === 'CHART_AREA') && <>
                <div><label className="text-xs">نوع خط</label><select value={el.props.lineType || 'monotone'} onChange={e=>updateElement(el.id, {lineType: e.target.value})} className="w-full p-1 text-xs border rounded"><option value="monotone">صاف (Smooth)</option><option value="linear">شکسته (Linear)</option></select></div>
                <div className="flex items-center gap-2"><input type="checkbox" checked={el.props.showDots === undefined ? true : el.props.showDots} onChange={e => updateElement(el.id, {showDots: e.target.checked})} /> <label className="text-xs">نمایش نقاط داده</label></div>
              </>}
              {el.type === 'CHART_AREA' && <div><label className="text-xs">شفافیت ناحیه</label><input type="number" min="0" max="1" step="0.05" value={el.props.areaOpacity ?? 0.35} onChange={e => updateElement(el.id, {areaOpacity: parseFloat(e.target.value)})} className="w-full p-1 text-xs border rounded"/></div>}
              {(el.type === 'CHART_BAR' || el.type === 'CHART_AREA') && <div className="flex items-center gap-2"><input type="checkbox" checked={el.props.stacked || false} onChange={e => updateElement(el.id, {stacked: e.target.checked})} /> <label className="text-xs">حالت تجمعی (Stacked)</label></div>}
           </div>
        </div>}
        
        {/* Delete Button */}
        <div className="border-t pt-4 mt-4">
           <button onClick={() => removeElement(el.id)} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition">
             <Trash2 className="w-4 h-4" /> حذف المان
           </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
      <div className="h-14 bg-white dark:bg-gray-800 border-b px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMainTab('DESIGN')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold ${mainTab === 'DESIGN' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            طراحی قالب
          </button>
          <button
            onClick={() => { refreshTemplates(); setMainTab('MANAGE'); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold ${mainTab === 'MANAGE' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            مدیریت نسخه‌ها
          </button>
        </div>
        <div className="text-xs text-gray-500">
          هر گزارش فقط یک قالب فعال دارد.
        </div>
      </div>

      {mainTab === 'MANAGE' ? (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {groupedTemplates.map(group => (
              <div key={group.moduleId} className="bg-white dark:bg-gray-800 rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">{group.moduleLabel}</h3>
                  <button
                    onClick={() => { loadTemplateForModule(group.moduleId); setMainTab('DESIGN'); }}
                    className="text-xs px-3 py-1.5 rounded bg-blue-50 text-blue-700"
                  >
                    طراحی نسخه جدید
                  </button>
                </div>
                {group.items.length === 0 ? (
                  <p className="text-sm text-gray-400">هنوز قالبی ثبت نشده است.</p>
                ) : (
                  <div className="space-y-2">
                    {group.items.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between border rounded-lg p-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold">{item.title}</span>
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">v{item.version}</span>
                          {item.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">فعال</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setTemplate(item); setSelectedElementId(item.elements?.[0]?.id || null); setMainTab('DESIGN'); }}
                            className="text-xs px-3 py-1.5 rounded bg-gray-100"
                          >
                            باز کردن
                          </button>
                          <button
                            onClick={() => handleActivateTemplate(item.id, group.moduleId)}
                            disabled={item.isActive}
                            className="text-xs px-3 py-1.5 rounded bg-green-50 text-green-700 disabled:opacity-40"
                          >
                            فعال‌سازی
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(item.id)}
                            className="text-xs px-3 py-1.5 rounded bg-red-50 text-red-700"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 bg-white dark:bg-gray-800 border-l flex flex-col z-20">
            <div className="p-4 border-b"><h2 className="font-bold flex items-center gap-2"><LayoutTemplate className="w-5 h-5 text-primary"/> ابزارها</h2></div>
            <div className="flex-1 p-2 space-y-2">
                <h3 className="text-[10px] text-gray-400 font-bold uppercase px-2">پایه</h3>
                <button onClick={() => addElement('HEADER')} className="w-full flex items-center gap-2 p-2 bg-gray-50 hover:bg-blue-50 rounded text-sm"><FileText className="w-4 h-4"/> هدر</button>
                <button onClick={() => addElement('TEXT')} className="w-full flex items-center gap-2 p-2 bg-gray-50 hover:bg-blue-50 rounded text-sm"><Type className="w-4 h-4"/> متن</button>
                <button onClick={() => addElement('IMAGE')} className="w-full flex items-center gap-2 p-2 bg-gray-50 hover:bg-blue-50 rounded text-sm"><ImageIcon className="w-4 h-4"/> تصویر</button>
                <h3 className="text-[10px] text-gray-400 font-bold uppercase px-2 pt-2">داده</h3>
                <button onClick={() => addElement('STAT_CARD')} className="w-full flex items-center gap-2 p-2 bg-gray-50 hover:bg-blue-50 rounded text-sm"><Sigma className="w-4 h-4"/> کارت آمار</button>
                <button onClick={() => addElement('TABLE')} className="w-full flex items-center gap-2 p-2 bg-gray-50 hover:bg-blue-50 rounded text-sm"><TableIcon className="w-4 h-4"/> جدول</button>
                <h3 className="text-[10px] text-gray-400 font-bold uppercase px-2 pt-2">نمودار</h3>
                <button onClick={() => addElement('CHART_BAR')} className="w-full flex items-center gap-2 p-2 bg-gray-50 hover:bg-blue-50 rounded text-sm"><BarChartIcon className="w-4 h-4"/> میله‌ای</button>
                <button onClick={() => addElement('CHART_PIE')} className="w-full flex items-center gap-2 p-2 bg-gray-50 hover:bg-blue-50 rounded text-sm"><PieChartIcon className="w-4 h-4"/> دایره‌ای</button>
                <button onClick={() => addElement('CHART_LINE')} className="w-full flex items-center gap-2 p-2 bg-gray-50 hover:bg-blue-50 rounded text-sm"><LineChartIcon className="w-4 h-4"/> خطی</button>
                <button onClick={() => addElement('CHART_AREA')} className="w-full flex items-center gap-2 p-2 bg-gray-50 hover:bg-blue-50 rounded text-sm"><LineChartIcon className="w-4 h-4"/> ناحیه‌ای (Area)</button>
                <button onClick={() => addElement('CHART_RADAR')} className="w-full flex items-center gap-2 p-2 bg-gray-50 hover:bg-blue-50 rounded text-sm"><BarChartIcon className="w-4 h-4"/> رادار</button>
            </div>
          </div>
          <div className="flex-1 flex flex-col bg-gray-200/50 dark:bg-gray-900/50">
            <div className="h-16 bg-white dark:bg-gray-800 border-b flex items-center justify-between px-6 z-10">
               <div className="flex items-center gap-4">
                  <input type="text" value={template.title} onChange={e => setTemplate({ ...template, title: e.target.value })} className="font-bold text-lg bg-transparent outline-none w-64" />
                  <select value={template.targetModule} onChange={e => loadTemplateForModule(e.target.value)} className="text-sm bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 border-none outline-none">
                      {REPORT_MODULES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  <div className="flex items-center gap-1 border-r pr-3 mr-1">
                    <button onClick={handleUndo} disabled={historyPast.length === 0} className="p-1.5 rounded bg-gray-100 disabled:opacity-40" title="Undo"><Undo2 className="w-4 h-4" /></button>
                    <button onClick={handleRedo} disabled={historyFuture.length === 0} className="p-1.5 rounded bg-gray-100 disabled:opacity-40" title="Redo"><Redo2 className="w-4 h-4" /></button>
                    <button onClick={handleDuplicateSelected} disabled={!selectedElement} className="p-1.5 rounded bg-gray-100 disabled:opacity-40" title="Duplicate"><Copy className="w-4 h-4" /></button>
                    <button onClick={handleToggleLockSelected} disabled={!selectedElement} className="p-1.5 rounded bg-gray-100 disabled:opacity-40" title="Lock/Unlock">
                      {selectedElement?.props.locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-1 border-r pr-3 mr-1">
                    <button onClick={() => alignSelected('left')} disabled={!selectedElement} className="p-1.5 rounded bg-gray-100 disabled:opacity-40" title="Align Left"><AlignRight className="w-4 h-4" /></button>
                    <button onClick={() => alignSelected('center-x')} disabled={!selectedElement} className="p-1.5 rounded bg-gray-100 disabled:opacity-40" title="Align Center X"><AlignCenter className="w-4 h-4" /></button>
                    <button onClick={() => alignSelected('right')} disabled={!selectedElement} className="p-1.5 rounded bg-gray-100 disabled:opacity-40" title="Align Right"><AlignLeft className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEnableSnap(v => !v)} className={`px-2 py-1 rounded text-xs ${enableSnap ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`} title="Snap">{enableSnap ? 'Snap On' : 'Snap Off'}</button>
                    <button onClick={() => setShowGridGuides(v => !v)} className={`px-2 py-1 rounded text-xs ${showGridGuides ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`} title="Grid">{showGridGuides ? 'Grid On' : 'Grid Off'}</button>
                    <button onClick={() => setShowRuler(v => !v)} className={`px-2 py-1 rounded text-xs ${showRuler ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`} title="Ruler">{showRuler ? 'Ruler On' : 'Ruler Off'}</button>
                    <button onClick={() => setShowLayers(v => !v)} className={`px-2 py-1 rounded text-xs ${showLayers ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`} title="Layers">{showLayers ? 'Layers On' : 'Layers Off'}</button>
                    <button onClick={exportTemplateAsJson} className="p-1.5 rounded bg-gray-100" title="Export JSON"><Download className="w-4 h-4" /></button>
                    <button onClick={() => importTemplateInputRef.current?.click()} className="p-1.5 rounded bg-gray-100" title="Import JSON"><Upload className="w-4 h-4" /></button>
                    <input ref={importTemplateInputRef} type="file" className="hidden" accept="application/json" onChange={handleImportTemplateJson} />
                  </div>
               </div>
               <button onClick={handleSaveTemplate} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg flex items-center gap-2"><Save className="w-4 h-4"/> ذخیره نسخه جدید</button>
            </div>
            <div className="flex-1 overflow-auto p-8" onClick={() => setSelectedElementId(null)}>
               <div ref={canvasRef} className="bg-white shadow-2xl relative" style={{ width: '210mm', height: '297mm', padding: '1mm' }}>
                  {template.elements.map(el => (
                    <div key={el.id} onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }} onMouseDown={(e) => startInteraction(e, 'move', el)} style={{ position: 'absolute', left: el.layout.x, top: el.layout.y, width: el.layout.width, height: el.layout.height, border: `1px ${selectedElementId === el.id ? 'dashed #3b82f6' : 'solid transparent'}`, cursor: el.props.locked ? 'not-allowed' : 'grab' }}>
                      {renderWidgetContent(el)}
                      {selectedElementId === el.id && !el.props.locked && (
                        [
                          { id: 'br', style: { right: -6, bottom: -6 }, cursor: 'se-resize' },
                          { id: 'bl', style: { left: -6, bottom: -6 }, cursor: 'sw-resize' },
                          { id: 'tr', style: { right: -6, top: -6 }, cursor: 'ne-resize' },
                          { id: 'tl', style: { left: -6, top: -6 }, cursor: 'nw-resize' },
                          { id: 'r', style: { right: -6, top: '50%', transform: 'translateY(-50%)' }, cursor: 'e-resize' },
                          { id: 'l', style: { left: -6, top: '50%', transform: 'translateY(-50%)' }, cursor: 'w-resize' },
                          { id: 't', style: { top: -6, left: '50%', transform: 'translateX(-50%)' }, cursor: 'n-resize' },
                          { id: 'b', style: { bottom: -6, left: '50%', transform: 'translateX(-50%)' }, cursor: 's-resize' },
                        ].map(handle => (
                          <div
                            key={handle.id}
                            onMouseDown={(e) => startInteraction(e, `resize-${handle.id}` as InteractionType, el)}
                            className="absolute w-3 h-3 bg-white border-2 border-primary rounded-full"
                            style={{ ...handle.style, cursor: handle.cursor }}
                          />
                        ))
                      )}
                      {selectedElementId === el.id && el.props.locked && (
                        <div className="absolute top-1 left-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                          قفل
                        </div>
                      )}
                    </div>
                  ))}
               </div>
            </div>
          </div>
          <div className="w-72 bg-white dark:bg-gray-800 border-r flex flex-col z-20">
            <div className="p-4 border-b bg-gray-50"><h2 className="font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-gray-500"/> تنظیمات</h2></div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderTemplateSettings()}
              {renderProperties()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportTemplateDesign;
