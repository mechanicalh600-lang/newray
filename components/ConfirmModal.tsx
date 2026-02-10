
import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'تایید حذف',
  message = 'آیا از حذف این مورد اطمینان دارید؟ این عملیات غیرقابل بازگشت است.',
  confirmText = 'بله، حذف شود',
  cancelText = 'انصراف',
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all animate-scaleIn border border-gray-100 dark:border-gray-700"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6 text-center">
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg ${
            variant === 'danger' ? 'bg-red-50 dark:bg-red-900/20 text-red-600' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'
          }`}>
            {variant === 'danger' ? <Trash2 className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
          
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8">
            {message}
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-3 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95 ${
                variant === 'danger' 
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-none' 
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
