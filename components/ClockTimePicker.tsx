import React, { useState, useRef, useEffect } from 'react';
import { Clock, Check } from 'lucide-react';

interface Props {
  value: string;
  onChange: (time: string) => void;
  label?: string;
}

export const ClockTimePicker: React.FC<Props> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'HOURS' | 'MINUTES'>('HOURS');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [tempHour, setTempHour] = useState('00');
  const [tempMinute, setTempMinute] = useState('00');

  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      setTempHour(h);
      setTempMinute(m);
    }
  }, [value, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHourClick = (h: string) => {
    setTempHour(h);
    setView('MINUTES');
  };

  const handleMinuteClick = (m: string) => {
    setTempMinute(m);
    onChange(`${tempHour}:${m}`);
    setIsOpen(false);
    setView('HOURS'); // Reset for next time
  };

  // Helper to position numbers in a circle
  const getStyle = (index: number, total: number, radius: number) => {
    const angle = (index * (360 / total)) - 90; // -90 to start at 12 o'clock
    const x = radius * Math.cos((angle * Math.PI) / 180);
    const y = radius * Math.sin((angle * Math.PI) / 180);
    return {
      transform: `translate(${x}px, ${y}px)`,
    };
  };

  // Hours: 13-24 (00) on outer, 1-12 on inner
  const hoursOuter = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]; // 12 maps to 00 in logic usually, but visually 12 at top
  const hoursInner = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="relative" ref={wrapperRef}>
      {label && <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">{label}</label>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-700 rounded-xl border transition-all
        ${isOpen ? 'ring-2 ring-primary/20 border-primary shadow-sm' : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'}
        `}
      >
         <span className={`font-mono text-lg tracking-wider ${!value ? 'text-gray-400 font-sans text-sm tracking-normal' : 'text-gray-800 dark:text-gray-100'}`}>
             {value || '--:--'}
         </span>
         <Clock className="w-5 h-5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-600 p-4 animate-fadeIn flex flex-col items-center">
            
            {/* Header Display */}
            <div className="flex items-center justify-center gap-1 mb-6 text-4xl font-bold text-gray-700 dark:text-white">
                <button 
                  type="button"
                  onClick={() => setView('HOURS')} 
                  className={`p-1 rounded ${view === 'HOURS' ? 'text-primary' : 'text-gray-300 dark:text-gray-600'}`}>
                  {tempHour}
                </button>
                <span className="text-gray-300 pb-2">:</span>
                <button 
                  type="button"
                  onClick={() => setView('MINUTES')} 
                  className={`p-1 rounded ${view === 'MINUTES' ? 'text-primary' : 'text-gray-300 dark:text-gray-600'}`}>
                  {tempMinute}
                </button>
            </div>

            {/* Clock Face */}
            <div className="relative w-48 h-48 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <div className="absolute w-1 h-1 bg-primary rounded-full z-10"></div>
                
                {view === 'HOURS' && (
                  <>
                    {/* Outer Ring (00, 13-23) */}
                    {hoursOuter.map((h, i) => {
                       const display = h === 12 ? '00' : h;
                       const valStr = String(display).padStart(2,'0');
                       const isSelected = tempHour === valStr;
                       return (
                        <button
                          key={`out-${h}`}
                          type="button"
                          onClick={() => handleHourClick(valStr)}
                          style={getStyle(i, 12, 85)} // Radius 85
                          className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                            ${isSelected ? 'bg-primary text-white scale-110 shadow-lg z-20' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}
                          `}
                        >
                          {display}
                        </button>
                       )
                    })}
                    {/* Inner Ring (1-12) */}
                    {hoursInner.map((h, i) => {
                       const valStr = String(h).padStart(2,'0');
                       const isSelected = tempHour === valStr;
                       return (
                        <button
                          key={`in-${h}`}
                          type="button"
                          onClick={() => handleHourClick(valStr)}
                          style={getStyle(i, 12, 50)} // Radius 50
                          className={`absolute w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all
                            ${isSelected ? 'bg-primary text-white scale-110 shadow-lg z-20' : 'text-gray-400 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}
                          `}
                        >
                          {h === 12 ? '12' : h}
                        </button>
                       )
                    })}
                  </>
                )}

                {view === 'MINUTES' && (
                   <>
                    {minutes.map((m, i) => {
                       const valStr = String(m).padStart(2,'0');
                       const isSelected = tempMinute === valStr;
                       return (
                        <button
                          key={`m-${m}`}
                          type="button"
                          onClick={() => handleMinuteClick(valStr)}
                          style={getStyle(i, 12, 80)} // Radius 80
                          className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                            ${isSelected ? 'bg-primary text-white scale-110 shadow-lg z-20' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}
                          `}
                        >
                          {valStr}
                        </button>
                       )
                    })}
                    {/* Center dot for minutes visual */}
                    <div className="absolute w-2 h-2 bg-gray-300 rounded-full"></div>
                   </>
                )}
            </div>
            
            <div className="text-xs text-gray-400 text-center">
              {view === 'HOURS' ? 'ساعت را انتخاب کنید' : 'دقیقه را انتخاب کنید'}
            </div>
        </div>
      )}
    </div>
  );
};