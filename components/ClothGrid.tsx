
import React, { useState, useRef, useEffect } from 'react';
import { Grid3X3, Check, X, CheckSquare, Square } from 'lucide-react';

interface Props {
  title: string;
  selectedCloths: string[]; // Array of IDs like "D1-C5"
  onChange: (newSelection: string[]) => void;
}

export const ClothGrid: React.FC<Props> = ({ title, selectedCloths, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleCloth = (disc: number, cloth: number) => {
    const id = `D${disc}-C${cloth}`;
    if (selectedCloths.includes(id)) {
      onChange(selectedCloths.filter(c => c !== id));
    } else {
      onChange([...selectedCloths, id]);
    }
  };

  const toggleDiscAll = (disc: number) => {
      const allIds = Array.from({ length: 20 }).map((_, i) => `D${disc}-C${i + 1}`);
      const areAllSelected = allIds.every(id => selectedCloths.includes(id));

      if (areAllSelected) {
          onChange(selectedCloths.filter(id => !allIds.includes(id)));
      } else {
          const newSelection = [...new Set([...selectedCloths, ...allIds])];
          onChange(newSelection);
      }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 relative">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold text-sm flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-primary"/>
            تعویض پارچه: {title}
        </h4>
        <button 
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-100 transition border border-blue-200"
        >
          {isOpen ? 'بستن جدول' : 'مشاهده جدول دیسک‌ها'}
        </button>
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
         <span>تعداد تعویض شده: <span className="font-bold text-red-500 text-lg">{selectedCloths.length}</span> عدد</span>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div 
                ref={modalRef}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col"
            >
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <h3 className="font-bold text-lg">جدول تعویض پارچه - {title}</h3>
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {Array.from({ length: 6 }).map((_, dIdx) => {
                        const discNum = dIdx + 1;
                        const allIds = Array.from({ length: 20 }).map((_, i) => `D${discNum}-C${i + 1}`);
                        const isAllSelected = allIds.every(id => selectedCloths.includes(id));

                        return (
                        <div key={discNum} className="flex flex-col gap-2 border-b pb-4 last:border-0">
                            {/* Header Row: Title on Right, Checkbox on Left */}
                            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">دیسک شماره {discNum}</span>
                                <button 
                                    type="button"
                                    onClick={() => toggleDiscAll(discNum)}
                                    className={`p-1 rounded transition ${isAllSelected ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="انتخاب همه پارچه‌های این دیسک"
                                >
                                    {isAllSelected ? <CheckSquare className="w-6 h-6"/> : <Square className="w-6 h-6"/>}
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1 justify-end">
                            {Array.from({ length: 20 }).map((_, cIdx) => {
                                const clothNum = cIdx + 1;
                                const id = `D${discNum}-C${clothNum}`;
                                const isChecked = selectedCloths.includes(id);
                                return (
                                <div 
                                    key={id}
                                    onClick={() => toggleCloth(discNum, clothNum)}
                                    className={`
                                    w-8 h-8 flex items-center justify-center text-[10px] rounded cursor-pointer border transition-all select-none
                                    ${isChecked 
                                        ? 'bg-red-600 text-white border-red-700 shadow-sm font-bold scale-105' 
                                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-primary text-gray-600 dark:text-gray-400'}
                                    `}
                                    title={`دیسک ${discNum} - پارچه ${clothNum}`}
                                >
                                    {clothNum}
                                </div>
                                );
                            })}
                            </div>
                        </div>
                        );
                    })}
                </div>
                
                <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end sticky bottom-0">
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="bg-primary text-white px-6 py-2 rounded-xl shadow hover:bg-red-800 transition"
                    >
                        تایید و بستن
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
