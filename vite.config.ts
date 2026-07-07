import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { partnerPreviewPlugin } from './vite-plugins/partnerPreview';

// https://vitejs.dev/config/
//
// Multi-page build: FOUR independent HTML/JS entry points so the player,
// operator-gate, protected-operator, and static-operator-preview bundles
// never share application code or copy:
//   index.html            -> player app
//   operator-gate.html    -> production private-access gate
//   operator.html         -> production protected operator app (session-gated)
//   operator-preview.html -> static, hash-routed, Bolt-Hosting-safe preview
//                             of the operator app (no server/API required)
//
// In production, middleware.ts (Vercel Edge Middleware) decides which of
// the first three HTML files a request receives based on hostname.
// operator-preview.html is NOT part of that routing — it's a self-contained
// static page, hostname-gated at runtime (see src/lib/previewHostname.ts),
// meant for reviewing the operator site while the project is only
// published on a private .bolt.host domain (no custom domains, no
// serverless functions, no Vercel middleware running).
//
// In Bolt/local dev — where hostname-based middleware never runs either —
// partnerPreviewPlugin() separately provides path-based routing at
// /partner-preview for testing inside a live `vite dev` server. It only
// registers middleware inside `vite dev` / `vite preview`; it has no
// effect on (and is not part of) the actual production deployment.
export default defineConfig({
  plugins: [react(), partnerPreviewPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Never ship source maps in production — the operator bundle in
    // particular must not leak proposition copy via a .map file.
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        operatorGate: resolve(__dirname, 'operator-gate.html'),
        operator: resolve(__dirname, 'operator.html'),
        operatorPreview: resolve(__dirname, 'operator-preview.html'),
      },
    },
  },
});
