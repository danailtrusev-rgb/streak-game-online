import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { partnerPreviewPlugin } from './vite-plugins/partnerPreview';

// https://vitejs.dev/config/
//
// Multi-page build: three independent HTML/JS entry points so the player,
// operator-gate, and protected-operator bundles never share application
// code or copy. In production, middleware.ts (Vercel Edge Middleware)
// decides which HTML file a request receives based on hostname. In Bolt
// preview / local dev — where that hostname-based middleware never runs —
// partnerPreviewPlugin() provides the equivalent behaviour via path-based
// routing at /partner-preview, entirely at the Vite dev-server layer. It
// only registers middleware inside `vite dev` / `vite preview`; it has no
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
      },
    },
  },
});
