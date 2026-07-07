import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import OperatorAccessApp from './OperatorAccessApp.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OperatorAccessApp />
  </StrictMode>
);
