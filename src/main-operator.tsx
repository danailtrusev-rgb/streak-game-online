import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import OperatorApp from './OperatorApp.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OperatorApp />
  </StrictMode>
);
