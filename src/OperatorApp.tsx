import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import OperatorOverviewPage from './pages/operator/OperatorOverviewPage';
import OperatorContactPage from './pages/operator/OperatorContactPage';
import OperatorDeckPage from './pages/operator/OperatorDeckPage';
import OperatorNav from './components/operator/OperatorNav';
import { useOperatorSession, type OperatorSessionStatus } from './hooks/useOperatorSession';
import { getPartnerBasePath } from './lib/partnerBasePath';

/**
 * Protected operator application. This bundle is ONLY ever served by
 * middleware.ts (production) or the Vite dev-preview plugin (Bolt/local
 * dev) after a valid operator session has been verified server-side — it
 * deliberately contains no access-gate UI at all (that lives in the
 * separate operator-gate.html / OperatorAccessApp.tsx bundle), so there is
 * no React state to "unlock": the server always decides which bundle is
 * served.
 *
 * The client-side session check here is defense-in-depth only, for the
 * case where a session expires *after* the HTML was served. If that
 * happens we do a hard navigation back to the gate root (base path aware),
 * which forces the browser to re-request the page from the server.
 */
function RequireOperatorSession({ status, children }: { status: OperatorSessionStatus; children: ReactNode }) {
  const wasAuthed = useRef(false);
  if (status === 'authed') wasAuthed.current = true;

  useEffect(() => {
    const shouldRedirect = status === 'unauthed' && (!import.meta.env.DEV || wasAuthed.current);
    if (shouldRedirect) {
      window.location.href = `${getPartnerBasePath()}/`;
    }
  }, [status]);

  if (status === 'loading') {
    return <div style={{ minHeight: '60vh' }} />;
  }
  if (status === 'unauthed' && (!import.meta.env.DEV || wasAuthed.current)) {
    return <div style={{ minHeight: '60vh' }} />;
  }
  // In DEV only, and only before any real session has existed: render
  // anyway so the protected UI can be worked on visually even if the
  // dev-preview session check itself is unreachable. Once a real session
  // existed and was locked/expired, this bypass no longer applies — so
  // "Lock Access" is still visibly testable in preview. Compiled out of
  // production builds.
  return <>{children}</>;
}

export default function OperatorApp() {
  const { status, lock } = useOperatorSession();
  const basePath = getPartnerBasePath();
  const nav = <OperatorNav onLockAccess={lock} />;

  return (
    <BrowserRouter basename={basePath}>
      <RequireOperatorSession status={status}>
        <Routes>
          <Route path="/" element={<OperatorOverviewPage nav={nav} />} />
          <Route path="/overview" element={<OperatorOverviewPage nav={nav} />} />
          <Route path="/contact" element={<OperatorContactPage nav={nav} />} />
          <Route path="/deck" element={<OperatorDeckPage nav={nav} />} />
          <Route path="*" element={<OperatorOverviewPage nav={nav} />} />
        </Routes>
      </RequireOperatorSession>
    </BrowserRouter>
  );
}
