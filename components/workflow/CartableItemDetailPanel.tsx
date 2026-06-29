import React, { useEffect, useMemo, useState } from 'react';
import { CartableItem, User, WorkflowAction } from '../../types';
import {
  extractCartableCollections,
  extractCartableFields,
  getCartableTheme,
} from '../../config/cartableFieldLabels';
import { fetchMasterData } from '../../workflowStore';
import {
  X, Send, ArrowRightCircle, UserPlus, Loader2, MessageSquare,
  Hash, Calendar, Layers,
} from 'lucide-react';

interface Props {
  item: CartableItem;
  user: User;
  categoryLabel: string;
  stepTitle: string;
  actions: WorkflowAction[];
  onClose: () => void;
  onWorkflowAction: (actionId: string, comment: string) => Promise<void>;
  onSendComment: (comment: string) => Promise<void>;
  onRefer: (targetUserId: string, targetUserName: string, targetRole: string, comment: string) => Promise<void>;
}

export const CartableItemDetailPanel: React.FC<Props> = ({
  item,
  user,
  categoryLabel,
  stepTitle,
  actions,
  onClose,
  onWorkflowAction,
  onSendComment,
  onRefer,
}) => {
  const theme = getCartableTheme(item.module);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [showReferModal, setShowReferModal] = useState(false);
  const [usersList, setUsersList] = useState<{ id: string; name: string; role: string }[]>([]);
  const [referUserId, setReferUserId] = useState('');
  const [referNote, setReferNote] = useState('');

  const fields = useMemo(() => extractCartableFields(item.module, item.data as Record<string, unknown>), [item]);
  const collections = useMemo(() => extractCartableCollections(item.data as Record<string, unknown>), [item]);

  const nextAction = useMemo(
    () => actions.find(a => a.style === 'primary' || a.style === 'success') || actions.find(a => a.style !== 'danger'),
    [actions]
  );
  const sendAction = useMemo(
    () => actions.find(a => a.style === 'neutral') || actions[0],
    [actions]
  );

  useEffect(() => {
    if (!showReferModal) return;
    (async () => {
      const appUsers = await fetchMasterData('app_users');
      const personnel = await fetchMasterData('personnel');
      setUsersList(
        (appUsers || [])
          .filter((u: { id: string }) => u.id !== user.id)
          .map((u: { id: string; username?: string; role?: string; personnel_id?: string }) => {
            const person = (personnel || []).find((p: { id: string }) => p.id === u.personnel_id);
            return {
              id: u.id,
              name: person?.full_name || u.username || u.id,
              role: u.role || 'USER',
            };
          })
      );
    })();
  }, [showReferModal, user.id]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden animate-fadeIn bg-white dark:bg-gray-800">
      {/* Header */}
      <div className={`relative shrink-0 bg-gradient-to-l ${theme.gradient} text-white px-5 py-5`}>
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0 text-right" dir="rtl">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-[11px] font-bold bg-white/20 backdrop-blur px-2.5 py-1 rounded-full">
                {categoryLabel}
              </span>
              {item.trackingCode && (
                <span className="text-[11px] font-mono bg-black/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Hash className="w-3 h-3" /> {item.trackingCode}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold leading-snug">{item.title}</h2>
            {item.description && (
              <p className="text-sm text-white/85 mt-1 line-clamp-2">{item.description}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {stepTitle && (
                <span className="text-xs bg-white/15 px-2 py-1 rounded-lg flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> {stepTitle}
                </span>
              )}
              <span className="text-xs bg-white/15 px-2 py-1 rounded-lg flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {item.updatedAt}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/15 hover:bg-white/25 transition shrink-0"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5" dir="rtl">
        <section>
          <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> اطلاعات درخواست
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(f => (
              <div
                key={f.key}
                className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/40 dark:to-gray-800 p-3.5 hover:shadow-sm transition"
              >
                <p className="text-[11px] text-gray-400 mb-1">{f.label}</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 break-words">{f.value}</p>
              </div>
            ))}
          </div>
        </section>

        {collections.map(col => (
          <section key={col.key}>
            <h3 className="text-sm font-bold text-gray-500 mb-3">{col.label}</h3>
            <div className="rounded-xl border dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {col.items.slice(0, 8).map((row, idx) => (
                    <tr key={idx} className="border-b dark:border-gray-700 last:border-0 odd:bg-gray-50/50 dark:odd:bg-gray-900/30">
                      <td className="p-2.5 text-gray-600 dark:text-gray-300">
                        {typeof row === 'object' && row !== null
                          ? Object.entries(row as Record<string, unknown>)
                              .filter(([k]) => !['id', 'part_id'].includes(k))
                              .slice(0, 4)
                              .map(([k, v]) => `${k}: ${String(v ?? '')}`)
                              .join(' · ')
                          : String(row)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {col.items.length > 8 && (
                <p className="text-xs text-center text-gray-400 py-2">+ {col.items.length - 8} مورد دیگر</p>
              )}
            </div>
          </section>
        ))}

        <section>
          <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-2">
            توضیحات / دستور کار
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="w-full p-3.5 border border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-900/40 focus:ring-2 focus:ring-primary/30 outline-none text-sm min-h-[88px]"
            placeholder="یادداشت، دستور یا توضیح ارجاع را بنویسید..."
            rows={3}
          />
        </section>
      </div>

      {/* Actions */}
      <div className="shrink-0 p-4 border-t dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run('send', async () => {
              if (sendAction) {
                await onWorkflowAction(sendAction.id, comment);
              } else {
                await onSendComment(comment);
                onClose();
              }
            })}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 hover:border-primary hover:text-primary transition disabled:opacity-50"
          >
            {busy === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sendAction ? (sendAction.label || 'ارسال') : 'ارسال یادداشت'}
          </button>

          <button
            type="button"
            disabled={!!busy || !nextAction}
            onClick={() => nextAction && run('next', () => onWorkflowAction(nextAction.id, comment))}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md transition disabled:opacity-40"
          >
            {busy === 'next' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightCircle className="w-4 h-4" />}
            {nextAction?.label || 'مرحله بعد'}
          </button>

          <button
            type="button"
            disabled={!!busy}
            onClick={() => setShowReferModal(true)}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-md transition disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" /> ارجاع
          </button>
        </div>

        {actions.length > 1 && (
          <div className="flex flex-wrap gap-2 pt-1 border-t dark:border-gray-700">
            <span className="text-xs text-gray-400 w-full mb-1">سایر اقدامات گردش کار:</span>
            {actions
              .filter(a => a.id !== nextAction?.id && a.id !== sendAction?.id)
              .map(action => (
                <button
                  key={action.id}
                  type="button"
                  disabled={!!busy}
                  onClick={() => run(action.id, () => onWorkflowAction(action.id, comment))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50
                    ${action.style === 'danger' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}
                  `}
                >
                  {action.label}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Refer modal */}
      {showReferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4" dir="rtl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" /> ارجاع به کاربر
              </h3>
              <button type="button" onClick={() => setShowReferModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <select
              value={referUserId}
              onChange={e => setReferUserId(e.target.value)}
              className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">انتخاب کاربر...</option>
              {usersList.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <textarea
              value={referNote}
              onChange={e => setReferNote(e.target.value)}
              placeholder="توضیح ارجاع (اختیاری)"
              className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 text-sm"
              rows={2}
            />
            <button
              type="button"
              disabled={!referUserId || busy === 'refer'}
              onClick={() => {
                const target = usersList.find(u => u.id === referUserId);
                if (!target) return;
                run('refer', async () => {
                  await onRefer(target.id, target.name, target.role, referNote || comment);
                  setShowReferModal(false);
                });
              }}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy === 'refer' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              تأیید ارجاع
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
