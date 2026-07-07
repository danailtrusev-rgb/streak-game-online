import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import OperatorPreviewApp from './OperatorPreviewApp.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OperatorPreviewApp />
  </StrictMode>
);
