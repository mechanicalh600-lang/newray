
import React from 'react';
import { Database, Copy, Check, Terminal } from 'lucide-react';

export const Integration: React.FC = () => {
  const apiUrl = "https://krgznynrljnvxwhvsdxj.supabase.co/rest/v1";
  
  return (
      <div className="w-full max-w-full pb-20 space-y-6">
          <div className="flex items-center gap-2 mb-6">
              <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
                  <Database className="w-6 h-6 text-primary" />
              </div>
              <div>
                  <h1 className="text-2xl font-bold">یکپارچه‌سازی و API</h1>
                  <p className="text-xs text-gray-500 mt-1">مستندات اتصال نرم‌افزارهای ثالث به سامانه نت</p>
              </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-lg mb-4">REST API Endpoints</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                  این سامانه بر پایه Supabase بنا شده است و به صورت خودکار API های استاندارد RESTful را برای تمام جداول دیتابیس ارائه می‌دهد. 
                  شما می‌توانید با استفاده از کلید API (که باید از واحد IT دریافت کنید) به داده‌ها دسترسی داشته باشید.
              </p>

              <div className="space-y-4">
                  <div className="bg-gray-900 text-gray-300 p-4 rounded-xl font-mono text-sm overflow-x-auto dir-ltr text-left">
                      <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
                          <span className="text-green-400">GET</span>
                          <span className="text-xs text-gray-500">دریافت لیست دستور کارها</span>
                      </div>
                      <p>{apiUrl}/work_orders?select=*</p>
                  </div>

                  <div className="bg-gray-900 text-gray-300 p-4 rounded-xl font-mono text-sm overflow-x-auto dir-ltr text-left">
                      <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
                          <span className="text-blue-400">POST</span>
                          <span className="text-xs text-gray-500">ثبت درخواست جدید (از سیستم ERP)</span>
                      </div>
                      <p>{apiUrl}/work_orders</p>
                      <pre className="mt-2 text-xs text-gray-500">
{`{
  "tracking_code": "WO-AUTO-1001",
  "equipment_code": "P-101",
  "failure_description": "Vibration Alert from SCADA",
  "priority": "URGENT"
}`}
                      </pre>
                  </div>
              </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800 flex gap-4">
              <Terminal className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div>
                  <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-1">راهنمای توسعه‌دهندگان</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
                      برای دریافت کلید دسترسی (API Key) و مستندات کامل Swagger، لطفاً با مدیر سیستم تماس بگیرید. 
                      تمامی درخواست‌ها باید دارای هدر <code className="bg-blue-100 px-1 rounded font-mono">apikey</code> باشند.
                  </p>
              </div>
          </div>
      </div>
  );
};

export default Integration;
