import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// StrictMode double-invokes effects in dev — a free stress test for the controller's rAF cleanup and
// the component's drag-listener abort on unmount.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Missing #root element');
}
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
