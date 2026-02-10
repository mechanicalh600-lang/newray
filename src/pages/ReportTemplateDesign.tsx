
import React, { useState } from 'react';
import { 
  LayoutTemplate, Save, Trash2, Settings, 
  Database, Plus, Move, Type, Table as TableIcon, 
  BarChart as BarChartIcon, PieChart as PieChartIcon, 
  Image as ImageIcon, Grid, ChevronLeft, AlignCenter, 
  AlignLeft, AlignRight, Check, X, FileText, Monitor, Factory
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

// --- Types ---

type ElementType = 'HEADER' | 'TEXT' | 'TABLE' | 'CHART_BAR' | 'CHART_PIE' | 'STAT_CARD' | 'GRID_2' | 'GRID_3';

interface ReportElement {
  id: string;
  type: ElementType;
  x?: number; // For absolute positioning (future) - currently using flow layout
  y?: number;
  content?: string;
  props: any; // Dynamic properties based on type
}

interface ReportTemplate {
  id: string;
  title: string;
  targetModule: string; // 'SHIFT', 'LAB', 'MAINTENANCE', etc.
  elements: ReportElement[];
}

// --- Mock Data for Previews ---
const MOCK_CHART_DATA = [
  { name: 'A', value: 400 }, { name: 'B', value: 300 }, { name: 'C', value: 300 }, { name: 'D', value: 200 }
];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// --- Components ---

export const ReportTemplateDesign: React.FC = () => {
  const [template, setTemplate] = useState<ReportTemplate>({
    id: 'new',
    title: 'قالب گزارش تولید روزانه',
    targetModule: 'PRODUCTION',
    elements: [
      { 
        id: 'el-1', 
        type: 'HEADER', 
        props: { title: 'شرکت توسعه معدنی و صنعتی صبانور', subtitle: 'گزارش جامع تولید و توقفات' } 
      }
    ]
  });

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false); // Placeholder for drag state

  const selectedElement = template.elements.find(el => el.id === selectedElementId);

  // --- Actions ---

  const addElement = (type: ElementType) => {
    const newId = Math.random().toString(36).substr(2, 9);
    let defaultProps: any = {};

    switch (type) {
      case 'HEADER':
        defaultProps = { title: 'عنوان سازمان', subtitle: 'زیر عنوان گزارش' };
        break;
      case 'TEXT':
        defaultProps = { text: 'متن نمونه...', fontSize: 14, align: 'right', bold: false };
        break;
      case 'STAT_CARD':
        defaultProps = { label: 'تولید کل', value: '2,500', unit: 'تن', color: 'blue' };
        break;
      case 'TABLE':
        defaultProps = { columns: ['ردیف', 'کد تجهیز', 'شرح خرابی', 'زمان'], rows: 3 };
        break;
      case 'CHART_BAR':
      case 'CHART_PIE':
        defaultProps = { title: 'عنوان نمودار', dataKey: 'value' };
        break;
      case 'GRID_2':
        defaultProps = { gap: 4 };
        break;
    }

    setTemplate(prev => ({
      ...prev,
      elements: [...prev.elements, { id: newId, type, props: defaultProps }]
    }));
    setSelectedElementId(newId);
  };

  const updateElement = (id: string, updates: any) => {
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, props: { ...el.props, ...updates } } : el)
    }));
  };

  const removeElement = (id: string) => {
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id)
    }));
    setSelectedElementId(null);
  };

  const moveElement = (id: string, direction: 'UP' | 'DOWN') => {
    const idx = template.elements.findIndex(el => el.id === id);
    if (idx === -1) return;
    if (direction === 'UP' && idx === 0) return;
    if (direction === 'DOWN' && idx === template.elements.length - 1) return;

    const newElements = [...template.elements];
    const swapIdx = direction === 'UP' ? idx - 1 : idx + 1;
    [newElements[idx], newElements[swapIdx]] = [newElements[swapIdx], newElements[idx]];
    
    setTemplate({ ...template, elements: newElements });
  };

  // --- Renderers for Canvas ---

  const renderWidget = (el: ReportElement) => {
    const isSelected = selectedElementId === el.id;
    const baseClass = `relative group border-2 border-transparent hover:border-dashed hover:border-gray-300 transition-all cursor-pointer mb-2 ${isSelected ? '!border-primary ring-2 ring-primary/20 bg-blue-50/10' : ''}`;

    const Controls = () => (
      <div className={`absolute -right-8 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 ${isSelected ? 'opacity-100' : ''} transition-opacity z-10`}>
        <button onClick={(e) => { e.stopPropagation(); moveElement(el.id, 'UP'); }} className="p-1 bg-white border rounded shadow hover:text-blue-600"><ChevronLeft className="w-3 h-3 rotate-90"/></button>
        <button onClick={(e) => { e.stopPropagation(); removeElement(el.id); }} className="p-1 bg-white border rounded shadow hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
        <button onClick={(e) => { e.stopPropagation(); moveElement(el.id, 'DOWN'); }} className="p-1 bg-white border rounded shadow hover:text-blue-600"><ChevronLeft className="w-3 h-3 -rotate-90"/></button>
      </div>
    );

    switch (el.type) {
      case 'HEADER':
        return (
          <div className={`${baseClass} p-4 border-b-4 border-primary bg-gray-50 flex items-center justify-between`} onClick={() => setSelectedElementId(el.id)}>
            <Controls />
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 font-bold text-xs">LOGO</div>
            <div className="text-center flex-1">
              <h1 className="text-xl font-black text-primary mb-1">{el.props.title}</h1>
              <h2 className="text-sm font-bold text-gray-600">{el.props.subtitle}</h2>
            </div>
            <div className="w-32 text-[10px] text-right space-y-1 opacity-70">
              <div className="flex justify-between border-b border-gray-300"><span>تاریخ:</span> <span>1403/11/01</span></div>
              <div className="flex justify-between border-b border-gray-300"><span>شماره:</span> <span>R-1001</span></div>
              <div className="flex justify-between"><span>پیوست:</span> <span>دارد</span></div>
            </div>
          </div>
        );

      case 'STAT_CARD':
        const colors: any = { blue: 'bg-blue-50 text-blue-700', red: 'bg-red-50 text-red-700', green: 'bg-green-50 text-green-700' };
        return (
          <div className={`${baseClass} inline-block w-1/4 p-1`} onClick={() => setSelectedElementId(el.id)}>
             <Controls />
             <div className={`p-3 rounded-xl border text-center ${colors[el.props.color] || colors.blue}`}>
                <span className="block text-xs opacity-70 mb-1">{el.props.label}</span>
                <span className="block text-xl font-black">{el.props.value} <small className="text-[10px]">{el.props.unit}</small></span>
             </div>
          </div>
        );

      case 'TEXT':
        return (
          <div 
            className={`${baseClass} p-2`} 
            onClick={() => setSelectedElementId(el.id)}
            style={{ textAlign: el.props.align, fontSize: `${el.props.fontSize}px`, fontWeight: el.props.bold ? 'bold' : 'normal' }}
          >
            <Controls />
            {el.props.text}
          </div>
        );

      case 'TABLE':
        return (
          <div className={`${baseClass} p-2`} onClick={() => setSelectedElementId(el.id)}>
            <Controls />
            <table className="w-full text-xs text-center border-collapse">
              <thead className="bg-gray-100 text-gray-700 font-bold">
                <tr>
                  {el.props.columns?.map((col: string, i: number) => (
                    <th key={i} className="p-2 border border-gray-300">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: el.props.rows || 2 }).map((_, r) => (
                  <tr key={r}>
                    {el.props.columns?.map((_: any, c: number) => (
                      <td key={c} className="p-2 border border-gray-300 text-gray-400 bg-white">داده {r+1}-{c+1}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'CHART_BAR':
        return (
          <div className={`${baseClass} p-4 h-64 bg-white border border-gray-200 rounded-xl`} onClick={() => setSelectedElementId(el.id)}>
            <Controls />
            <h4 className="text-center text-xs font-bold text-gray-500 mb-2">{el.props.title}</h4>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={MOCK_CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} />
                <Bar dataKey="value" fill="#800020" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'CHART_PIE':
        return (
          <div className={`${baseClass} p-4 h-64 bg-white border border-gray-200 rounded-xl`} onClick={() => setSelectedElementId(el.id)}>
            <Controls />
            <h4 className="text-center text-xs font-bold text-gray-500 mb-2">{el.props.title}</h4>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={MOCK_CHART_DATA} cx="50%" cy="50%" innerRadius={40} outerRadius={70} fill="#8884d8" paddingAngle={5} dataKey="value">
                  {MOCK_CHART_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        );

      default: return null;
    }
  };

  // --- Properties Panel Renderer ---

  const renderProperties = () => {
    if (!selectedElement) return <div className="text-gray-400 text-center text-sm mt-10">یک المان را انتخاب کنید</div>;

    return (
      <div className="space-y-4 animate-fadeIn">
        <h3 className="font-bold text-sm text-gray-700 border-b pb-2 mb-4">تنظیمات {selectedElement.type}</h3>
        
        {selectedElement.type === 'HEADER' && (
          <>
            <div>
              <label className="block text-xs font-bold mb-1">عنوان اصلی</label>
              <input type="text" className="w-full p-2 border rounded text-sm" value={selectedElement.props.title} onChange={e => updateElement(selectedElement.id, { title: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">زیر عنوان</label>
              <input type="text" className="w-full p-2 border rounded text-sm" value={selectedElement.props.subtitle} onChange={e => updateElement(selectedElement.id, { subtitle: e.target.value })} />
            </div>
          </>
        )}

        {selectedElement.type === 'TEXT' && (
          <>
            <div>
              <label className="block text-xs font-bold mb-1">متن</label>
              <textarea className="w-full p-2 border rounded text-sm h-24" value={selectedElement.props.text} onChange={e => updateElement(selectedElement.id, { text: e.target.value })} />
            </div>
            <div className="flex gap-2">
               <div className="flex-1">
                  <label className="block text-xs font-bold mb-1">سایز فونت</label>
                  <input type="number" className="w-full p-2 border rounded text-sm" value={selectedElement.props.fontSize} onChange={e => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })} />
               </div>
               <div className="flex items-end">
                  <button onClick={() => updateElement(selectedElement.id, { bold: !selectedElement.props.bold })} className={`p-2 border rounded ${selectedElement.props.bold ? 'bg-gray-200' : 'bg-white'}`}><Type className="w-4 h-4"/></button>
               </div>
            </div>
            <div>
               <label className="block text-xs font-bold mb-1">چیدمان</label>
               <div className="flex bg-gray-100 rounded p-1">
                 {['right', 'center', 'left'].map(align => (
                   <button key={align} onClick={() => updateElement(selectedElement.id, { align })} className={`flex-1 p-1 rounded ${selectedElement.props.align === align ? 'bg-white shadow' : ''}`}>
                     {align === 'right' ? <AlignRight className="w-4 h-4 mx-auto"/> : align === 'center' ? <AlignCenter className="w-4 h-4 mx-auto"/> : <AlignLeft className="w-4 h-4 mx-auto"/>}
                   </button>
                 ))}
               </div>
            </div>
          </>
        )}

        {selectedElement.type === 'STAT_CARD' && (
          <>
            <div><label className="block text-xs font-bold mb-1">برچسب</label><input className="w-full p-2 border rounded text-sm" value={selectedElement.props.label} onChange={e => updateElement(selectedElement.id, { label: e.target.value })} /></div>
            <div><label className="block text-xs font-bold mb-1">مقدار</label><input className="w-full p-2 border rounded text-sm" value={selectedElement.props.value} onChange={e => updateElement(selectedElement.id, { value: e.target.value })} /></div>
            <div><label className="block text-xs font-bold mb-1">واحد</label><input className="w-full p-2 border rounded text-sm" value={selectedElement.props.unit} onChange={e => updateElement(selectedElement.id, { unit: e.target.value })} /></div>
            <div>
              <label className="block text-xs font-bold mb-1">رنگ</label>
              <div className="flex gap-2">
                {['blue', 'red', 'green'].map(c => (
                  <button key={c} onClick={() => updateElement(selectedElement.id, { color: c })} className={`w-6 h-6 rounded-full border-2 ${selectedElement.props.color === c ? 'border-black' : 'border-transparent'}`} style={{ backgroundColor: c === 'blue' ? '#eff6ff' : c === 'red' ? '#fef2f2' : '#f0fdf4' }}>
                    <div className={`w-3 h-3 rounded-full mx-auto mt-1`} style={{ backgroundColor: c }} />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {(selectedElement.type.startsWith('CHART')) && (
           <div><label className="block text-xs font-bold mb-1">عنوان نمودار</label><input className="w-full p-2 border rounded text-sm" value={selectedElement.props.title} onChange={e => updateElement(selectedElement.id, { title: e.target.value })} /></div>
        )}

        <button onClick={() => removeElement(selectedElement.id)} className="w-full bg-red-50 text-red-600 p-2 rounded flex items-center justify-center gap-2 mt-6 hover:bg-red-100"><Trash2 className="w-4 h-4"/> حذف المان</button>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-100 dark:bg-gray-900 overflow-hidden">
      
      {/* 1. Left Sidebar: Toolbox */}
      <div className="w-64 bg-white dark:bg-gray-800 border-l dark:border-gray-700 flex flex-col shadow-lg z-20">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="font-bold text-gray-700 dark:text-white flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-primary"/> ابزار طراحی
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          <div>
            <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase">ساختار و متن</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => addElement('HEADER')} className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg hover:border-blue-400 transition">
                <LayoutTemplate className="w-6 h-6 text-gray-600 mb-1"/>
                <span className="text-[10px]">هدر استاندارد</span>
              </button>
              <button onClick={() => addElement('TEXT')} className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg hover:border-blue-400 transition">
                <Type className="w-6 h-6 text-gray-600 mb-1"/>
                <span className="text-[10px]">متن آزاد</span>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase">داده‌ها و جداول</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => addElement('STAT_CARD')} className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg hover:border-blue-400 transition">
                <Database className="w-6 h-6 text-gray-600 mb-1"/>
                <span className="text-[10px]">کارت آمار</span>
              </button>
              <button onClick={() => addElement('TABLE')} className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg hover:border-blue-400 transition">
                <TableIcon className="w-6 h-6 text-gray-600 mb-1"/>
                <span className="text-[10px]">جدول داده</span>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase">نمودارها</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => addElement('CHART_BAR')} className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg hover:border-blue-400 transition">
                <BarChartIcon className="w-6 h-6 text-gray-600 mb-1"/>
                <span className="text-[10px]">نمودار میله‌ای</span>
              </button>
              <button onClick={() => addElement('CHART_PIE')} className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg hover:border-blue-400 transition">
                <PieChartIcon className="w-6 h-6 text-gray-600 mb-1"/>
                <span className="text-[10px]">نمودار دایره‌ای</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Main Canvas Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-gray-200/50">
        
        {/* Top Bar */}
        <div className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-6 shadow-sm z-10">
           <div className="flex items-center gap-4">
              <input 
                type="text" 
                value={template.title} 
                onChange={(e) => setTemplate({ ...template, title: e.target.value })}
                className="font-bold text-lg bg-transparent outline-none border-b border-dashed border-gray-300 focus:border-primary w-64"
                placeholder="عنوان قالب..."
              />
              <select 
                value={template.targetModule}
                onChange={(e) => setTemplate({ ...template, targetModule: e.target.value })}
                className="text-sm bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 border-none outline-none cursor-pointer hover:bg-gray-200"
              >
                <option value="PRODUCTION">گزارش تولید</option>
                <option value="SHIFT">گزارش شیفت</option>
                <option value="LAB">گزارش آزمایشگاه</option>
                <option value="MAINTENANCE">گزارش تعمیرات</option>
              </select>
           </div>
           <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50">پیش‌نمایش</button>
              <button onClick={() => alert('قالب با موفقیت ذخیره شد')} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg hover:bg-red-800 transition flex items-center gap-2">
                <Save className="w-4 h-4"/> ذخیره قالب
              </button>
           </div>
        </div>

        {/* Workspace Scroll Area */}
        <div className="flex-1 overflow-auto p-8 flex justify-center items-start" onClick={() => setSelectedElementId(null)}>
           
           {/* A4 PAPER CANVAS */}
           <div 
             className="bg-white shadow-2xl relative transition-all animate-slideUp"
             style={{ 
               width: '210mm', 
               minHeight: '297mm', 
               padding: '15mm',
               transform: 'scale(1)', // Can add zoom functionality here later
               transformOrigin: 'top center'
             }}
             onClick={(e) => e.stopPropagation()} // Prevent deselection when clicking inside paper
           >
              {template.elements.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 pointer-events-none">
                   <Plus className="w-20 h-20 mb-4 opacity-50"/>
                   <p className="text-lg font-bold">ابزارک‌ها را از منوی راست اضافه کنید</p>
                </div>
              ) : (
                <div className="space-y-4">
                   {template.elements.map(el => (
                     <div key={el.id}>
                        {renderWidget(el)}
                     </div>
                   ))}
                </div>
              )}
           </div>

        </div>
      </div>

      {/* 3. Right Sidebar: Properties */}
      <div className="w-72 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col shadow-lg z-20">
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <h2 className="font-bold text-gray-700 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500"/> تنظیمات المان
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
           {renderProperties()}
        </div>
      </div>

    </div>
  );
};

export default ReportTemplateDesign;
