import React from 'react';
import { CartableItem } from '../../types';
import { getCartableTheme } from '../../config/cartableFieldLabels';
import { Clock, ChevronLeft, Sparkles } from 'lucide-react';

interface Props {
  item: CartableItem;
  categoryLabel: string;
  isUnread: boolean;
  onOpen: () => void;
}

export const CartableItemListCard: React.FC<Props> = ({ item, categoryLabel, isUnread, onOpen }) => {
  const theme = getCartableTheme(item.module);
  const status = String(item.data?.status || '—');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => e.key === 'Enter' && onOpen()}
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 cursor-pointer
        hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]
        ${isUnread
          ? 'border-primary/30 shadow-md ring-1 ring-primary/20 bg-white dark:bg-gray-800'
          : 'border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90'}
      `}
    >
      <div className={`absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b ${theme.gradient}`} />

      <div className="p-4 pr-5 flex gap-4 items-start">
        <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${theme.iconBg}`}>
          <Sparkles className={`w-5 h-5 ${theme.accent}`} />
        </div>

        <div className="flex-1 min-w-0 text-right" dir="rtl">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.accentBg} ${theme.accent}`}>
              {categoryLabel}
            </span>
            {item.trackingCode && (
              <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                {item.trackingCode}
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
              {status}
            </span>
          </div>

          <h4 className={`text-base leading-snug truncate ${isUnread ? 'font-black text-gray-900 dark:text-white' : 'font-bold text-gray-700 dark:text-gray-200'}`}>
            {item.title}
          </h4>

          {item.description && (
            <p className={`text-sm mt-1 line-clamp-2 ${isUnread ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500'}`}>
              {item.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
            <ChevronLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 transition text-primary" />
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {item.updatedAt}
            </span>
          </div>
        </div>
      </div>

      {isUnread && (
        <span className="absolute top-3 left-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
      )}
    </div>
  );
};
