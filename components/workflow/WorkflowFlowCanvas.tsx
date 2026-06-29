import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowAction,
  UserRole,
} from '../../types';
import {
  Trash2,
  X,
  Circle,
  Flag,
  Play,
  Link2,
  Users,
  Mail,
  Palette,
  GripHorizontal,
} from 'lucide-react';
import { generateId } from '../../utils';

export interface StatusOption {
  code: string;
  name: string;
}

interface Props {
  workflow: WorkflowDefinition;
  statusOptions: StatusOption[];
  workTypes: { code?: string; name?: string; title?: string; id?: string }[];
  personnel: { id: string; full_name?: string; fullName?: string }[];
  conditionFieldOptions: { key: string; label: string }[];
  onChange: (wf: WorkflowDefinition) => void;
}

const GRID = 24;
const NODE_W = 200;
const NODE_H = 96;
const CANVAS_W = 2800;
const CANVAS_H = 1800;

const ROLE_OPTIONS: { value: UserRole | 'INITIATOR'; label: string }[] = [
  ...Object.values(UserRole).map(r => ({ value: r as UserRole | 'INITIATOR', label: r })),
  { value: 'INITIATOR', label: 'ثبت‌کننده' },
];

const LINE_COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4', '#a855f7', '#64748b'];

type Point = { x: number; y: number };

interface EdgeVisual {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  color: string;
  dashed?: boolean;
  actionId?: string;
  conditionId?: string;
}

const snap = (v: number) => Math.round(v / GRID) * GRID;

const bezierPath = (a: Point, b: Point) => {
  const dx = Math.max(48, Math.abs(b.x - a.x) * 0.45);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
};

const getPort = (step: WorkflowStep, side: 'out' | 'in'): Point => {
  const x = step.layout?.x ?? 100;
  const y = step.layout?.y ?? 100;
  return {
    x: x + (side === 'out' ? NODE_W : 0),
    y: y + NODE_H / 2,
  };
};

const blankAction = (): WorkflowAction => ({
  id: generateId(),
  label: 'انتقال',
  nextStepId: 'FINISH',
  style: 'primary',
  lineColor: '#6366f1',
  conditions: [],
});

export const WorkflowFlowCanvas: React.FC<Props> = ({
  workflow,
  statusOptions,
  personnel,
  onChange,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<Point | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; grabX: number; grabY: number } | null>(null);
  const workflowRef = useRef(workflow);
  workflowRef.current = workflow;

  const selectedStep = workflow.steps.find(s => s.id === selectedId) || null;

  const statusName = useCallback(
    (code: string) => statusOptions.find(s => s.code === code)?.name || code,
    [statusOptions]
  );

  const updateSteps = (steps: WorkflowStep[]) => onChange({ ...workflow, steps });

  const updateStep = (id: string, patch: Partial<WorkflowStep>) => {
    updateSteps(workflow.steps.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };

  const setStartStep = (id: string) => {
    updateSteps(
      workflow.steps.map(s => ({
        ...s,
        isStart: s.id === id,
        isFinish: s.id === id ? false : s.isFinish,
      }))
    );
  };

  const setFinishStep = (id: string, on: boolean) => {
    updateStep(id, { isFinish: on, isStart: on ? false : selectedStep?.isStart });
  };

  const toggleUserList = (stepId: string, field: 'recipientUserIds' | 'ccUserIds', userId: string) => {
    const step = workflow.steps.find(s => s.id === stepId);
    if (!step) return;
    const list = step[field] || [];
    const next = list.includes(userId) ? list.filter(x => x !== userId) : [...list, userId];
    updateStep(stepId, { [field]: next });
  };

  const addStateAt = (x: number, y: number) => {
    const layout = { x: snap(x - NODE_W / 2), y: snap(y - NODE_H / 2) };
    const isFirst = workflow.steps.length === 0;
    const step: WorkflowStep = {
      id: generateId(),
      title: 'استیت جدید',
      statusCode: statusOptions[0]?.code || 'PENDING',
      assigneeRole: UserRole.USER,
      layout,
      isStart: isFirst,
      isFinish: false,
      recipientUserIds: [],
      ccUserIds: [],
      actions: [],
    };
    onChange({ ...workflow, steps: [...workflow.steps, step] });
    setSelectedId(step.id);
    setContextMenu(null);
  };

  const deleteStep = (id: string) => {
    onChange({
      ...workflow,
      steps: workflow.steps
        .filter(s => s.id !== id)
        .map(s => ({
          ...s,
          actions: s.actions.map(a => ({
            ...a,
            nextStepId: a.nextStepId === id ? 'FINISH' : a.nextStepId,
            conditions: (a.conditions || []).map(c => ({
              ...c,
              nextStepId: c.nextStepId === id ? 'FINISH' : c.nextStepId,
            })),
          })),
        })),
    });
    if (selectedId === id) setSelectedId(null);
  };

  const applyConnection = (fromId: string, toId: string) => {
    const target = workflow.steps.find(s => s.id === toId);
    const toStepId = target?.isFinish ? toId : toId;
    const steps = workflow.steps.map(s => {
      if (s.id !== fromId) return s;
      const label = target ? `→ ${target.title}` : 'انتقال';
      if (!s.actions.length) {
        return { ...s, actions: [{ ...blankAction(), label, nextStepId: toStepId }] };
      }
      const actions = [...s.actions];
      actions[0] = { ...actions[0], nextStepId: toStepId, label };
      return { ...s, actions };
    });
    onChange({ ...workflow, steps });
  };

  const collectEdges = (): EdgeVisual[] => {
    const edges: EdgeVisual[] = [];
    workflow.steps.forEach(step => {
      step.actions.forEach(action => {
        if (action.nextStepId !== 'FINISH') {
          edges.push({
            id: `a-${action.id}`,
            fromId: step.id,
            toId: action.nextStepId,
            label: action.label,
            color: action.lineColor || '#6366f1',
            actionId: action.id,
          });
        }
        (action.conditions || []).forEach(cond => {
          if (cond.nextStepId !== 'FINISH') {
            edges.push({
              id: `c-${cond.id}`,
              fromId: step.id,
              toId: cond.nextStepId,
              label: `${cond.field}=${cond.value || '?'}`,
              color: cond.lineColor || '#a855f7',
              dashed: true,
              conditionId: cond.id,
            });
          }
        });
      });
    });
    return edges;
  };

  const edges = collectEdges();

  const updateEdgeColor = (edgeId: string, color: string) => {
    const steps = workflow.steps.map(step => ({
      ...step,
      actions: step.actions.map(a => {
        if (`a-${a.id}` === edgeId) return { ...a, lineColor: color };
        return {
          ...a,
          conditions: (a.conditions || []).map(c =>
            `c-${c.id}` === edgeId ? { ...c, lineColor: color } : c
          ),
        };
      }),
    }));
    onChange({ ...workflow, steps });
  };

  const canvasPoint = (e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left + canvas.scrollLeft,
      y: e.clientY - rect.top + canvas.scrollTop,
    };
  };

  const beginDrag = (stepId: string, clientX: number, clientY: number, nodeX: number, nodeY: number) => {
    const p = canvasPoint({ clientX, clientY } as MouseEvent);
    dragRef.current = { id: stepId, grabX: p.x - nodeX, grabY: p.y - nodeY };
    setDragNodeId(stepId);
  };

  useEffect(() => {
    if (!connectFrom && !dragNodeId) return;
    const onMove = (e: MouseEvent) => {
      if (connectFrom) setMousePos(canvasPoint(e));
      const drag = dragRef.current;
      if (drag) {
        const p = canvasPoint(e);
        const nx = Math.max(0, p.x - drag.grabX);
        const ny = Math.max(0, p.y - drag.grabY);
        const wf = workflowRef.current;
        onChange({
          ...wf,
          steps: wf.steps.map(s =>
            s.id === drag.id ? { ...s, layout: { x: nx, y: ny } } : s
          ),
        });
      }
    };
    const onUp = () => {
      if (connectFrom && hoverTarget && hoverTarget !== connectFrom) {
        applyConnection(connectFrom, hoverTarget);
      }
      const drag = dragRef.current;
      if (drag) {
        const wf = workflowRef.current;
        const step = wf.steps.find(s => s.id === drag.id);
        if (step) {
          const x = step.layout?.x ?? 0;
          const y = step.layout?.y ?? 0;
          onChange({
            ...wf,
            steps: wf.steps.map(s =>
              s.id === drag.id ? { ...s, layout: { x: snap(x), y: snap(y) } } : s
            ),
          });
        }
      }
      dragRef.current = null;
      setConnectFrom(null);
      setMousePos(null);
      setHoverTarget(null);
      setDragNodeId(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectFrom, hoverTarget, dragNodeId]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const selectedEdge = edges.find(e => e.id === selectedEdgeId);

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[520px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner bg-slate-100 dark:bg-gray-900">
      {/* ── بوم شطرنجی ── */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-auto cursor-default select-none"
        dir="ltr"
        onContextMenu={e => {
          e.preventDefault();
          setContextMenu(canvasPoint(e));
          setSelectedId(null);
        }}
        onClick={() => {
          setSelectedId(null);
          setSelectedEdgeId(null);
        }}
      >
        {/* پس‌زمینه شطرنجی */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            backgroundColor: '#eef2f7',
            backgroundImage: `
              linear-gradient(rgba(148,163,184,0.35) 1px, transparent 1px),
              linear-gradient(90deg, rgba(148,163,184,0.35) 1px, transparent 1px),
              linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
              linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
              linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)`,
            backgroundSize: `${GRID}px ${GRID}px, ${GRID}px ${GRID}px, 96px 96px, 96px 96px, 96px 96px, 96px 96px`,
            backgroundPosition: '0 0, 0 0, 0 0, 0 48px, 48px -48px, -48px 0',
          }}
        />

        <svg
          className="absolute top-0 left-0 pointer-events-none z-[1]"
          width={CANVAS_W}
          height={CANVAS_H}
        >
          <defs>
            {LINE_COLORS.map(c => (
              <marker key={c} id={`arr-${c.replace('#', '')}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill={c} />
              </marker>
            ))}
          </defs>
          {edges.map(edge => {
            const from = workflow.steps.find(s => s.id === edge.fromId);
            const to = workflow.steps.find(s => s.id === edge.toId);
            if (!from || !to) return null;
            const a = getPort(from, 'out');
            const b = getPort(to, 'in');
            const markerKey = LINE_COLORS.includes(edge.color) ? edge.color.replace('#', '') : '6366f1';
            const marker = `url(#arr-${markerKey})`;
            return (
              <g
                key={edge.id}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedEdgeId(edge.id);
                  setSelectedId(null);
                }}
              >
                <path
                  d={bezierPath(a, b)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                />
                <path
                  d={bezierPath(a, b)}
                  fill="none"
                  stroke={edge.color}
                  strokeWidth={selectedEdgeId === edge.id ? 3.5 : 2.5}
                  strokeDasharray={edge.dashed ? '8 5' : undefined}
                  markerEnd={marker}
                  opacity={selectedEdgeId && selectedEdgeId !== edge.id ? 0.35 : 1}
                  style={{ pointerEvents: 'none' }}
                />
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 8} textAnchor="middle" fontSize="10" fill="#64748b">
                  {edge.label.length > 20 ? edge.label.slice(0, 18) + '…' : edge.label}
                </text>
              </g>
            );
          })}
          {connectFrom && mousePos && (() => {
            const from = workflow.steps.find(s => s.id === connectFrom);
            if (!from) return null;
            return (
              <path
                d={bezierPath(getPort(from, 'out'), mousePos)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={2.5}
                strokeDasharray="6 4"
              />
            );
          })()}
        </svg>

        {/* استیت‌ها */}
        <div className="relative z-[2]" style={{ width: CANVAS_W, height: CANVAS_H }}>
          {workflow.steps.map(step => {
            const x = step.layout?.x ?? 100;
            const y = step.layout?.y ?? 100;
            const isSel = selectedId === step.id;
            return (
              <div
                key={step.id}
                className={`absolute rounded-xl shadow-lg border-2 cursor-grab active:cursor-grabbing ${
                  dragNodeId === step.id ? '' : 'transition-shadow'
                } ${
                  step.isStart
                    ? 'border-emerald-500 bg-gradient-to-br from-white to-emerald-50'
                    : step.isFinish
                      ? 'border-rose-500 bg-gradient-to-br from-white to-rose-50'
                      : 'border-slate-300 bg-white dark:bg-gray-800 dark:border-gray-600'
                } ${isSel ? 'ring-4 ring-primary/40 shadow-xl' : ''} ${hoverTarget === step.id ? 'ring-4 ring-amber-300' : ''}`}
                style={{ left: x, top: y, width: NODE_W, minHeight: NODE_H }}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedId(step.id);
                  setSelectedEdgeId(null);
                }}
                onMouseDown={e => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  beginDrag(step.id, e.clientX, e.clientY, x, y);
                }}
                onMouseEnter={() => connectFrom && setHoverTarget(step.id)}
                onMouseLeave={() => connectFrom && hoverTarget === step.id && setHoverTarget(null)}
              >
                <div
                  className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-100 dark:border-gray-700 bg-slate-50/80 dark:bg-gray-900/40 rounded-t-[10px]"
                >
                  <GripHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {step.isStart && <Play className="w-3 h-3 text-emerald-600" />}
                  {step.isFinish && <Flag className="w-3 h-3 text-rose-600" />}
                  <span className="text-xs font-bold truncate flex-1 text-right" dir="rtl">
                    {step.title}
                  </span>
                </div>
                <div className="px-2 py-1.5 text-[10px] text-slate-500 text-right" dir="rtl">
                  {statusName(step.statusCode)}
                </div>
                <div className="flex justify-between items-center px-2 pb-2">
                  <button
                    type="button"
                    title="کشیدن خط به استیت دیگر"
                    className="w-5 h-5 rounded-full bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center cursor-pointer"
                    onMouseDown={e => {
                      e.stopPropagation();
                      e.preventDefault();
                      dragRef.current = null;
                      setDragNodeId(null);
                      setConnectFrom(step.id);
                      setMousePos(canvasPoint(e));
                    }}
                  >
                    <Link2 className="w-3 h-3 text-white" />
                  </button>
                  {(step.recipientUserIds?.length || 0) > 0 && (
                    <Users className="w-3 h-3 text-slate-400" />
                  )}
                  {(step.ccUserIds?.length || 0) > 0 && (
                    <Mail className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* منوی راست‌کلیک */}
        {contextMenu && (
          <div
            className="absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border py-1 min-w-[160px] text-sm"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              className="w-full text-right px-4 py-2 hover:bg-primary/10 text-primary font-medium"
              dir="rtl"
              onClick={() => addStateAt(contextMenu.x, contextMenu.y)}
            >
              + استیت جدید
            </button>
          </div>
        )}

        {workflow.steps.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-400 text-sm bg-white/80 px-6 py-3 rounded-xl shadow" dir="rtl">
              راست‌کلیک کنید و «استیت جدید» بسازید
            </p>
          </div>
        )}
      </div>

      {/* ── پنل تنظیمات ── */}
      <aside
        className="w-[min(100%,380px)] shrink-0 border-r dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {selectedEdge && !selectedStep ? (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" /> رنگ خط
              </h3>
              <button type="button" onClick={() => setSelectedEdgeId(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500">{selectedEdge.label}</p>
            <div className="flex flex-wrap gap-2">
              {LINE_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${selectedEdge.color === c ? 'border-gray-800 scale-110' : 'border-white'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => updateEdgeColor(selectedEdge.id, c)}
                />
              ))}
            </div>
            <input
              type="color"
              value={selectedEdge.color}
              onChange={e => updateEdgeColor(selectedEdge.id, e.target.value)}
              className="w-full h-10 rounded cursor-pointer"
            />
          </div>
        ) : selectedStep ? (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">تنظیمات استیت</h3>
              <button
                type="button"
                onClick={() => deleteStep(selectedStep.id)}
                className="text-red-500 hover:text-red-700 p-1"
                title="حذف استیت"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500">نام استیت</label>
              <input
                className="w-full p-2 border rounded-lg text-sm"
                value={selectedStep.title}
                onChange={e => updateStep(selectedStep.id, { title: e.target.value })}
                placeholder="مثال: در حال انجام"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500">کد وضعیت</label>
              <input
                list="wf-status-codes"
                className="w-full p-2 border rounded-lg text-sm font-mono"
                value={selectedStep.statusCode}
                onChange={e =>
                  updateStep(selectedStep.id, {
                    statusCode: e.target.value.toUpperCase().replace(/\s+/g, '_'),
                  })
                }
                placeholder="مثال: IN_PROGRESS"
              />
              <datalist id="wf-status-codes">
                {statusOptions.map(s => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </datalist>
              <p className="text-[10px] text-gray-400">
                معادل: {statusName(selectedStep.statusCode)}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!selectedStep.isStart}
                  onChange={e => e.target.checked && setStartStep(selectedStep.id)}
                />
                <Play className="w-3.5 h-3.5 text-emerald-600" />
                استیت آغازین
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!selectedStep.isFinish}
                  onChange={e => setFinishStep(selectedStep.id, e.target.checked)}
                />
                <Flag className="w-3.5 h-3.5 text-rose-600" />
                استیت پایانی
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> گیرندگان (نقش)
              </label>
              <select
                className="w-full p-2 border rounded-lg text-sm"
                value={selectedStep.assigneeRole}
                onChange={e =>
                  updateStep(selectedStep.id, { assigneeRole: e.target.value as WorkflowStep['assigneeRole'] })
                }
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500">گیرندگان (کاربران)</label>
              <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                {personnel.length ? (
                  personnel.map(p => (
                    <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(selectedStep.recipientUserIds || []).includes(p.id)}
                        onChange={() => toggleUserList(selectedStep.id, 'recipientUserIds', p.id)}
                      />
                      {p.full_name || p.fullName || p.id}
                    </label>
                  ))
                ) : (
                  <p className="text-[10px] text-gray-400">لیست پرسنل خالی است</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> رونوشت (CC)
              </label>
              <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                {personnel.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(selectedStep.ccUserIds || []).includes(p.id)}
                      onChange={() => toggleUserList(selectedStep.id, 'ccUserIds', p.id)}
                    />
                    {p.full_name || p.fullName || p.id}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5" /> خطوط خروجی
              </label>
              {selectedStep.actions.length === 0 ? (
                <p className="text-[10px] text-gray-400">از دکمه آبی استیت، خط بکشید به استیت دیگر</p>
              ) : (
                selectedStep.actions.map(action => {
                  const target =
                    action.nextStepId === 'FINISH'
                      ? 'پایان'
                      : workflow.steps.find(s => s.id === action.nextStepId)?.title || '—';
                  return (
                    <div key={action.id} className="p-2 bg-slate-50 rounded-lg space-y-1">
                      <input
                        className="w-full text-xs border-b bg-transparent outline-none"
                        value={action.label}
                        onChange={e => {
                          const actions = selectedStep.actions.map(a =>
                            a.id === action.id ? { ...a, label: e.target.value } : a
                          );
                          updateStep(selectedStep.id, { actions });
                        }}
                        placeholder="برچسب خط"
                      />
                      <p className="text-[10px] text-gray-500">مقصد: {target}</p>
                      <div className="flex gap-1 flex-wrap">
                        {LINE_COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            className={`w-5 h-5 rounded-full border ${action.lineColor === c ? 'border-gray-800' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                            onClick={() => {
                              const actions = selectedStep.actions.map(a =>
                                a.id === action.id ? { ...a, lineColor: c } : a
                              );
                              updateStep(selectedStep.id, { actions });
                            }}
                          />
                        ))}
                        <input
                          type="color"
                          value={action.lineColor || '#6366f1'}
                          onChange={e => {
                            const actions = selectedStep.actions.map(a =>
                              a.id === action.id ? { ...a, lineColor: e.target.value } : a
                            );
                            updateStep(selectedStep.id, { actions });
                          }}
                          className="w-6 h-6 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  );
                })
              )}
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() =>
                  updateStep(selectedStep.id, { actions: [...selectedStep.actions, blankAction()] })
                }
              >
                + خط خروجی دیگر
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-400 text-sm space-y-2">
            <Circle className="w-10 h-10 mx-auto opacity-30" />
            <p>یک استیت را کلیک کنید</p>
            <p className="text-xs">یا راست‌کلیک → استیت جدید</p>
            <p className="text-xs">روی خط کلیک کنید → تغییر رنگ</p>
          </div>
        )}
      </aside>
    </div>
  );
};

export default WorkflowFlowCanvas;
