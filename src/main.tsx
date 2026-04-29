import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import SystemMaintenance from './components/SystemMaintenance.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

const MAINTENANCE_MODE = false; // Set to false to disable maintenance mode

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {MAINTENANCE_MODE ? <SystemMaintenance /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
);
