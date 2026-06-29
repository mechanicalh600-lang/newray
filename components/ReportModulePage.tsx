import React, { Suspense, useEffect, useState } from 'react';
import { FileText, Settings2, LayoutTemplate, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { ReportModule } from '../services/reportModules';
import { getReportDefinitionBySlug, ReportDefinition } from '../services/reportDefinitions';

const DynamicReportRuntime = React.lazy(() => import('../pages/reports/DynamicReportRuntime'));

interface Props {
  user?: User | null;
  module: ReportModule;
}

/** صفحه اجرای گزارش سفارشی — فرم JSON متصل یا راهنمای تکمیل طراحی */
export const ReportModulePage: React.FC<Props> = ({ user, module }) => {
  const navigate = useNavigate();
  const [definition, setDefinition] = useState<ReportDefinition | null | 'loading'>('loading');

  useEffect(() => {
    let cancelled = false;
    const slug = module.definition_slug || module.slug;
    getReportDefinitionBySlug(slug).then(def => {
      if (!cancelled) setDefinition(def);
    });
    return () => {
      cancelled = true;
    };
  }, [module.id, module.definition_slug, module.slug]);

  if (definition === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[240px]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasPublishedForm =
    definition &&
    definition.is_active &&
    (definition.published_version || 0) > 0 &&
    (definition.form_schema?.fields?.length || 0) > 0;

  if (hasPublishedForm && definition) {
    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[240px]">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        }
      >
        <DynamicReportRuntime user={user} slug={definition.slug} initialDefinition={definition} />
      </Suspense>
    );
  }

  const slug = module.definition_slug || module.slug;

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 text-center space-y-4">
      <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <AlertCircle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
      </div>
      <h2 className="text-xl font-bold">{module.title}</h2>
      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
        این گزارش در منو ثبت شده است. برای استفاده، ابتدا فرم گزارش را طراحی و منتشر کنید.
        {definition && !definition.is_active ? ' (فرم موجود است اما هنوز منتشر نشده.)' : null}
      </p>
      {user?.role === 'ADMIN' ? (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/report-form-design?slug=${encodeURIComponent(slug)}`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-bold hover-primary-dark transition"
          >
            <Settings2 className="w-4 h-4" />
            طراحی فرم گزارش
          </button>
          <button
            type="button"
            onClick={() => navigate(`/report-template-design?slug=${encodeURIComponent(slug)}`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <LayoutTemplate className="w-4 h-4" />
            طراحی قالب چاپ
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-500">لطفاً با مدیر سیستم تماس بگیرید.</p>
      )}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
        <FileText className="w-3.5 h-3.5" />
        <span className="font-mono">{module.path}</span>
      </div>
    </div>
  );
};
