
import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
  // دریافت مسیر پایه برنامه (مثلاً /net/) برای ساخت آدرس صحیح تصویر
  const getLogoPath = () => {
    try {
       // اگر در محیط Vite هستیم، از BASE_URL استفاده می‌کنیم
       // این متغیر در vite.config.ts با مقدار '/net/' تنظیم شده است
       const base = (import.meta.env && import.meta.env.BASE_URL) || '/';
       // حذف اسلش‌های تکراری احتمالی و ساخت آدرس نهایی
       return `${base}logo.svg`.replace(/\/\//g, '/');
    } catch (e) {
       // فال‌بک برای محیط‌های خاص
       return '/logo.svg';
    }
  };

  return (
    <img 
        src={getLogoPath()} 
        className={className} 
        alt="Company Logo"
        onError={(e) => {
            // مخفی کردن تصویر در صورت بروز خطا در لود
            console.warn('Logo load failed');
            e.currentTarget.style.display = 'none';
        }}
    />
  );
};
