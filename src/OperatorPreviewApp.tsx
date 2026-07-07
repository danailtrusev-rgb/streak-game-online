import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isPreviewHostname } from './lib/previewHostname';
import { useDocumentMeta } from './hooks/useDocumentMeta';
import OperatorOverviewPage from './pages/operator/OperatorOverviewPage';
import OperatorContactPage from './pages/operator/OperatorContactPage';
import OperatorDeckPage from './pages/operator/OperatorDeckPage';
import OperatorPreviewNav from './components/operator/OperatorPreviewNav';

/**
 * Neutral "not found" screen shown on any hostname this preview isn't
 * explicitly allowed on (i.e. everything except localhost / Bolt preview
 * hosts / an explicit VITE_ENABLE_PARTNER_PREVIEW override). Deliberately
 * gives no hint that an operator site exists.
 */
function PreviewUnavailable() {
  useDocumentMeta({ title: 'Not Found', robots: 'noindex, nofollow, noarchive' });
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B0F0C',
        color: '#6B6862',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 14,
      }}
    >
      Not found.
    </div>
  );
}

function PreviewNotice() {
  return (
    <div
      style={{
        textAlign: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 11.5,
        color: '#9C9992',
        background: 'rgba(217,119,87,0.08)',
        borderBottom: '1px solid rgba(217,119,87,0.2)',
        padding: '6px 12px',
      }}
    >
      Internal preview only. Production partner access will use server-side authentication.
    </div>
  );
}

export default function OperatorPreviewApp() {
  useDocumentMeta({ title: 'Preview Environment — Survive the Streak Partners', robots: 'noindex, nofollow, noarchive' });

  const explicitFlag = import.meta.env.VITE_ENABLE_PARTNER_PREVIEW === 'true';
  const allowed = isPreviewHostname(window.location.hostname, explicitFlag);

  if (!allowed) {
    return <PreviewUnavailable />;
  }

  // Real navigation back to the site root — not a hash change — since
  // there is no session to clear, just a static preview to leave.
  const exitPreview = () => { window.location.href = '/'; };
  const nav = <OperatorPreviewNav onExit={exitPreview} />;

  return (
    <>
      <PreviewNotice />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OperatorOverviewPage nav={nav} />} />
          <Route path="/contact" element={<OperatorContactPage nav={nav} previewMode />} />
          <Route path="/deck" element={<OperatorDeckPage nav={nav} />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </HashRouter>
    </>
  );
}
