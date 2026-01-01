import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface Props {
  value: string;
  onChange: (time: string) => void;
  label?: string;
  error?: string;
}

export const TimePicker24: React.FC<Props> = ({ value, onChange, label, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Generate hours 00-23
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  // Generate minutes 00-55 (step 5)
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [selectedH, selectedM] = value ? value.split(':') : ['--', '--'];

  const handleHourSelect = (h: string) => {
    // If no minute is selected yet, default to 00, otherwise keep existing
    const m = selectedM === '--' ? '00' : selectedM;
    onChange(`${h}:${m}`);
    // Do NOT close dropdown, wait for minute selection
  };

  const handleMinuteSelect = (m: string) => {
    // If no hour is selected yet, default to 00 (or current hour logic), otherwise keep existing
    const h = selectedH === '--' ? '00' : selectedH;
    onChange(`${h}:${m}`);
    setIsOpen(false); // Close dropdown after minute selection
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {label && <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">{label}</label>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-700 rounded-xl border transition-all
        ${error 
          ? 'border-red-500 text-red-500' 
          : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 text-gray-800 dark:text-gray-100'
        } ${isOpen ? 'ring-2 ring-primary/20 border-primary shadow-sm' : ''}`}
      >
         <span className={`font-mono text-lg tracking-wider ${!value ? 'text-gray-400 text-sm font-sans tracking-normal' : ''}`}>
             {value || 'انتخاب زمان...'}
         </span>
         <Clock className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-600 p-2 animate-fadeIn flex gap-2 h-64">
           {/* Minutes Column */}
           <div className="flex-1 overflow-y-auto no-scrollbar rounded-lg bg-gray-50 dark:bg-gray-700/50">
               <div className="text-xs text-center text-gray-400 py-1 sticky top-0 bg-gray-50 dark:bg-gray-700/50">دقیقه</div>
               {minutes.map(m => (
                   <button
                    key={m}
                    type="button"
                    onClick={() => handleMinuteSelect(m)}
                    className={`w-full text-center py-2 text-sm font-mono rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition
                        ${selectedM === m ? 'bg-primary text-white hover:bg-primary font-bold shadow-sm' : 'text-gray-700 dark:text-gray-300'}
                    `}
                   >
                       {m}
                   </button>
               ))}
           </div>

           {/* Divider */}
           <div className="flex items-center justify-center font-bold text-gray-300">:</div>

           {/* Hours Column */}
           <div className="flex-1 overflow-y-auto no-scrollbar rounded-lg bg-gray-50 dark:bg-gray-700/50">
               <div className="text-xs text-center text-gray-400 py-1 sticky top-0 bg-gray-50 dark:bg-gray-700/50">ساعت</div>
               {hours.map(h => (
                   <button
                    key={h}
                    type="button"
                    onClick={() => handleHourSelect(h)}
                    className={`w-full text-center py-2 text-sm font-mono rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition
                        ${selectedH === h ? 'bg-primary text-white hover:bg-primary font-bold shadow-sm' : 'text-gray-700 dark:text-gray-300'}
                    `}
                   >
                       {h}
                   </button>
               ))}
           </div>
        </div>
      )}
    </div>
  );
};