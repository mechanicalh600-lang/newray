
import React from 'react';
import { X, Plus, Trash2, Power, Mic, Disc, Droplet, CheckSquare, Square } from 'lucide-react';
import { 
    PRODUCTION_TIMES, FEED_TYPES_OPTIONS, BALL_SIZES, THICKENER_TIMES, 
    toPersianNum, parseTimeToMinutes 
} from './ShiftHandoverTypes';
import { ClockTimePicker } from '../components/ClockTimePicker';
import { ClothGrid } from '../components/ClothGrid';

// --- Shared Components for Tabs ---
export const ToggleButton = ({ active, onClick, disabled }: { active: boolean, onClick: () => void, disabled: boolean }) => (
    <button 
        type="button" 
        onClick={onClick}
        disabled={disabled}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm border-2 transform active:scale-95 ${
            active 
            ? 'bg-cyan-500 border-cyan-500 text-white shadow-cyan-200 shadow-md' 
            : 'bg-white border-gray-300 text-gray-300 hover:border-gray-400'
        }`}
        title={active ? 'روشن' : 'خاموش'}
    >
        <Power className="w-5 h-5" />
    </button>
);

export const OperatorSelect = ({ value, onChange, disabled, personnel, attendanceMap, filterPresent = false }: any) => {
    const list = filterPresent 
      ? personnel.filter((p: any) => attendanceMap[p.id] === 'PRESENT') 
      : personnel;

    return (
        <select 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            disabled={disabled}
            className="w-full p-2 rounded text-xs border bg-white dark:bg-gray-700 outline-none"
        >
            <option value="">انتخاب اپراتور...</option>
            {list.map((p: any) => (
                <option key={p.id} value={p.full_name}>{p.full_name}</option>
            ))}
        </select>
    );
};

// --- TABS ---

export const TabProduction = ({ production, feedInfo, isReadOnly, handleTonnageChange, handleFeedTypeChange, handleCustomFeedType, resetFeedType, handleFeedPercentChange, feedLinesActive, setFeedLinesActive }: any) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
            {['lineA', 'lineB'].map(line => {
                const isActive = feedLinesActive[line];
                const totalTonnage = Object.values(production[line]).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

                return (
                <div key={line} className="mb-8 p-4 border border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-700/20">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`font-bold text-lg ${line === 'lineA' ? 'text-blue-600' : 'text-red-600'}`}>
                            خوراک مصرفی خط {line === 'lineA' ? 'A' : 'B'}
                        </h3>
                        <ToggleButton 
                            active={isActive} 
                            onClick={() => setFeedLinesActive((prev: any) => ({...prev, [line]: !prev[line]}))} 
                            disabled={isReadOnly}
                        />
                    </div>
                    
                    {isActive && (
                    <div className="overflow-x-auto animate-fadeIn">
                        <table className="w-full text-center text-xs">
                            <thead>
                                <tr className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
                                    <th className="p-3 rounded-tr-lg">ساعت</th>
                                    <th className="p-3">تناژ</th>
                                    <th className="p-3">نوع خوراک ۱</th>
                                    <th className="p-3">درصد</th>
                                    <th className="p-3">نوع خوراک ۲</th>
                                    <th className="p-3 rounded-tl-lg">درصد</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800">
                                {PRODUCTION_TIMES.map((time, idx) => {
                                    const feedData = feedInfo[line][time] || [{type:'', percent:0}, {type:'', percent:0}];
                                    const feed1 = feedData[0];
                                    const feed2 = feedData[1];
                                    const showFeed2 = feed1.percent > 0 && feed1.percent < 100;
                                    const feed2Options = FEED_TYPES_OPTIONS.filter(o => o !== feed1.type);

                                    return (
                                    <tr key={time} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                        <td className="p-2 font-bold text-gray-500">{time}</td>
                                        <td className="p-1">
                                            <input 
                                                type="number" 
                                                className="w-20 p-2 text-center border rounded-lg font-bold outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-700 dark:border-gray-600" 
                                                value={production[line][time] || ''} 
                                                onChange={e => handleTonnageChange(line, time, e.target.value)} 
                                                disabled={isReadOnly} 
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="p-1">
                                            {feed1.isCustom ? (
                                                <div className="flex items-center gap-1 justify-center">
                                                    <input type="text" className="w-24 p-2 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600" value={feed1.type} onChange={e => handleCustomFeedType(line, idx, 0, e.target.value)} disabled={isReadOnly} placeholder="نام..." />
                                                    <button type="button" onClick={() => resetFeedType(line, idx, 0)} className="text-red-500 hover:text-red-700"><X className="w-4 h-4"/></button>
                                                </div>
                                            ) : (
                                                <select className="w-28 p-2 border rounded-lg outline-none bg-white dark:bg-gray-700 dark:border-gray-600" value={feed1.type || ''} onChange={e => handleFeedTypeChange(line, idx, 0, e.target.value)} disabled={isReadOnly}>
                                                    <option value="">انتخاب...</option>
                                                    {FEED_TYPES_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                                                </select>
                                            )}
                                        </td>
                                        <td className="p-1">
                                            <input type="number" min="0" max="100" className="w-16 p-2 text-center border rounded-lg dark:bg-gray-700 dark:border-gray-600" value={feed1.percent || ''} onChange={e => handleFeedPercentChange(line, idx, 0, e.target.value)} disabled={isReadOnly} placeholder="%" />
                                        </td>
                                        <td className="p-1">
                                            {showFeed2 ? (
                                                feed2.isCustom ? (
                                                    <div className="flex items-center gap-1 justify-center">
                                                        <input type="text" className="w-24 p-2 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600" value={feed2.type} onChange={e => handleCustomFeedType(line, idx, 1, e.target.value)} disabled={isReadOnly} placeholder="نام..." />
                                                        <button type="button" onClick={() => resetFeedType(line, idx, 1)} className="text-red-500 hover:text-red-700"><X className="w-4 h-4"/></button>
                                                    </div>
                                                ) : (
                                                    <select className="w-28 p-2 border rounded-lg outline-none bg-white dark:bg-gray-700 dark:border-gray-600" value={feed2.type || ''} onChange={e => handleFeedTypeChange(line, idx, 1, e.target.value)} disabled={isReadOnly}>
                                                        <option value="">انتخاب...</option>
                                                        {feed2Options.map(o=><option key={o} value={o}>{o}</option>)}
                                                    </select>
                                                )
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="p-1">
                                            {showFeed2 ? (
                                                <input type="number" min="0" max="100" className="w-16 p-2 text-center border rounded-lg dark:bg-gray-700 dark:border-gray-600" value={feed2.percent || ''} onChange={e => handleFeedPercentChange(line, idx, 1, e.target.value)} disabled={isReadOnly} placeholder="%" />
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                            <tfoot>
                                <tr className={`border-t-2 font-bold ${line === 'lineA' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                    <td className="p-3 text-right pr-6">مجموع تناژ:</td>
                                    <td className="p-3 text-center text-lg">{totalTonnage.toLocaleString()} <span className="text-xs font-normal">تن</span></td>
                                    <td colSpan={4}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    )}
                </div>
            )})}
        </div>
    );
};

export const TabMills = ({ ballMills, setBallMills, isReadOnly, handleAddBallCharge, handleRemoveBallCharge }: any) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['lineA', 'lineB'].map((line: any) => (
                <div key={line} className="space-y-4">
                    <h3 className={`font-bold text-center ${line === 'lineA' ? 'text-blue-600' : 'text-red-600'}`}>بالمیل‌های خط {line === 'lineA' ? 'A' : 'B'}</h3>
                    {['primary', 'secondary'].map((millType: any) => {
                        const millData = ballMills[line][millType];
                        const availableSizes = BALL_SIZES.filter(s => !millData.charges.map((c: any) => c.size).includes(s));
                        return (
                            <div key={millType} className="border rounded-xl p-4 bg-white dark:bg-gray-800">
                                <div className="flex justify-between mb-3">
                                    <h4 className="font-bold text-sm">{millType === 'primary' ? 'بالمیل شماره 1' : 'بالمیل شماره 2'}</h4>
                                    <ToggleButton active={millData.active} onClick={() => setBallMills((prev: any) => ({...prev, [line]: {...prev[line], [millType]: {...prev[line][millType], active: !millData.active}}}))} disabled={isReadOnly} />
                                </div>
                                {millData.active && (
                                    <div className="space-y-3 animate-fadeIn">
                                        <div className="bg-gray-50 p-2 rounded">
                                            <div className="text-xs font-bold text-gray-500 text-center border-b pb-1 mb-2">ساعت 08:00</div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="relative">
                                                    <input type="number" min="0" placeholder="جریان" className={`w-full p-2 border rounded pl-6 ${Number(millData.amp08) > 970 ? 'text-red-600 font-bold' : ''}`} value={millData.amp08} onChange={e => { setBallMills((prev: any) => ({...prev, [line]: {...prev[line], [millType]: {...prev[line][millType], amp08: e.target.value}} })) }} disabled={isReadOnly} />
                                                    <span className="absolute left-2 top-2 text-gray-400 font-bold">A</span>
                                                </div>
                                                <div className="relative">
                                                    <input type="number" min="0" placeholder="دانسیته" className="w-full p-2 border rounded pl-10" value={millData.dens08} onChange={e => { setBallMills((prev: any) => ({...prev, [line]: {...prev[line], [millType]: {...prev[line][millType], dens08: e.target.value}} })) }} disabled={isReadOnly} />
                                                    <span className="absolute left-2 top-2 text-gray-400 font-bold">Gr/Lit</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-2 rounded">
                                            <div className="text-xs font-bold text-gray-500 text-center border-b pb-1 mb-2">ساعت 02:00</div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="relative">
                                                    <input type="number" min="0" placeholder="جریان" className={`w-full p-2 border rounded pl-6 ${Number(millData.amp02) > 970 ? 'text-red-600 font-bold' : ''}`} value={millData.amp02} onChange={e => { setBallMills((prev: any) => ({...prev, [line]: {...prev[line], [millType]: {...prev[line][millType], amp02: e.target.value}} })) }} disabled={isReadOnly} />
                                                    <span className="absolute left-2 top-2 text-gray-400 font-bold">A</span>
                                                </div>
                                                <div className="relative">
                                                    <input type="number" min="0" placeholder="دانسیته" className="w-full p-2 border rounded pl-10" value={millData.dens02} onChange={e => { setBallMills((prev: any) => ({...prev, [line]: {...prev[line], [millType]: {...prev[line][millType], dens02: e.target.value}} })) }} disabled={isReadOnly} />
                                                    <span className="absolute left-2 top-2 text-gray-400 font-bold">Gr/Lit</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-2 rounded text-xs mt-2">
                                            <label className="block mb-1 font-bold text-gray-500">شارژ گلوله</label>
                                            <div className="flex gap-1 mb-2">
                                                <select className="flex-1 p-1 border rounded" value={millData.ballSize} onChange={e => { setBallMills((prev: any) => ({...prev, [line]: {...prev[line], [millType]: {...prev[line][millType], ballSize: e.target.value}} })) }} disabled={isReadOnly}>
                                                    <option value="">سایز</option>
                                                    {availableSizes.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                                <input type="number" min="1" className="w-16 p-1 border rounded text-center" placeholder="تعداد" value={millData.barrelCount} onChange={e => { setBallMills((prev: any) => ({...prev, [line]: {...prev[line], [millType]: {...prev[line][millType], barrelCount: e.target.value}} })) }} disabled={isReadOnly} />
                                                <button type="button" onClick={() => handleAddBallCharge(line, millType)} className="bg-green-500 text-white p-1 rounded disabled:bg-gray-300" disabled={isReadOnly || !millData.ballSize || !millData.barrelCount}><Plus className="w-4 h-4"/></button>
                                            </div>
                                            {millData.charges.map((c: any, idx: number) => (
                                                <div key={idx} className="flex justify-between bg-white px-2 py-1 rounded mb-1 shadow-sm">
                                                    <span>سایز {c.size}: {c.count} بشکه</span>
                                                    <button type="button" onClick={() => handleRemoveBallCharge(line, millType, idx)} className="text-red-500" disabled={isReadOnly}><Trash2 className="w-3 h-3"/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            ))}
        </div>
    );
};

export const TabHydrocyclones = ({ hydrocyclones, setHydrocyclones, isReadOnly }: any) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['lineA', 'lineB'].map((line: any) => (
                <div key={line} className="space-y-4">
                    <h3 className={`font-bold text-center mb-4 ${line === 'lineA' ? 'text-blue-600' : 'text-red-600'}`}>هیدروسیکلون‌های خط {line === 'lineA' ? 'A' : 'B'}</h3>
                    {['primary', 'secondary'].map((cycType: any) => {
                        const data = hydrocyclones[line][cycType];
                        return (
                            <div key={cycType} className="border rounded-xl p-4 bg-white dark:bg-gray-800">
                                <div className="flex justify-between mb-3">
                                    <h4 className="font-bold text-sm">{cycType === 'primary' ? 'شماره 1' : 'شماره 2'}</h4>
                                    <ToggleButton active={data.active} onClick={() => setHydrocyclones((prev: any) => ({...prev, [line]: {...prev[line], [cycType]: {...prev[line][cycType], active: !data.active}}}))} disabled={isReadOnly} />
                                </div>
                                {data.active && (
                                    <div className="space-y-3 animate-fadeIn">
                                        <div className="grid grid-cols-2 gap-2 text-xs items-center bg-gray-50 p-2 rounded">
                                            <span className="font-bold text-gray-500 col-span-2 text-center border-b pb-1 mb-1">ساعت 08:00</span>
                                            <input type="number" min="0" placeholder="فشار (Bar)" className="w-full p-2 border rounded text-center" value={data.pressure08} onChange={e => { setHydrocyclones((prev: any) => ({...prev, [line]: {...prev[line], [cycType]: {...prev[line][cycType], pressure08: e.target.value}} })) }} disabled={isReadOnly} />
                                            <input type="text" placeholder="زاویه چتر" className="w-full p-2 border rounded text-center" value={data.angle08} onChange={e => { setHydrocyclones((prev: any) => ({...prev, [line]: {...prev[line], [cycType]: {...prev[line][cycType], angle08: e.target.value}} })) }} disabled={isReadOnly} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs items-center bg-gray-50 p-2 rounded">
                                            <span className="font-bold text-gray-500 col-span-2 text-center border-b pb-1 mb-1">ساعت 02:00</span>
                                            <input type="number" min="0" placeholder="فشار (Bar)" className="w-full p-2 border rounded text-center" value={data.pressure02} onChange={e => { setHydrocyclones((prev: any) => ({...prev, [line]: {...prev[line], [cycType]: {...prev[line][cycType], pressure02: e.target.value}} })) }} disabled={isReadOnly} />
                                            <input type="text" placeholder="زاویه چتر" className="w-full p-2 border rounded text-center" value={data.angle02} onChange={e => { setHydrocyclones((prev: any) => ({...prev, [line]: {...prev[line], [cycType]: {...prev[line][cycType], angle02: e.target.value}} })) }} disabled={isReadOnly} />
                                        </div>
                                        <div className={`pt-2 rounded p-2 ${data.activeCyclones.length === 0 ? 'bg-red-50 border border-red-300' : ''}`}>
                                            <p className="text-xs font-bold text-gray-500 mb-2 text-center">سیکلون‌های فعال</p>
                                            <div className="grid grid-cols-6 md:grid-cols-12 gap-1 justify-items-center">
                                                {Array.from({length: 12}, (_, i) => i + 1).map(n => (
                                                    <button key={n} type="button" onClick={() => {
                                                        const active = data.activeCyclones.includes(n);
                                                        const newActive = active ? data.activeCyclones.filter((x:number)=>x!==n) : [...data.activeCyclones, n];
                                                        setHydrocyclones((prev: any) => ({...prev, [line]: {...prev[line], [cycType]: {...prev[line][cycType], activeCyclones: newActive}} }));
                                                    }} className={`w-7 h-7 rounded-full border text-[10px] font-bold transition-all ${data.activeCyclones.includes(n) ? 'bg-cyan-500 text-white shadow-md transform scale-110 border-cyan-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} disabled={isReadOnly}>{n}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            ))}
        </div>
    );
};

export const TabDrumMagnets = ({ drumMagnets, setDrumMagnets, isReadOnly, handleVoiceInputMultiline }: any) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['lineA', 'lineB'].map((line: any) => {
                const data = drumMagnets[line];
                return (
                    <div key={line} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between mb-4">
                            <h3 className={`font-bold text-center ${line === 'lineA' ? 'text-blue-600' : 'text-red-600'}`}>درام های مگنت خط {line === 'lineA' ? 'A' : 'B'}</h3>
                            <ToggleButton active={data.active} onClick={() => setDrumMagnets((prev: any) => ({...prev, [line]: {...prev[line], active: !data.active}}))} disabled={isReadOnly} />
                        </div>
                        {data.active && (
                            <div className="animate-fadeIn">
                                <div className={`grid grid-cols-1 gap-3 mb-4 p-2 rounded`}>
                                    {['single', 'upper', 'middle', 'lower'].map(magType => (
                                        <button key={magType} type="button" onClick={() => setDrumMagnets((prev: any) => ({...prev, [line]: {...prev[line], [magType]: !prev[line][magType]}}))} className={`p-3 rounded-lg border text-sm font-bold transition-all ${ drumMagnets[line][magType] ? 'bg-cyan-500 text-white border-cyan-600 shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100' }`} disabled={isReadOnly}>
                                            {magType === 'single' ? 'درام تکی' : magType === 'upper' ? 'درام بالایی طبقاتی' : magType === 'middle' ? 'درام میانی طبقاتی' : 'درام پایینی طبقاتی'}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative">
                                    <textarea className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 outline-none min-h-[80px]" placeholder="توضیحات..." rows={3} value={drumMagnets[line].description} onChange={e => { const val = e.target.value; setDrumMagnets((prev: any) => ({...prev, [line]: {...prev[line], description: val}} )) }} disabled={isReadOnly} />
                                    {!isReadOnly && (<button type="button" className="absolute bottom-3 left-3 p-1 rounded-full text-gray-400 hover:text-primary" onClick={() => handleVoiceInputMultiline((val: string) => setDrumMagnets((prev: any) => ({...prev, [line]: {...prev[line], description: val}})), drumMagnets[line].description)}><Mic className="w-5 h-5" /></button>)}
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    );
};

export const TabConcentrateFilters = ({ concentrateFilters, setConcentrateFilters, isReadOnly, validateDurationVsShift, personnel, attendanceMap }: any) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['lineA', 'lineB', 'reserve'].map((key) => {
                const data = concentrateFilters[key];
                const title = key === 'lineA' ? 'فیلتر کنسانتره خط A' : key === 'lineB' ? 'فیلتر کنسانتره خط B' : 'فیلتر کنسانتره رزرو';
                return (
                    <div key={key} className="bg-white dark:bg-gray-800 p-4 rounded-xl border">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-sm">{title}</h4>
                            <ToggleButton active={data.active} onClick={() => setConcentrateFilters((prev: any) => ({...prev, [key]: {...prev[key], active: !data.active}}))} disabled={isReadOnly} />
                        </div>
                        {data.active && (
                            <div className="animate-fadeIn space-y-3">
                                <div className={!data.operator ? 'border border-red-300 rounded p-1' : ''}>
                                    <OperatorSelect 
                                      value={data.operator} 
                                      onChange={(val: string) => setConcentrateFilters((prev: any) => ({...prev, [key]: {...prev[key], operator: val}}))} 
                                      disabled={isReadOnly}
                                      personnel={personnel}
                                      attendanceMap={attendanceMap}
                                      filterPresent={true}
                                    />
                                </div>
                                <div className={`w-full ${!data.hours ? 'border border-red-300 rounded p-1' : ''}`}>
                                    <ClockTimePicker 
                                      label="مدت کارکرد" 
                                      value={data.hours} 
                                      onChange={(val) => {
                                          if (validateDurationVsShift(val)) {
                                              setConcentrateFilters((prev: any) => ({...prev, [key]: {...prev[key], hours: val}}));
                                          } else {
                                              alert('مدت کارکرد نمی‌تواند بیشتر از کل مدت شیفت باشد.');
                                          }
                                      }} 
                                    />
                                </div>
                                <div className="mt-2"><ClothGrid title={title} selectedCloths={data.cloths} onChange={(sel) => setConcentrateFilters((prev: any) => ({...prev, [key]: {...prev[key], cloths: sel}}))} /></div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    );
};

export const TabThickeners = ({ thickeners, setThickeners, isReadOnly, handleThickenerMetaChange, handleThickenerDataChange }: any) => {
    return (
        <div className="space-y-6">
            {['lineA', 'lineB'].map((line: any) => (
                <div key={line} className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                    <h3 className={`font-bold text-center mb-4 ${line === 'lineA' ? 'text-blue-600' : 'text-red-600'}`}>تیکنرهای خط {line === 'lineA' ? 'A' : 'B'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[0, 1, 2].map((tIdx) => {
                            const thickener = thickeners[line][tIdx];
                            return (
                                <div key={tIdx} className="border rounded-xl p-4 bg-white dark:bg-gray-800 shadow-sm">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-bold text-sm">تیکنر شماره {tIdx + 1}</h4>
                                        <ToggleButton active={thickener.active} onClick={() => handleThickenerMetaChange(line, tIdx, 'active', !thickener.active)} disabled={isReadOnly} />
                                    </div>
                                    {thickener.active && (
                                        <div className="animate-fadeIn space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className={!thickener.hoursWorked ? 'border border-red-300 rounded' : ''}>
                                                    <ClockTimePicker label="مدت کارکرد" value={thickener.hoursWorked} onChange={(val) => handleThickenerMetaChange(line, tIdx, 'hoursWorked', val)} />
                                                </div>
                                                <div className={!thickener.channelOutput ? 'border border-red-300 rounded' : ''}>
                                                    <ClockTimePicker label="خروجی به کانال" value={thickener.channelOutput} onChange={(val) => handleThickenerMetaChange(line, tIdx, 'channelOutput', val)} />
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                                                <div className="grid grid-cols-4 gap-1 mb-2 text-center text-[10px] text-gray-500 font-bold">
                                                    <div>ساعت</div><div>فشار (Bar)</div><div>ارتفاع جک (cm)</div><div>خط گل (cm)</div>
                                                </div>
                                                {THICKENER_TIMES.map(time => (
                                                    <div key={time} className="grid grid-cols-4 gap-2 mb-2 items-center">
                                                        <span className="font-bold bg-white dark:bg-gray-600 p-1.5 rounded text-center text-xs shadow-sm">{time}</span>
                                                        <input type="number" min="0" className="border rounded p-1.5 text-center text-xs w-full" value={thickener.data[time]?.pressure || ''} onChange={e => handleThickenerDataChange(line, tIdx, time, 'pressure', e.target.value)} disabled={isReadOnly} />
                                                        <input type="number" min="0" className="border rounded p-1.5 text-center text-xs w-full" value={thickener.data[time]?.jack || ''} onChange={e => handleThickenerDataChange(line, tIdx, time, 'jack', e.target.value)} disabled={isReadOnly} />
                                                        <input type="number" min="0" className="border rounded p-1.5 text-center text-xs w-full" value={thickener.data[time]?.mudLine || ''} onChange={e => handleThickenerDataChange(line, tIdx, time, 'mudLine', e.target.value)} disabled={isReadOnly} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export const TabRecoveryFilters = ({ recoveryFilters, setRecoveryFilters, isReadOnly, validateDurationVsShift, personnel, attendanceMap }: any) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['lineA', 'lineB'].map((line: any) => (
                <div key={line} className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                    <h3 className={`font-bold text-center mb-4 ${line === 'lineA' ? 'text-blue-600' : 'text-red-600'}`}>فیلترهای بازیافت خط {line === 'lineA' ? 'A' : 'B'}</h3>
                    {[0, 1].map((idx) => {
                        const data = recoveryFilters[line][idx];
                        const title = `فیلتر بازیافت شماره ${idx + 1}`;
                        return (
                            <div key={idx} className="bg-white dark:bg-gray-900 border rounded-xl p-4 mb-4 last:mb-0 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-sm">{title}</h4>
                                    <ToggleButton active={data.active} onClick={() => {const newLine = [...recoveryFilters[line]];newLine[idx].active = !data.active;setRecoveryFilters((prev:any) => ({...prev, [line]: newLine}));}} disabled={isReadOnly} />
                                </div>
                                {data.active && (
                                    <div className="animate-fadeIn space-y-3">
                                        <div className={!data.operator ? 'border border-red-300 rounded p-1' : ''}>
                                            <OperatorSelect 
                                              value={data.operator} 
                                              onChange={(val: string) => {const newLine = [...recoveryFilters[line]];newLine[idx].operator = val;setRecoveryFilters((prev:any) => ({...prev, [line]: newLine}));}} 
                                              disabled={isReadOnly}
                                              personnel={personnel}
                                              attendanceMap={attendanceMap}
                                              filterPresent={true}
                                            />
                                        </div>
                                        <div className={!data.hours ? 'border border-red-300 rounded p-1' : ''}>
                                            <ClockTimePicker 
                                              label="مدت کارکرد" 
                                              value={data.hours} 
                                              onChange={(val) => {
                                                  if (validateDurationVsShift(val)) {
                                                      const newLine = [...recoveryFilters[line]];
                                                      newLine[idx].hours = val;
                                                      setRecoveryFilters((prev:any) => ({...prev, [line]: newLine}));
                                                  } else {
                                                      alert('مدت کارکرد نمی‌تواند بیشتر از کل مدت شیفت باشد.');
                                                  }
                                              }} 
                                            />
                                        </div>
                                        <div className="mt-2"><ClothGrid title={`${title} خط ${line === 'lineA' ? 'A' : 'B'}`} selectedCloths={data.cloths} onChange={(sel) => {const newLine = [...recoveryFilters[line]];newLine[idx].cloths = sel;setRecoveryFilters((prev:any) => ({...prev, [line]: newLine}));}} /></div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            ))}
        </div>
    );
};

export const TabDowntime = ({ downtime, setDowntime, footer, setFooter, pumps, setPumps, isReadOnly, handleDowntimeChange, handleDynamicListChange, addDynamicRecord, removeDynamicRecord, handleVoiceInputMultiline, handleVoiceInputDynamic, shiftDuration }: any) => {
    return (
        <div className="space-y-6">
            {/* Downtime */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['lineA', 'lineB'].map((line: any) => {
                    const workMins = parseTimeToMinutes(downtime[line].workTime);
                    const stopMins = parseTimeToMinutes(downtime[line].stopTime);
                    const shiftMins = parseTimeToMinutes(shiftDuration || '12:00');
                    const totalMins = workMins + stopMins;
                    const isValid = totalMins === shiftMins;
                    const hasStop = stopMins > 0;

                    return (
                    <div key={line} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className={`font-bold text-center mb-4 ${line === 'lineA' ? 'text-blue-600' : 'text-red-600'}`}>مدت کارکرد / توقف خط {line === 'lineA' ? 'A' : 'B'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div><ClockTimePicker label="مدت کارکرد" value={downtime[line].workTime} onChange={val => handleDowntimeChange(line, 'workTime', val)} /></div>
                            <div><ClockTimePicker label="مدت توقف" value={downtime[line].stopTime} onChange={val => handleDowntimeChange(line, 'stopTime', val)} /></div>
                        </div>
                        
                        {!isValid && (
                            <div className="text-red-500 text-xs text-center mb-4 font-bold animate-pulse">
                                مجموع مدت کارکرد و توقف میبایست با مدت شیفت برابر باشد
                            </div>
                        )}

                        {hasStop && (
                            <div className="relative animate-fadeIn">
                                <textarea className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 min-h-[80px]" placeholder="علت توقفات..." value={downtime[line].reason} onChange={e => setDowntime((prev: any) => ({...prev, [line]: {...prev[line], reason: e.target.value}}))} disabled={isReadOnly} />
                                {!isReadOnly && (<button type="button" className="absolute bottom-3 left-3 p-1 rounded-full text-gray-400 hover:text-primary" onClick={() => handleVoiceInputMultiline((val:string) => setDowntime((prev: any) => ({...prev, [line]: {...prev[line], reason: val}})), downtime[line].reason)}><Mic className="w-5 h-5" /></button>)}
                            </div>
                        )}
                    </div>
                )})}
            </div>
            
            {/* Pumps */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="font-bold mb-6 text-center text-lg">وضعیت پمپ استیشن</h3>
                <div className="grid grid-cols-2 gap-8">
                    <div className="text-center">
                        <h4 className="text-sm font-bold mb-3 text-gray-600 dark:text-gray-300">پمپ‌های پروسس</h4>
                        <div className="flex justify-center gap-3">
                            {['1', '2', '3'].map(p => (
                                <button key={p} type="button" disabled={isReadOnly} onClick={() => {const active = pumps.process.includes(p);setPumps((prev:any) => ({...prev, process: active ? prev.process.filter((x:any)=>x!==p) : [...prev.process, p]}));}} className={`w-12 h-12 rounded-full border font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center relative ${pumps.process.includes(p) ? 'bg-cyan-600 text-white border-cyan-700 shadow-lg' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}>
                                    <Disc className="w-6 h-6"/>
                                    <span className="absolute -top-2 -right-2 bg-white text-black text-[10px] w-5 h-5 rounded-full border flex items-center justify-center font-bold">{p}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="text-center">
                        <h4 className="text-sm font-bold mb-3 text-gray-600 dark:text-gray-300">پمپ‌های آب تمیز</h4>
                        <div className="flex justify-center gap-3">
                            {['1', '2', '3'].map(p => (
                                <button key={p} type="button" disabled={isReadOnly} onClick={() => {const active = pumps.cleanWater.includes(p);setPumps((prev:any) => ({...prev, cleanWater: active ? prev.cleanWater.filter((x:any)=>x!==p) : [...prev.cleanWater, p]}));}} className={`w-12 h-12 rounded-full border font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center relative ${pumps.cleanWater.includes(p) ? 'bg-cyan-400 text-white border-cyan-500 shadow-lg' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}>
                                    <Droplet className="w-6 h-6"/>
                                    <span className="absolute -top-2 -right-2 bg-white text-black text-[10px] w-5 h-5 rounded-full border flex items-center justify-center font-bold">{p}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* General Description */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">توضیحات شیفت</h3>
                    {!isReadOnly && (
                        <button 
                            type="button" 
                            onClick={() => addDynamicRecord('downtime')} 
                            disabled={downtime.generalDescription.length > 0 && !downtime.generalDescription[downtime.generalDescription.length - 1].trim()}
                            className={`bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center transition ${downtime.generalDescription.length > 0 && !downtime.generalDescription[downtime.generalDescription.length - 1].trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                        >
                            <Plus className="w-5 h-5"/>
                        </button>
                    )}
                </div>
                {downtime.generalDescription.map((desc: string, idx: number) => (
                    <div key={idx} className="flex gap-2 mb-3">
                        <span className="font-bold text-gray-400 w-6 pt-2">{toPersianNum(idx + 1)}.</span>
                        <div className="relative flex-1">
                            <textarea value={desc} onChange={e => handleDynamicListChange('downtime', idx, e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 min-h-[60px]" disabled={isReadOnly} />
                            {!isReadOnly && <button type="button" className="absolute bottom-3 left-3 p-1 rounded-full text-gray-400 hover:text-primary" onClick={() => handleVoiceInputDynamic('downtime', idx)}><Mic className="w-4 h-4" /></button>}
                        </div>
                        {!isReadOnly && <button type="button" onClick={() => removeDynamicRecord('downtime', idx)} className="text-red-500 self-center hover:bg-red-50 p-2 rounded-full"><Trash2 className="w-5 h-5"/></button>}
                    </div>
                ))}
            </div>

            {/* Next Shift Actions */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">اقدامات لازم شیفت بعد</h3>
                    {!isReadOnly && (
                        <button 
                            type="button" 
                            onClick={() => addDynamicRecord('footer')} 
                            disabled={footer.nextShiftActions.length > 0 && !footer.nextShiftActions[footer.nextShiftActions.length - 1].trim()}
                            className={`bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center transition ${footer.nextShiftActions.length > 0 && !footer.nextShiftActions[footer.nextShiftActions.length - 1].trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                        >
                            <Plus className="w-5 h-5"/>
                        </button>
                    )}
                </div>
                {footer.nextShiftActions.map((action: string, idx: number) => (
                    <div key={idx} className="flex gap-2 mb-3">
                        <span className="font-bold text-gray-400 w-6 pt-2">{toPersianNum(idx + 1)}.</span>
                        <div className="relative flex-1">
                            <textarea value={action} onChange={e => handleDynamicListChange('footer', idx, e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 min-h-[60px]" disabled={isReadOnly} />
                            {!isReadOnly && <button type="button" className="absolute bottom-3 left-3 p-1 rounded-full text-gray-400 hover:text-primary" onClick={() => handleVoiceInputDynamic('footer', idx)}><Mic className="w-4 h-4" /></button>}
                        </div>
                        {!isReadOnly && <button type="button" onClick={() => removeDynamicRecord('footer', idx)} className="text-red-500 self-center hover:bg-red-50 p-2 rounded-full"><Trash2 className="w-5 h-5"/></button>}
                    </div>
                ))}
            </div>
        </div>
    );
};
