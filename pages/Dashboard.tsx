import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { MOCK_CHART_DATA, MOCK_LINE_DATA } from '../constants';

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">داشبورد مدیریتی</h1>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'دستورکارهای باز', val: 12, color: 'bg-orange-100 text-orange-600' },
          { label: 'بازرسی‌های امروز', val: 5, color: 'bg-blue-100 text-blue-600' },
          { label: 'درخواست قطعه', val: 3, color: 'bg-green-100 text-green-600' },
          { label: 'خرابی‌های اضطراری', val: 1, color: 'bg-red-100 text-red-600' },
        ].map((stat, idx) => (
          <div key={idx} className={`p-4 rounded-xl shadow-sm ${stat.color} dark:bg-opacity-10`}>
            <p className="text-sm opacity-80">{stat.label}</p>
            <p className="text-3xl font-bold mt-2">{stat.val}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">توقفات تجهیزات (دقیقه)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                />
                <Bar dataKey="value" fill="#800020" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">روند درخواست‌ها (6 ماه گذشته)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_LINE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Line type="monotone" dataKey="uv" stroke="#38bdf8" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};