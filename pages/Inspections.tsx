
import React, { useState } from 'react';
import { User } from '../types';
import { QrCode, Check, X, Camera, Mic, Share2, Home } from 'lucide-react';
import { generateTrackingCode, getShamsiDate } from '../utils';
import { useNavigate } from 'react-router-dom';

interface Props {
  user: User;
}

// Mock Data
const MOCK_CHECKLIST = [
    { id: '1', desc: 'بررسی سطح روغن مخزن', status: null },
    { id: '2', desc: 'بررسی نشتی اتصالات', status: null },
    { id: '3', desc: 'کنترل دمای بیرینگ‌ها', status: null },
    { id: '4', desc: 'صدا و لرزش غیرعادی', status: null },
];

export const Inspections: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'SELECT' | 'CHECKLIST' | 'SENDING' | 'RESULT'>('SELECT');
  const [checklist, setChecklist] = useState<any[]>(MOCK_CHECKLIST);
  const [trackingCode, setTrackingCode] = useState('');
  
  // Handlers
  const handleItemCheck = (id: string, status: 'OK' | 'NOK') => {
      setChecklist(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  };

  const handleFinish = () => {
      setStep('SENDING');
      // Simulate API call
      setTimeout(() => {
          setTrackingCode(generateTrackingCode('J'));
          setStep('RESULT');
      }, 3000);
  };

  const remaining = checklist.filter(i => i.status === null).length;
  const progress = ((checklist.length - remaining) / checklist.length) * 100;

  if (step === 'SELECT') {
      return (
          <div className="flex flex-col items-center justify-center h-[80vh] space-y-8">
              <div className="w-40 h-40 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-xl cursor-pointer hover:scale-105 transition" onClick={() => setStep('CHECKLIST')}>
                  <QrCode className="w-20 h-20 text-primary" />
              </div>
              <p className="text-lg font-medium">اسکن QR کد تجهیز یا</p>
              <button onClick={() => setStep('CHECKLIST')} className="bg-primary text-white px-8 py-3 rounded-full shadow-lg">
                  انتخاب از لیست تجهیزات
              </button>
          </div>
      )
  }

  if (step === 'SENDING') {
      return (
          <div className="flex flex-col items-center justify-center h-[80vh] text-center p-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-8"></div>
              <h2 className="text-xl font-bold mb-4">در حال ارسال اطلاعات...</h2>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                  <p className="text-blue-700 dark:text-blue-300 font-medium">نگهداری صحیح و اصولی ضامن تداوم تولید</p>
              </div>
          </div>
      )
  }

  if (step === 'RESULT') {
      const nokItems = checklist.filter(i => i.status === 'NOK');
      
      return (
          <div className="max-w-md mx-auto space-y-6 pt-4">
              <div className="text-center space-y-2">
                  <div className="text-4xl animate-bounce">🙏</div>
                  <h2 className="text-xl font-bold text-green-600">{user.fullName} خسته نباشید</h2>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2 inline-block font-mono text-sm">
                      کد پیگیری: {trackingCode}
                  </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
                  <h3 className="font-bold border-b pb-2">گزارش بازرسی</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-500">تجهیز:</span>
                      <span>پمپ سانتریفیوژ 101</span>
                      <span className="text-gray-500">تاریخ:</span>
                      <span>{getShamsiDate()}</span>
                      <span className="text-gray-500">سالم:</span>
                      <span className="text-green-600 font-bold">{checklist.filter(i => i.status === 'OK').length} مورد</span>
                      <span className="text-gray-500">خراب:</span>
                      <span className="text-red-600 font-bold">{nokItems.length} مورد</span>
                  </div>
                  
                  {nokItems.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm mt-2">
                          <p className="font-bold text-red-700 dark:text-red-400 mb-1">موارد خرابی:</p>
                          <ul className="list-disc list-inside">
                              {nokItems.map(i => <li key={i.id}>{i.desc}</li>)}
                          </ul>
                      </div>
                  )}
              </div>

              <div className="flex gap-4">
                  <button className="flex-1 bg-green-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg">
                      <Share2 className="w-5 h-5" /> اشتراک گذاری
                  </button>
                  <button onClick={() => navigate('/')} className="flex-1 bg-gray-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg">
                      <Home className="w-5 h-5" /> خانه
                  </button>
              </div>
          </div>
      )
  }

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 z-10 py-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold text-lg">بازرسی پمپ سانتریفیوژ PM-101</h2>
              <span className="text-sm bg-accent text-white px-2 py-1 rounded-full">{remaining} باقی‌مانده</span>
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
      </div>

      <div className="space-y-4 mt-4">
          {checklist.map((item) => (
              <div key={item.id} className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border-r-4 ${item.status === 'OK' ? 'border-green-500' : item.status === 'NOK' ? 'border-red-500' : 'border-gray-300'}`}>
                  <p className="font-medium mb-4">{item.desc}</p>
                  
                  {item.status !== 'NOK' ? (
                      <div className="flex gap-4">
                        <button 
                            onClick={() => handleItemCheck(item.id, 'OK')}
                            className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${item.status === 'OK' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-green-100'}`}
                        >
                            <Check className="w-5 h-5" /> سالم
                        </button>
                        <button 
                            onClick={() => handleItemCheck(item.id, 'NOK')}
                            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-red-100 text-gray-500 rounded-lg flex items-center justify-center gap-2"
                        >
                            <X className="w-5 h-5" /> خرابی
                        </button>
                      </div>
                  ) : (
                      <div className="space-y-3 animate-fadeIn">
                          <label className="text-xs font-bold text-red-500 block mb-1">توضیحات خرابی <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <input type="text" placeholder="شرح مشکل مشاهده شده..." className="w-full p-2 pr-10 border border-red-300 rounded-lg bg-red-50 dark:bg-red-900/10" autoFocus />
                            <Mic className="absolute left-2 top-2 text-gray-400 w-5 h-5" />
                          </div>
                          <div className="flex justify-between items-center">
                              <button className="text-blue-600 flex items-center gap-1 text-sm"><Camera className="w-4 h-4"/> افزودن عکس</button>
                              <button onClick={() => handleItemCheck(item.id, null!)} className="text-gray-400 text-sm">بازگشت</button>
                          </div>
                      </div>
                  )}
              </div>
          ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 md:relative md:bg-transparent md:border-none">
          <button 
            disabled={remaining > 0}
            onClick={handleFinish}
            className="w-full bg-primary disabled:bg-gray-400 text-white py-4 rounded-xl font-bold shadow-lg transition-all transform active:scale-95"
          >
              ثبت و ارسال گزارش
          </button>
      </div>
    </div>
  );
};
