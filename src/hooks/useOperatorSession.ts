import { useCallback, useEffect, useState } from 'react';

export type OperatorSessionStatus = 'loading' | 'authed' | 'unauthed';

export function useOperatorSession() {
  const [status, setStatus] = useState<OperatorSessionStatus>('loading');

  const refresh = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/operator-session', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.valid ? 'authed' : 'unauthed');
        return;
      }
      setStatus('unauthed');
    } catch {
      // Local dev without `vercel dev` running has no /api routes available.
      // Fail closed (unauthenticated) rather than silently granting access.
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn(
          '[operator-session] /api/operator-session is unreachable. ' +
          'Run `vercel dev` (or your platform\u2019s equivalent) to test the access gate locally.'
        );
      }
      setStatus('unauthed');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const lock = useCallback(async () => {
    try {
      await fetch('/api/operator-logout', { method: 'POST', credentials: 'include' });
    } finally {
      setStatus('unauthed');
    }
  }, []);

  return { status, refresh, lock };
}
