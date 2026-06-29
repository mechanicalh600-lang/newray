import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { User } from '../types';
import { getPublishedProcessFormBySlug } from '../services/processFormDefinitions';
import { ProcessEntityFormPage } from './ProcessEntityFormPage';

interface Props {
  slug: string;
  user: User;
  LegacyComponent: React.ComponentType<any>;
  legacyProps?: Record<string, unknown>;
}

/** اگر فرم داینامیک منتشر شده باشد، runtime داینامیک؛ وگرنه فرم قدیمی */
export const ProcessFormRoute: React.FC<Props> = ({ slug, user, LegacyComponent, legacyProps = {} }) => {
  const [state, setState] = useState<'loading' | 'dynamic' | 'legacy'>('loading');
  const [def, setDef] = useState<Awaited<ReturnType<typeof getPublishedProcessFormBySlug>>>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const published = await getPublishedProcessFormBySlug(slug);
        if (cancelled) return;
        if (published) {
          setDef(published);
          setState('dynamic');
        } else {
          setState('legacy');
        }
      } catch {
        if (!cancelled) setState('legacy');
      }
    })();
    const refresh = () => {
      void getPublishedProcessFormBySlug(slug).then(published => {
        if (published) {
          setDef(published);
          setState('dynamic');
        } else {
          setState('legacy');
        }
      });
    };
    window.addEventListener('process-modules-changed', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('process-modules-changed', refresh);
    };
  }, [slug]);

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state === 'dynamic' && def) {
    return <ProcessEntityFormPage def={def} user={user} />;
  }

  return <LegacyComponent user={user} {...legacyProps} />;
};

export default ProcessFormRoute;
