
import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

export interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    displayMode?: 'LABEL' | 'VALUE'; 
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder, disabled, className, displayMode = 'LABEL' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Initialize search term based on current value
    useEffect(() => {
        if (!isOpen) {
             const selected = options.find(o => o.value === value);
             if (selected) {
                 setSearchTerm(displayMode === 'VALUE' ? selected.value : selected.label);
             } else {
                 setSearchTerm(value || '');
             }
        }
    }, [value, isOpen, options, displayMode]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Revert logic on close without selection
                const selected = options.find(o => o.value === value);
                if (selected) {
                    setSearchTerm(displayMode === 'VALUE' ? selected.value : selected.label);
                } else {
                    setSearchTerm(value || '');
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value, options, displayMode]);

    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
        opt.value.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div className="relative" title={value ? options.find(o => o.value === value)?.label : ''}>
                <input
                    type="text"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
                    onFocus={() => !disabled && setIsOpen(true)}
                    disabled={disabled}
                    className={`w-full p-2.5 pr-8 border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200'}`}
                />
                {disabled ? (
                    <ChevronDown className="absolute left-2 top-3 w-4 h-4 text-gray-400" />
                ) : (
                    <Search className="absolute left-2 top-3 w-4 h-4 text-gray-400" />
                )}
            </div>
            {isOpen && !disabled && (
                <div className="absolute top-full right-0 left-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-xl shadow-lg z-50 animate-fadeIn">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                            <div
                                key={opt.value}
                                className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm border-b dark:border-gray-700 last:border-0 flex flex-col"
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                    setSearchTerm(displayMode === 'VALUE' ? opt.value : opt.label);
                                }}
                            >
                                <span className="font-bold text-gray-800 dark:text-gray-200">{opt.value}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{opt.label}</span>
                            </div>
                        ))
                    ) : (
                        <div className="p-3 text-center text-gray-400 text-xs">موردی یافت نشد</div>
                    )}
                </div>
            )}
        </div>
    );
};
