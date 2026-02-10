
import React, { useRef } from 'react';
import { Mic, Loader2, Paperclip, Trash2, Clock, Plus, X } from 'lucide-react';
import { ShamsiDatePicker } from '../../components/ShamsiDatePicker';
import { ClockTimePicker } from '../../components/ClockTimePicker';
import { SearchableSelect, Option } from '../../components/SearchableSelect';
import { formatMinutesToTime } from '../../utils';

interface TabProps {
    formData: any;
    setFormData: any;
    isExecutorMode: boolean;
    isViewOnly: boolean;
    listeningField: string | null;
    handleVoiceInput: (field: any) => void;
    
    // Dropdowns
    filteredEquipment?: any[];
    filteredLocalNames?: any[];
    locations?: any[];
    handleEquipmentChange?: (val: string) => void;
    handleLocalNameChange?: (val: string) => void;
    
    // Labor
    laborRows?: any[];
    setLaborRows?: any;
    updateLaborRow?: (id: string, field: string, value: any) => void;
    personnelList?: any[];
    handleRemoveRow?: (setter: any, id: string) => void;
    handleAddLabor?: () => void;

    // Parts
    partRows?: any[];
    setPartRows?: any;
    updatePartRow?: (id: string, field: string, value: any) => void;
    allParts?: any[];
    units?: any[];
    handlePartSelect?: (id: string, value: string, mode: 'CODE' | 'NAME') => void;
    handleAddPart?: () => void;

    // Docs
    docRows?: any[];
    setDocRows?: any;
    handleFileChange?: (e: any) => void;
    fileInputRef?: React.RefObject<HTMLInputElement>;
}

export const TabGeneral: React.FC<TabProps> = ({ 
    formData, setFormData, isExecutorMode, isViewOnly, listeningField, handleVoiceInput,
    filteredEquipment = [], filteredLocalNames = [], locations = [], handleEquipmentChange = ()=>{}, handleLocalNameChange = ()=>{}
}) => {
    return (
        <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                  <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">درخواست کننده</span>
                      <span className="font-bold text-sm">{formData.requester}</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">تاریخ گزارش</span>
                      <span className="font-bold text-sm font-mono">{formData.reportDate}</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">ساعت گزارش</span>
                      <span className="font-bold text-sm font-mono">{formData.reportTime}</span>
                  </div>
                  <div className="flex flex-col">
                      <label className="text-xs text-gray-500 mb-1">شیفت کاری <span className="text-red-500">*</span></label>
                      <select 
                        required
                        value={formData.shift}
                        onChange={(e) => setFormData({...formData, shift: e.target.value})}
                        disabled={isExecutorMode || isViewOnly}
                        className={`text-sm font-bold border rounded outline-none ${isExecutorMode || isViewOnly ? 'bg-transparent border-none cursor-not-allowed' : 'bg-white dark:bg-gray-800 p-1 cursor-pointer'}`}
                      >
                          <option value="">انتخاب...</option>
                          <option value="DayWork">روزکار</option>
                          <option value="A">شیفت A</option>
                          <option value="B">شیفت B</option>
                          <option value="C">شیفت C</option>
                      </select>
                  </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4">
                  <h3 className="text-sm font-bold text-gray-500 mb-2">مشخصات تجهیز</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">کد تجهیز <span className="text-red-500">*</span></label>
                        {isExecutorMode || isViewOnly ? (
                            <input type="text" value={formData.equipCode} disabled className="w-full p-2.5 border rounded-xl bg-gray-200 dark:bg-gray-600 cursor-not-allowed" />
                        ) : (
                            <SearchableSelect 
                                value={formData.equipCode}
                                options={filteredEquipment.map((eq: any) => ({ value: eq.code, label: `${eq.code} - ${eq.name}` }))}
                                onChange={handleEquipmentChange}
                                placeholder="جستجو کد تجهیز..."
                                displayMode="VALUE" 
                            />
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">نام تجهیز</label>
                        <input type="text" readOnly value={formData.equipName} className="w-full p-2.5 border rounded-xl bg-gray-200 dark:bg-gray-600 cursor-not-allowed opacity-70" placeholder="پس از انتخاب کد پر می‌شود" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">نام محلی تجهیز <span className="text-red-500">*</span></label>
                         {isExecutorMode || isViewOnly ? (
                             <div title={formData.equipLocalName}>
                                <input type="text" value={formData.equipLocalName} disabled className="w-full p-2.5 border rounded-xl bg-gray-200 dark:bg-gray-600 cursor-not-allowed" />
                             </div>
                         ) : (
                             <div title={formData.equipLocalName}>
                                <SearchableSelect
                                    value={formData.equipLocalName}
                                    options={filteredLocalNames.map((ln: any) => ({ value: ln.local_name, label: ln.local_name }))}
                                    onChange={handleLocalNameChange}
                                    placeholder="جستجو نام محلی..."
                                />
                             </div>
                         )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">محل وقوع</label>
                        <input 
                            type="text"
                            disabled={isExecutorMode || isViewOnly}
                            value={formData.locationDetail}
                            onChange={(e) => setFormData({...formData, locationDetail: e.target.value})}
                            placeholder="مثال: طبقه دوم، نوار نقاله..."
                            className={`w-full p-2.5 border rounded-xl outline-none ${isExecutorMode || isViewOnly ? 'bg-gray-200 dark:bg-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">خط تولید <span className="text-red-500">*</span></label>
                        <select 
                            required
                            disabled={isExecutorMode || isViewOnly}
                            value={formData.productionLine}
                            onChange={(e) => setFormData({...formData, productionLine: e.target.value})}
                            className={`w-full p-2.5 border rounded-xl outline-none ${isExecutorMode || isViewOnly ? 'bg-gray-200 dark:bg-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}
                        >
                            <option value="">انتخاب کنید</option>
                            <option value="Line A">Line A</option>
                            <option value="Line B">Line B</option>
                            <option value="Line A&B">Line A&B</option>
                        </select>
                    </div>
                      <div>
                            <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">محل استقرار <span className="text-red-500">*</span></label>
                            <select 
                                disabled={isExecutorMode || isViewOnly}
                                value={formData.locationId}
                                onChange={(e) => setFormData({...formData, locationId: e.target.value})}
                                className={`w-full p-2.5 border rounded-xl outline-none ${isExecutorMode || isViewOnly ? 'bg-gray-200 dark:bg-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}
                            >
                                <option value="">انتخاب کنید...</option>
                                {locations.map((loc: any) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                            </select>
                      </div>
                  </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">نوع فعالیت <span className="text-red-500">*</span></label>
                      <select required disabled={isExecutorMode || isViewOnly} value={formData.workType} onChange={(e) => setFormData({...formData, workType: e.target.value})} className={`w-full p-2.5 border rounded-xl outline-none ${isExecutorMode || isViewOnly ? 'bg-gray-200 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}>
                          <option value="REPAIR">تعمیرات اضطراری (EM)</option>
                          <option value="PM">نت پیشگیرانه (PM)</option>
                          <option value="PROJECT">پروژه / اصلاح</option>
                          <option value="INSPECTION">بازرسی فنی</option>
                          <option value="SERVICE">سرویس عمومی</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">نوع کار (دیسیپلین) <span className="text-red-500">*</span></label>
                      <select required disabled={isExecutorMode || isViewOnly} value={formData.workCategory} onChange={(e) => setFormData({...formData, workCategory: e.target.value})} className={`w-full p-2.5 border rounded-xl outline-none ${isExecutorMode || isViewOnly ? 'bg-gray-200 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}>
                          <option value="MECHANICAL">مکانیک</option>
                          <option value="ELECTRICAL">برق</option>
                          <option value="INSTRUMENTATION">ابزار دقیق</option>
                          <option value="FACILITIES">تأسیسات صنعتی</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">اولیت <span className="text-red-500">*</span></label>
                      <select required disabled={isExecutorMode || isViewOnly} value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className={`w-full p-2.5 border rounded-xl outline-none ${isExecutorMode || isViewOnly ? 'bg-gray-200 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}>
                          <option value="NORMAL">عادی</option>
                          <option value="URGENT">فوری</option>
                          <option value="CRITICAL">بحرانی (توقف تولید)</option>
                      </select>
                  </div>
               </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">شرح خرابی / درخواست <span className="text-red-500">*</span></label>
                <div className="relative">
                    <textarea 
                        required
                        readOnly={isExecutorMode || isViewOnly}
                        className={`w-full p-4 border rounded-xl h-28 pl-10 resize-none ${isExecutorMode || isViewOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50 dark:bg-gray-700'}`}
                        placeholder="توضیحات خرابی را وارد کنید..."
                        value={formData.failureDesc}
                        onChange={(e) => setFormData({...formData, failureDesc: e.target.value})}
                    ></textarea>
                    {!isExecutorMode && !isViewOnly && (
                        <button type="button" onClick={() => handleVoiceInput('failureDesc')} className={`absolute left-2 bottom-2 p-2 transition rounded-full ${listeningField === 'failureDesc' ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-400 hover:text-primary'}`}>
                            {listeningField === 'failureDesc' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                        </button>
                    )}
                </div>
              </div>

              {isExecutorMode && (
                  <div className="space-y-6 border-t-2 border-dashed border-gray-300 dark:border-gray-600 pt-6 mt-2">
                       <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                           {/* <Activity className="w-5 h-5" />  */} گزارش انجام کار (تکمیل توسط مجری)
                       </h3>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">اقدام صورت گرفته <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <textarea 
                                    required 
                                    readOnly={isViewOnly}
                                    className={`w-full p-4 border rounded-xl h-28 pl-10 outline-none resize-none ${isViewOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}
                                    placeholder="شرح کامل تعمیرات انجام شده..." 
                                    value={formData.actionDesc} 
                                    onChange={(e) => setFormData({...formData, actionDesc: e.target.value})}
                                ></textarea>
                                {!isViewOnly && (
                                    <button type="button" onClick={() => handleVoiceInput('actionDesc')} className={`absolute left-2 bottom-2 p-2 transition rounded-full ${listeningField === 'actionDesc' ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-400 hover:text-primary'}`}>
                                        {listeningField === 'actionDesc' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800 space-y-4">
                             {/* Optimized Layout for Mobile */}
                             <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${isViewOnly ? 'pointer-events-none opacity-80' : ''}`}>
                                <div className="flex flex-col gap-3">
                                    <ShamsiDatePicker label="تاریخ شروع" value={formData.startDate} onChange={(d) => setFormData({...formData, startDate: d})} />
                                    <ClockTimePicker label="ساعت شروع" value={formData.startTime} onChange={(t) => setFormData({...formData, startTime: t})} />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <ShamsiDatePicker label="تاریخ پایان" value={formData.endDate} onChange={(d) => setFormData({...formData, endDate: d})} />
                                    <ClockTimePicker label="ساعت پایان" value={formData.endTime} onChange={(t) => setFormData({...formData, endTime: t})} />
                                </div>
                            </div>
                            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isViewOnly ? 'pointer-events-none opacity-80' : ''}`}>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5">مدت توقف (ساعت:دقیقه) <span className="text-red-500">*</span></label>
                                    <ClockTimePicker 
                                        value={formData.downtime} 
                                        onChange={(t) => setFormData({...formData, downtime: t})} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5">زمان خالص تعمیر (ساعت:دقیقه) <span className="text-red-500">*</span></label>
                                    <ClockTimePicker 
                                        value={formData.repairTime} 
                                        onChange={(t) => setFormData({...formData, repairTime: t})} 
                                    />
                                </div>
                            </div>
                        </div>
                  </div>
              )}
            </div>
    );
};

export const TabLabor: React.FC<TabProps> = ({ laborRows = [], isViewOnly, handleRemoveRow, personnelList, updateLaborRow, handleAddLabor }) => {
    return (
        <div className="space-y-4 animate-fadeIn">
            {laborRows.map((row) => (
                <div key={row.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 space-y-3 relative">
                    {!isViewOnly && handleRemoveRow && <button type="button" onClick={() => handleRemoveRow(null, row.id)} className="absolute top-4 left-4 p-2 text-red-500 hover:bg-red-100 rounded-lg"><Trash2 className="w-5 h-5" /></button>}
                    
                    <div className="flex-1 ml-8">
                        <label className="text-xs text-gray-500 mb-1 block">نام تکنسین <span className="text-red-500">*</span></label>
                        <SearchableSelect 
                            value={row.name}
                            options={(personnelList || []).map(p => ({ value: p.full_name, label: p.full_name }))}
                            onChange={(val) => updateLaborRow && updateLaborRow(row.id, 'name', val)}
                            placeholder="جستجو نام تکنسین..."
                            className="w-full"
                            disabled={isViewOnly}
                        />
                    </div>
                    
                    {/* Date/Time pickers for labor */}
                    <div className={`grid grid-cols-2 gap-3 ${isViewOnly ? 'pointer-events-none opacity-80' : ''}`}>
                        <ShamsiDatePicker label="تاریخ شروع" value={row.startDate} onChange={(d) => updateLaborRow && updateLaborRow(row.id, 'startDate', d)} />
                        <ClockTimePicker label="ساعت شروع" value={row.startTime} onChange={(t) => updateLaborRow && updateLaborRow(row.id, 'startTime', t)} />
                        <ShamsiDatePicker label="تاریخ پایان" value={row.endDate} onChange={(d) => updateLaborRow && updateLaborRow(row.id, 'endDate', d)} />
                        <ClockTimePicker label="ساعت پایان" value={row.endTime} onChange={(t) => updateLaborRow && updateLaborRow(row.id, 'endTime', t)} />
                    </div>

                    {/* Duration Badge */}
                    <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            مدت کارکرد: {formatMinutesToTime(row.durationMinutes)}
                        </div>
                    </div>
                </div>
            ))}
            
            {/* Total Labor Hours Footer */}
            {laborRows.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex justify-between items-center">
                    <span className="font-bold text-blue-800 dark:text-blue-300">مجموع نفر ساعت:</span>
                    <span className="font-black text-lg text-blue-900 dark:text-blue-200">
                        {formatMinutesToTime(laborRows.reduce((sum: number, row: any) => sum + row.durationMinutes, 0))}
                    </span>
                </div>
            )}

            {!isViewOnly && <button type="button" onClick={handleAddLabor} className="w-full flex items-center justify-center gap-2 text-primary border-2 border-dashed border-primary/30 px-4 py-3 rounded-lg hover:bg-primary/5 transition"><Plus className="w-4 h-4" /> افزودن نیروی کار</button>}
        </div>
    );
};

export const TabParts: React.FC<TabProps> = ({ partRows = [], isViewOnly, handleRemoveRow, allParts = [], units = [], updatePartRow, handlePartSelect, handleAddPart }) => {
    return (
        <div className="space-y-4 animate-fadeIn">
            {partRows.map((row) => (
                <div key={row.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl space-y-3 relative">
                    {!isViewOnly && handleRemoveRow && <button type="button" onClick={() => handleRemoveRow(null, row.id)} className="absolute top-4 left-4 p-1.5 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">کد قطعه</label>
                            {isViewOnly ? (
                                <input type="text" value={row.code} disabled className="w-full p-2 border rounded-lg bg-gray-200 dark:bg-gray-600 cursor-not-allowed" />
                            ) : (
                                <SearchableSelect 
                                    value={row.code}
                                    options={allParts.map(p => ({ value: p.code, label: `${p.code} - ${p.name}` }))}
                                    onChange={(val) => handlePartSelect && handlePartSelect(row.id, val, 'CODE')}
                                    placeholder="جستجو کد..."
                                    displayMode="VALUE"
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">نام قطعه <span className="text-red-500">*</span></label>
                            {isViewOnly ? (
                                <input type="text" value={row.name} disabled className="w-full p-2 border rounded-lg bg-gray-200 dark:bg-gray-600 cursor-not-allowed" />
                            ) : (
                                <SearchableSelect 
                                    value={row.name}
                                    options={allParts.map(p => ({ value: p.name, label: p.name }))}
                                    onChange={(val) => handlePartSelect && handlePartSelect(row.id, val, 'NAME')}
                                    placeholder="جستجو نام قطعه..."
                                />
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">تعداد <span className="text-red-500">*</span></label>
                            <input 
                            type="number" 
                            value={row.qty} 
                            onChange={(e) => updatePartRow && updatePartRow(row.id, 'qty', Number(e.target.value))} 
                            className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800"
                            min="0.01" step="0.01"
                            disabled={isViewOnly}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">واحد <span className="text-red-500">*</span></label>
                            <select value={row.unit} onChange={(e) => updatePartRow && updatePartRow(row.id, 'unit', e.target.value)} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800" disabled={isViewOnly}>
                                {units.length > 0 ? units.map(u => (
                                    <option key={u.id} value={u.title}>{u.title}</option>
                                )) : <option value="عدد">عدد</option>}
                            </select>
                        </div>
                    </div>
                </div>
            ))}
            {!isViewOnly && <button type="button" onClick={handleAddPart} className="w-full flex items-center justify-center gap-2 text-primary border-2 border-dashed border-primary/30 px-4 py-3 rounded-lg hover:bg-primary/5 transition"><Plus className="w-4 h-4" /> افزودن قطعه مصرفی</button>}
        </div>
    );
};

export const TabDocs: React.FC<TabProps> = ({ isViewOnly, fileInputRef, handleFileChange, docRows = [], handleRemoveRow }) => {
    return (
        <div className="space-y-6 animate-fadeIn">
            {!isViewOnly && (
                <>
                    <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileChange} />
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer" onClick={() => fileInputRef?.current?.click()}>
                        <Paperclip className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2 font-medium">فایل‌ها را اینجا رها کنید یا کلیک کنید</p>
                    </div>
                </>
            )}
            {docRows.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-gray-500">فایل‌های پیوست شده:</h4>
                    {docRows.map((doc: any) => (
                        <div key={doc.id} className="flex justify-between items-center bg-white dark:bg-gray-700 border p-3 rounded-lg shadow-sm">
                            <span className="text-sm truncate max-w-[200px]">{doc.name}</span>
                            {!isViewOnly && handleRemoveRow && <button type="button" onClick={() => handleRemoveRow(null, doc.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
