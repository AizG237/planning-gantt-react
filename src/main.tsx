import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Planning } from './planning';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Planning />
  </StrictMode>
);
