import React, { useEffect, useState } from 'react';
import { DynamicReportRuntime } from '../pages/DynamicReportRuntime';
import { getReportDefinitionByModulePath } from '../services/reportDefinitions';
import { User } from '../types';

interface Props {
  path: string;
  FallbackComponent: React.ComponentType<{ user?: User | null }>;
  user?: User | null;
}

/** اگر فرمی منتشر شده به این مسیر متصل باشد، آن را نمایش می‌دهد؛ وگرنه کامپوننت پیش‌فرض */
export const ReportRouteResolver: React.FC<Props> = ({ path, FallbackComponent, user }) => {
  const [linkedDef, setLinkedDef] = useState<Awaited<ReturnType<typeof getReportDefinitionByModulePath>> | 'loading'>('loading');

  useEffect(() => {
    let cancelled = false;
    getReportDefinitionByModulePath(path).then(def => {
      if (!cancelled) setLinkedDef(def ?? null);
    });
    return () => { cancelled = true; };
  }, [path]);

  if (linkedDef === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (linkedDef) {
    return <DynamicReportRuntime user={user} slug={linkedDef.slug} initialDefinition={linkedDef} />;
  }

  return <FallbackComponent user={user} />;
};
