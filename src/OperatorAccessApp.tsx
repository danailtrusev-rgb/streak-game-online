import OperatorAccessGate from './components/operator/OperatorAccessGate';
import { getPartnerBasePath } from './lib/partnerBasePath';

/**
 * This is the ENTIRE gate bundle. It must never import anything from
 * OperatorApp.tsx, operatorLandingContent.ts, or any operator proposition
 * component — that's what keeps the gate JavaScript free of operator copy.
 * On success we do a hard browser navigation (not client-side routing) so
 * the browser re-requests the overview URL, which the server (middleware
 * in production, the dev-preview plugin in Bolt/local dev) will now serve
 * from the protected operator.html bundle instead of this one.
 */
export default function OperatorAccessApp() {
  return (
    <OperatorAccessGate
      onAccessGranted={() => { window.location.href = `${getPartnerBasePath()}/overview`; }}
    />
  );
}
