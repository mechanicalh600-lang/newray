import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Database, ChevronRight, Copy, Check, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const FALLBACK_TABLES = [
  'app_settings', 'work_orders', 'pm_plans', 'shift_reports', 'report_definitions', 'report_records',
  'production_reports', 'control_room_reports', 'production_plans', 'personal_notes', 'projects',
  'part_requests', 'purchase_requests', 'equipment_boms', 'technical_documents', 'lab_reports',
  'warehouse_reports', 'scale_reports', 'personnel_skills', 'training_courses', 'evaluation_periods',
  'evaluation_criteria', 'performance_evaluations', 'hse_reports', 'technical_suggestions',
  'meeting_minutes', 'work_permits', 'announcement_acknowledgments', 'coding_formats',
];

const BOX_WIDTH = 260;
const BOX_HEADER = 40;
const ROW_HEIGHT = 28;
const TABLES_PAGE_SIZE = 5;

interface TableColumn {
  column_name: string;
  data_type: string;
  selected?: boolean;
}

interface TableFK {
  column_name: string;
  foreign_table: string;
  foreign_column: string;
}

interface CanvasTable {
  id: string;
  tableName: string;
  x: number;
  y: number;
  columns: TableColumn[];
  foreignKeys: TableFK[];
}

export interface SqlQueryBuilderModalProps {
  open: boolean;
  onClose: () => void;
  initialSql?: string;
  onApplySql: (sql: string) => void;
}

export const SqlQueryBuilderModal: React.FC<SqlQueryBuilderModalProps> = ({
  open,
  onClose,
  initialSql = '',
  onApplySql,
}) => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [sqlText, setSqlText] = useState(initialSql);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [canvasTables, setCanvasTables] = useState<CanvasTable[]>([]);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [queryResult, setQueryResult] = useState<Record<string, unknown>[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [searchTable, setSearchTable] = useState('');
  const [visibleTableCount, setVisibleTableCount] = useState(TABLES_PAGE_SIZE);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const normalizeTableName = (name: string) =>
    (name || '').trim().replace(/^public\./i, '').toLowerCase();
  const tableNameMatches = (a: string, b: string) =>
    normalizeTableName(a) === normalizeTableName(b);

  useEffect(() => {
    setSqlText(initialSql);
  }, [initialSql, open]);

  useEffect(() => {
    if (!open) return;
    setVisibleTableCount(TABLES_PAGE_SIZE);
    setSearchTable('');
    setLoadingTables(true);
    (async () => {
      try {
        const { data, error } = await supabase.rpc('list_public_tables');
        const list = (data && data.length > 0 ? data.map((r: { table_name: string }) => r.table_name) : FALLBACK_TABLES).slice().sort((a, b) => a.localeCompare(b));
        setTables(list);
      } catch {
        setTables(FALLBACK_TABLES.slice().sort((a, b) => a.localeCompare(b)));
      } finally {
        setLoadingTables(false);
      }
    })();
  }, [open]);

  const loadTableMeta = useCallback(async (tname: string) => {
    try {
      const [colsRes, fkRes] = await Promise.all([
        supabase.rpc('list_table_columns', { qualified_tname: tname }),
        supabase.rpc('list_foreign_keys', { qualified_tname: tname }),
      ]);
      let cols: TableColumn[] = [];
      let fks: TableFK[] = [];
      if (!colsRes.error && colsRes.data) {
        cols = colsRes.data.map((r: any) => ({ column_name: r.column_name, data_type: r.data_type || '', selected: false }));
      } else {
        const { data: row } = await supabase.from(tname).select('*').limit(1).maybeSingle();
        cols = row ? Object.keys(row).map(k => ({ column_name: k, data_type: '', selected: false })) : [];
      }
      if (!fkRes.error && fkRes.data) {
        fks = fkRes.data.map((r: any) => ({ column_name: r.column_name, foreign_table: r.foreign_table, foreign_column: r.foreign_column }));
      }
      return { columns: cols, foreignKeys: fks };
    } catch {
      const { data: row } = await supabase.from(tname).select('*').limit(1).maybeSingle();
      return {
        columns: row ? Object.keys(row).map(k => ({ column_name: k, data_type: '', selected: false })) : [],
        foreignKeys: [],
      };
    }
  }, []);

  const filteredTables = tables.filter(t => t.toLowerCase().includes(searchTable.toLowerCase().trim()));
  const visibleTables = filteredTables.slice(0, visibleTableCount);
  const hasMoreTables = visibleTableCount < filteredTables.length;

  const applyFkSelections = (tables: CanvasTable[]): CanvasTable[] => {
    return tables.map(t => {
      let columns = t.columns;
      const setSelected = (colName: string) => {
        const idx = columns.findIndex(c => (c.column_name || '').toLowerCase() === (colName || '').toLowerCase());
        if (idx >= 0) columns = [...columns.slice(0, idx), { ...columns[idx], selected: true }, ...columns.slice(idx + 1)];
      };
      (t.foreignKeys || []).forEach(fk => {
        const toTable = tables.find(ot => tableNameMatches(ot.tableName, (fk.foreign_table || '').trim()));
        if (!toTable || toTable.id === t.id) return;
        setSelected(fk.column_name);
      });
      tables.forEach(other => {
        if (other.id === t.id) return;
        (other.foreignKeys || []).forEach(fk => {
          if (!tableNameMatches(t.tableName, (fk.foreign_table || '').trim())) return;
          setSelected(fk.foreign_column);
        });
      });
      return { ...t, columns };
    });
  };

  const addTableToCanvas = (tname: string) => {
    if (!tname) return;
    if (canvasTables.some(ct => ct.tableName === tname)) return;
    setLoadingColumns(true);
    loadTableMeta(tname).then(({ columns: c, foreignKeys: f }) => {
      const nx = canvasTables.length * (BOX_WIDTH + 50);
      const ny = 24;
      const newTable = {
        id: `ct-${Date.now()}-${tname}`,
        tableName: tname,
        x: nx,
        y: ny,
        columns: c,
        foreignKeys: f,
      };
      setCanvasTables(prev => applyFkSelections([...prev, newTable]));
      setSelectedTable(tname);
    }).finally(() => setLoadingColumns(false));
  };

  const removeFromCanvas = (id: string) => {
    setCanvasTables(prev => prev.filter(t => t.id !== id));
  };

  const toggleColumnOnCanvas = (tableId: string, columnName: string) => {
    setCanvasTables(prev => prev.map(t => t.id !== tableId ? t : {
      ...t,
      columns: t.columns.map(c => c.column_name === columnName ? { ...c, selected: !c.selected } : c),
    }));
  };

  const toggleSelectAllOnCanvas = (tableId: string) => {
    setCanvasTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      const allSelected = t.columns.every(c => c.selected);
      return { ...t, columns: t.columns.map(c => ({ ...c, selected: !allSelected })) };
    }));
  };

  const buildSqlFromCanvas = useCallback((tables: CanvasTable[]): string => {
    if (tables.length === 0) return '';
    const schema = 'public';
    const tableRef = (name: string) => name.includes('.') ? name.split('.').map(p => `"${p.replace(/"/g, '""')}"`).join('.') : `"${schema}"."${String(name).replace(/"/g, '""')}"`;
    const colRef = (alias: string, col: string) => `${alias}."${String(col).replace(/"/g, '""')}"`;
    const selectParts: string[] = [];
    tables.forEach((ct, i) => {
      const alias = `t${i + 1}`;
      const selectedCols = ct.columns.filter(c => c.selected).map(c => c.column_name);
      const cols = selectedCols.length === 0 ? [`${alias}.*`] : selectedCols.map(c => colRef(alias, c));
      selectParts.push(...cols);
    });
    const fromTable = tables[0];
    const alias0 = 't1';
    let fromClause = `FROM ${tableRef(fromTable.tableName)} AS ${alias0}`;
    const usedFks = new Set<string>();
    for (let i = 1; i < tables.length; i++) {
      const ct = tables[i];
      const aliasI = `t${i + 1}`;
      let joined = false;
      for (const t of tables) {
        if (joined) break;
        for (const fk of t.foreignKeys || []) {
          const toTable = tables.find(ot => tableNameMatches(ot.tableName, (fk.foreign_table || '').trim()));
          if (!toTable || toTable.id !== ct.id) continue;
          const j = tables.indexOf(t);
          if (j >= i) continue;
          const key = `${t.id}-${ct.id}-${fk.column_name}`;
          if (usedFks.has(key)) continue;
          usedFks.add(key);
          const aliasJ = `t${j + 1}`;
          fromClause += `\nJOIN ${tableRef(ct.tableName)} AS ${aliasI} ON ${colRef(aliasJ, fk.column_name)} = ${colRef(aliasI, fk.foreign_column)}`;
          joined = true;
          break;
        }
      }
      if (!joined) {
        for (const fk of ct.foreignKeys || []) {
          const toTable = tables.find(ot => tableNameMatches(ot.tableName, (fk.foreign_table || '').trim()));
          if (!toTable) continue;
          const j = tables.indexOf(toTable);
          if (j >= i || j < 0) continue;
          const key = `${ct.id}-${toTable.id}-${fk.column_name}`;
          if (usedFks.has(key)) continue;
          usedFks.add(key);
          const aliasJ = `t${j + 1}`;
          fromClause += `\nJOIN ${tableRef(ct.tableName)} AS ${aliasI} ON ${colRef(aliasI, fk.column_name)} = ${colRef(aliasJ, fk.foreign_column)}`;
          joined = true;
          break;
        }
      }
      if (!joined) fromClause += `\nCROSS JOIN ${tableRef(ct.tableName)} AS ${aliasI}`;
    }
    return 'SELECT ' + selectParts.join(', ') + '\n' + fromClause;
  }, []);

  useEffect(() => {
    if (!open || canvasTables.length === 0) return;
    setSqlText(buildSqlFromCanvas(canvasTables));
  }, [open, canvasTables, buildSqlFromCanvas]);

  const getBoxPosition = (t: CanvasTable) => {
    const contentRows = 2 + t.columns.length; // thead + * row + columns
    const contentH = Math.min(contentRows * ROW_HEIGHT, 320);
    return { x: t.x, y: t.y, w: BOX_WIDTH, h: BOX_HEADER + contentH };
  };

  /** مرکز عمودی ردیف ستون داخل باکس: هدر + ردیف سرستون‌ها + ردیف * (همه) + ردیف ستون */
  const getColumnRowCenterY = (t: CanvasTable, columnName: string): number => {
    const idx = t.columns.findIndex(c => (c.column_name || '').toLowerCase() === (columnName || '').toLowerCase());
    if (idx < 0) return t.y + BOX_HEADER + ROW_HEIGHT + ROW_HEIGHT / 2;
    return t.y + BOX_HEADER + (2 + idx) * ROW_HEIGHT + ROW_HEIGHT / 2;
  };

  const connections: { x1: number; y1: number; x2: number; y2: number }[] = [];
  canvasTables.forEach(t => {
    (t.foreignKeys || []).forEach(fk => {
      const toTable = canvasTables.find(ot => tableNameMatches(ot.tableName, (fk.foreign_table || '').trim()));
      if (!toTable || toTable.id === t.id) return;
      const pFrom = getBoxPosition(t);
      const pTo = getBoxPosition(toTable);
      const y1 = getColumnRowCenterY(t, fk.column_name);
      const y2 = getColumnRowCenterY(toTable, fk.foreign_column);
      connections.push({
        x1: pFrom.x + pFrom.w,
        y1,
        x2: pTo.x,
        y2,
      });
    });
  });

  const canvasWidth = Math.max(800, ...canvasTables.map(t => t.x + BOX_WIDTH + 80));
  const canvasHeight = Math.max(500, ...canvasTables.map(t => t.y + getBoxPosition(t).h + 40));

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const el = canvasRef.current;
    const rect = el.getBoundingClientRect();
    const contentX = e.clientX - rect.left + el.scrollLeft;
    const contentY = e.clientY - rect.top + el.scrollTop;
    const newX = Math.max(0, contentX - dragging.offsetX);
    const newY = Math.max(0, contentY - dragging.offsetY);
    setCanvasTables(prev => prev.map(t => t.id !== dragging.id ? t : { ...t, x: newX, y: newY }));
  };

  const handleCanvasMouseUp = () => setDragging(null);

  const runQuery = async () => {
    if (!sqlText.trim()) return;
    setQueryLoading(true);
    setQueryError(null);
    try {
      const { data, error } = await supabase.rpc('exec_read_only_query', { query_text: sqlText });
      if (error) {
        setQueryError(error.message);
        setQueryResult([]);
        return;
      }
      const rows = (data || []).map((r: unknown) => {
        let obj: Record<string, unknown> = {};
        if (typeof r === 'object' && r !== null) {
          const o = r as Record<string, unknown>;
          const keys = Object.keys(o);
          if (keys.length === 1 && typeof o[keys[0]] === 'object' && o[keys[0]] !== null) obj = o[keys[0]] as Record<string, unknown>;
          else obj = o;
        } else if (typeof r === 'string') try { obj = JSON.parse(r) as Record<string, unknown>; } catch { /**/ }
        return obj;
      });
      setQueryResult(rows);
    } catch (e: any) {
      setQueryError(e?.message || 'خطا در اجرای کوئری');
      setQueryResult([]);
    } finally {
      setQueryLoading(false);
    }
  };

  const handleApply = () => {
    onApplySql(sqlText);
    onClose();
  };

  const copySql = () => {
    navigator.clipboard.writeText(sqlText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resultKeys = queryResult.length > 0 ? Object.keys(queryResult[0]) : [];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            ابزار SQL — جداول، ارتباط بصری و نتایج آنلاین
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 grid grid-cols-12 gap-0 min-h-0">
          <div className="col-span-2 flex flex-col border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
            <div className="p-2 border-b font-medium text-xs text-gray-700 dark:text-gray-300">جداول موجود</div>
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input type="text" placeholder="جستجوی نام جدول..." value={searchTable} onChange={e => { setSearchTable(e.target.value); setVisibleTableCount(TABLES_PAGE_SIZE); }} className="w-full p-2 text-sm border rounded-lg bg-white dark:bg-gray-800 placeholder:text-gray-400" />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loadingTables ? <p className="text-xs text-gray-500">در حال بارگذاری...</p> : (
                <>
                  {visibleTables.length === 0 ? (
                    <p className="text-xs text-gray-500 py-2">جدولی با این جستجو یافت نشد.</p>
                  ) : (
                  <ul className="space-y-0.5">
                    {visibleTables.map(t => (
                      <li key={t}>
                        <div
                          draggable
                          onDragStart={(e) => { e.dataTransfer.setData('text/plain', t); e.dataTransfer.effectAllowed = 'copy'; (e.currentTarget as HTMLElement).classList.add('opacity-60'); }}
                          onDragEnd={(e) => (e.currentTarget as HTMLElement).classList.remove('opacity-60')}
                          className="cursor-grab active:cursor-grabbing"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedTable(t)}
                            className={`w-full text-right px-3 py-2 rounded-lg text-xs font-medium truncate block transition-colors ${selectedTable === t ? 'bg-primary/20 text-primary ring-1 ring-primary/40' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            title="درگ کنید و روی بوم رها کنید"
                          >
                            {t}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  )}
                  {hasMoreTables && (
                    <button type="button" onClick={() => setVisibleTableCount(prev => prev + TABLES_PAGE_SIZE)} className="w-full mt-2 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                      نمایش بیشتر (۵ جدول بعدی)
                    </button>
                  )}
                </>
              )}
            </div>
            <p className="text-[10px] text-gray-500 px-2 pb-2">جدول را درگ کنید و روی بوم رها کنید. چند جدول می‌توانید اضافه کنید؛ ارتباط کلید خارجی خودکار رسم می‌شود.</p>
          </div>

          <div className="col-span-6 flex flex-col border-l border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900/50 overflow-hidden">
            <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm font-bold">بوم ارتباط جداول</span>
              <span className="text-xs text-gray-500">با تیک چک‌باکس ستون‌ها کوئری ساخته می‌شود</span>
            </div>
            <div
              ref={canvasRef}
              className={`flex-1 overflow-auto relative min-h-[420px] ${dragging ? 'cursor-grabbing select-none' : ''}`}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; e.currentTarget.classList.add('ring-2', 'ring-primary/50'); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) e.currentTarget.classList.remove('ring-2', 'ring-primary/50'); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
                const tname = e.dataTransfer.getData('text/plain');
                if (tname) addTableToCanvas(tname);
              }}
              style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '12px 12px' }}
            >
              <div className="absolute top-0 left-0 z-0" style={{ width: canvasWidth, height: canvasHeight }}>
                {canvasTables.map(ct => {
                  const contentRows = 2 + ct.columns.length;
                  const contentH = Math.min(contentRows * ROW_HEIGHT, 320);
                  const h = BOX_HEADER + contentH;
                  return (
                    <div
                      key={ct.id}
                      className="absolute bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden"
                      style={{ left: ct.x, top: ct.y, width: BOX_WIDTH, minHeight: h }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!canvasRef.current) return;
                        setSelectedTable(ct.tableName);
                        const el = canvasRef.current;
                        const rect = el.getBoundingClientRect();
                        const contentX = e.clientX - rect.left + el.scrollLeft;
                        const contentY = e.clientY - rect.top + el.scrollTop;
                        setDragging({ id: ct.id, offsetX: contentX - ct.x, offsetY: contentY - ct.y });
                      }}
                    >
                      <div className="px-2 py-1.5 bg-primary/15 dark:bg-primary/20 font-bold text-sm flex items-center justify-between shrink-0">
                        <span className="truncate">{ct.tableName}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeFromCanvas(ct.id); }} className="p-0.5 rounded hover:bg-red-200 text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 320 }}>
                        <table className="w-full text-[11px] border-collapse">
                          <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                            <tr>
                              <th className="w-7 border-b border-r border-gray-200 dark:border-gray-600 p-0.5 text-center" title="چک">☑</th>
                              <th className="border-b border-gray-200 dark:border-gray-600 p-1 text-right font-semibold">نام ستون</th>
                              <th className="border-b border-gray-200 dark:border-gray-600 p-1 text-right font-semibold min-w-[70px]">نوع مقادیر</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-gray-100 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-700/50">
                              <td className="border-r border-gray-200 dark:border-gray-600 p-0.5 text-center">
                                <input type="checkbox" checked={ct.columns.length > 0 && ct.columns.every(c => c.selected)} onChange={() => toggleSelectAllOnCanvas(ct.id)} className="cursor-pointer" onClick={e => e.stopPropagation()} />
                              </td>
                              <td colSpan={2} className="p-1 text-gray-500 font-mono">* (همه)</td>
                            </tr>
                            {ct.columns.map(col => {
                              const isFk = ct.foreignKeys.some(fk => fk.column_name === col.column_name);
                              return (
                                <tr
                                  key={col.column_name}
                                  className={`border-b border-gray-100 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isFk ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                  onClick={() => toggleColumnOnCanvas(ct.id, col.column_name)}
                                >
                                  <td className="border-r border-gray-200 dark:border-gray-600 p-0.5 text-center"><input type="checkbox" checked={!!col.selected} readOnly className="cursor-pointer" /></td>
                                  <td className="p-1 font-mono truncate max-w-[100px]" title={col.column_name}>{col.column_name}</td>
                                  <td className="p-1 text-gray-500 truncate max-w-[80px]" title={col.data_type}>{col.data_type}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
              <svg className="absolute top-0 left-0 pointer-events-none z-10" width={canvasWidth} height={canvasHeight}>
                <defs>
                  <marker id="arrowhead-qb" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#2563eb" />
                  </marker>
                </defs>
                {connections.map((conn, i) => {
                  const { x1, y1, x2, y2 } = conn;
                  const xMid = x1 + (x2 - x1) / 2;
                  const d = `M ${x1} ${y1} H ${xMid} V ${y2} H ${x2}`;
                  return (
                    <path key={`fk-${i}-${x1}-${y1}-${x2}-${y2}`} d={d} fill="none" stroke="#2563eb" strokeWidth="2.5" markerEnd="url(#arrowhead-qb)" />
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="col-span-4 flex flex-col border-l border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* محیط کوئری متنی */}
            <div className="shrink-0 border-b-2 border-gray-300 dark:border-gray-600">
              <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 flex-wrap bg-gray-50 dark:bg-gray-900/70">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">کوئری متنی</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={copySql} className="p-1.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300" title="کپی">{copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}</button>
                  <button type="button" onClick={runQuery} disabled={queryLoading || !sqlText.trim()} className="px-3 py-1.5 rounded bg-green-600 text-white text-xs font-bold disabled:opacity-50">
                    {queryLoading ? '...' : 'اجرای کوئری'}
                  </button>
                </div>
              </div>
              <textarea value={sqlText} onChange={e => setSqlText(e.target.value)} placeholder="SELECT ... FROM public.table_name ..." className="w-full h-36 p-3 text-xs font-mono border-0 resize-none focus:ring-0 bg-white dark:bg-gray-800" dir="ltr" spellCheck={false} />
            </div>
            {/* محیط نتایج */}
            <div className="flex-1 flex flex-col min-h-0 border-t-2 border-gray-300 dark:border-gray-600">
              <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/70">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">نتایج</span>
                {queryResult.length > 0 && <span className="text-xs text-gray-500">{queryResult.length} رکورد</span>}
              </div>
              <div className="flex-1 overflow-auto min-h-0">
                {queryError && <p className="p-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20">{queryError}</p>}
                {!queryError && queryResult.length > 0 && (
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
                      <tr>
                        {resultKeys.map(k => <th key={k} className="border border-gray-200 dark:border-gray-600 p-1.5 text-right font-bold truncate max-w-[120px]" title={k}>{k}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          {resultKeys.map(k => <td key={k} className="border border-gray-200 dark:border-gray-600 p-1.5 truncate max-w-[120px]" title={String(row[k] ?? '')}>{String(row[k] ?? '')}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {!queryError && queryResult.length === 0 && !queryLoading && <p className="p-4 text-gray-500 text-sm">کوئری را بنویسید و «اجرای کوئری» را بزنید.</p>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">انصراف</button>
          <button type="button" onClick={handleApply} className="px-4 py-2 rounded-lg bg-primary text-white font-bold">اعمال کوئری</button>
        </div>
      </div>
    </div>
  );
};
