import React from 'react';
import { fetchMatrixCellQuery, fetchMatrixCellCustomSql } from '../workflowStore';

type CellSource = { type: 'manual' } | { type: 'query'; table: string; op?: string; column?: string } | { type: 'custom_sql'; sql: string };

interface MatrixCellInputProps {
  row: string;
  col: string;
  field: { key?: string; matrixConfig?: { cellSources?: Record<string, Record<string, CellSource>>; defaultValue?: string } };
  current: Record<string, Record<string, string>> | undefined;
  updateMatrix: (updater: (prev: Record<string, Record<string, string>>) => Record<string, Record<string, string>>) => void;
  readOnly: boolean;
  rows: string[];
}

export const MatrixCellInput: React.FC<MatrixCellInputProps> = ({ row, col, field, current, updateMatrix, readOnly, rows }) => {
  const src = field.matrixConfig?.cellSources?.[row]?.[col];
  const isQuery = src?.type === 'query' && src.table;
  const isCustomSql = src?.type === 'custom_sql' && src.sql?.trim();
  const isFetchable = isQuery || isCustomSql;
  const [loading, setLoading] = React.useState(false);
  const fetchedRef = React.useRef(false);
  React.useEffect(() => {
    if (!isFetchable || !src) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    const promise = isCustomSql && src.type === 'custom_sql'
      ? fetchMatrixCellCustomSql(src.sql).then((s) => s)
      : isQuery && src.type === 'query'
        ? fetchMatrixCellQuery(src.table, src.op || 'count', src.column).then((n) => String(n))
        : Promise.resolve('');
    promise
      .then((val) => {
        updateMatrix((prev) => {
          const p = prev || {};
          const allRows = new Set([...rows, ...Object.keys(p)]);
          const next: Record<string, Record<string, string>> = {};
          for (const r of allRows) next[r] = { ...(p[r] || {}) };
          next[row] = { ...(next[row] || {}), [col]: val };
          return next;
        });
      })
      .finally(() => setLoading(false));
  }, [isFetchable, isQuery, isCustomSql, src?.table, src?.op, (src as any)?.sql, row, col, updateMatrix, rows]);
  if (isFetchable) {
    const val = current?.[row]?.[col];
    return (
      <div className={`w-full p-1.5 border rounded text-center font-medium min-h-[28px] flex items-center justify-center ${isCustomSql ? 'bg-violet-50/70 dark:bg-violet-900/20' : 'bg-amber-50/70 dark:bg-amber-900/20'}`}>
        {loading ? '...' : (val ?? '—')}
      </div>
    );
  }
  return (
    <input
      type="text"
      className="w-full p-1.5 border rounded bg-white dark:bg-gray-700"
      value={String(current?.[row]?.[col] ?? field.matrixConfig?.defaultValue ?? '')}
      onChange={(e) => {
        const newVal = e.target.value;
        updateMatrix((prev) => {
          const p = prev || {};
          const allRows = new Set([...rows, ...Object.keys(p)]);
          const next: Record<string, Record<string, string>> = {};
          for (const r of allRows) next[r] = { ...(p[r] || {}) };
          next[row] = { ...(next[row] || {}), [col]: newVal };
          return next;
        });
      }}
      disabled={readOnly}
    />
  );
};
