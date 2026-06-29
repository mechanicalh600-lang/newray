import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getActiveCustomReportModules, getReportModuleByPath, ReportModule } from '../services/reportModules';

/** بارگذاری ماژول‌های گزارش سفارشی فعال — برای ثبت Route در App.tsx */
export function useCustomReportModules(enabled: boolean): ReportModule[] {
  const [modules, setModules] = useState<ReportModule[]>([]);

  useEffect(() => {
    if (!enabled) {
      setModules([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      const rows = await getActiveCustomReportModules();
      if (!cancelled) setModules(rows);
    };

    load();
    const onChange = () => load();
    window.addEventListener('report-modules-changed', onChange);
    return () => {
      cancelled = true;
      window.removeEventListener('report-modules-changed', onChange);
    };
  }, [enabled]);

  return modules;
}

/** تشخیص اینکه مسیر فعلی متعلق به ماژول سفارشی است */
export function useCustomReportModulePath(): string | null {
  const location = useLocation();
  const [match, setMatch] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getReportModuleByPath(location.pathname).then(mod => {
      if (!cancelled) setMatch(mod?.path ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  return match;
}
